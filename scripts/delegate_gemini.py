"""Delegate one scoped task to Argon; return evidence, never apply its changes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import time
import uuid

MODELS = {'gemini-4-argon-medium', 'gemini-4-argon-high'}
USER_AUTHORIZED_MODELS = {'gemini-3.8-flash-high', 'gemini-3.8-flash-medium', 'gemini-3.8-flash-low'}


def execute(argv, cwd, timeout=120):
    """No shell interpolation; kill the process tree when the deadline expires."""
    process = subprocess.Popen(argv, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               stdin=subprocess.DEVNULL, start_new_session=os.name != 'nt')
    timed_out = False
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        if os.name == 'nt':
            subprocess.run(['taskkill.exe', '/PID', str(process.pid), '/T', '/F'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        else:
            os.killpg(process.pid, signal.SIGKILL)
        if process.poll() is None:
            process.kill()
        stdout, stderr = process.communicate(timeout=15)
    return {'exitCode': process.returncode, 'stdout': stdout.decode('utf-8', 'replace'),
            'stderr': stderr.decode('utf-8', 'replace'), 'timedOut': timed_out}


def git(root, *args):
    result = execute(['git', '-c', 'core.quotepath=false', '-c', 'core.autocrlf=input',
                      '-C', str(root), *args], root)
    if result['exitCode'] != 0:
        raise RuntimeError(result['stderr'] or result['stdout'])
    return result['stdout'].strip()


def safe_path(root, name):
    path = Path(name)
    parts = path.parts
    sensitive = re.compile(r'((?:^|[/\\])\.env($|\.)|credentials|secrets|id_rsa|\.(pem|key|p12)$)', re.I)
    if (not parts or path.is_absolute() or '..' in parts or ':' in name
            or any(p.lower() in {'.git', '.worktrees', 'node_modules', '.ssh', '.aws'} for p in parts)
            or (sensitive.search(name) and path.name != '.env.example')):
        raise ValueError('Unsafe or secret-bearing task path: ' + name)
    target = root / path
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('Path leaves repository: ' + name)
    if any(part.is_symlink() for part in [target, *target.parents] if part != root.parent):
        raise ValueError('Symlink task paths are unsupported: ' + name)
    if target.exists() and not target.is_file():
        raise ValueError('Use exact files, not directories: ' + name)
    return path.as_posix()


def fingerprint(root, paths):
    return {name: hashlib.sha256((root / name).read_bytes()).hexdigest()
            if (root / name).is_file() else None for name in paths}


def find_agy():
    executable = shutil.which('agy.exe') or shutil.which('agy')
    if not executable and os.environ.get('LOCALAPPDATA'):
        candidate = Path(os.environ['LOCALAPPDATA']) / 'agy/bin/agy.exe'
        if candidate.is_file():
            executable = str(candidate)
    if not executable:
        raise RuntimeError('Antigravity CLI missing. Install the official agy CLI; no model was substituted.')
    return [executable]


def capture_changes(worktree, baseline, run_dir, allow_check_outputs=False):
    exclusions = ['--', '.', ':(exclude).agents/check-output'] if allow_check_outputs else []
    git(worktree, 'add', '-A', *exclusions)
    ignored = git(worktree, 'ls-files', '--others', '--ignored', '--exclude-standard', '-z')
    for name in filter(None, ignored.split('\0')):
        if allow_check_outputs and name.startswith('.agents/check-output/'):
            continue
        git(worktree, 'add', '-f', '--', name)
    names = git(worktree, 'diff', '--cached', '--name-only', '--no-renames', '-z', baseline)
    patch = execute(['git', '-C', str(worktree), 'diff', '--cached', '--binary',
                     '--no-ext-diff', '--no-color', '--no-renames', baseline], worktree)
    if patch['exitCode'] or patch['timedOut']:
        raise RuntimeError('Failed to capture worktree patch.')
    (run_dir / 'changes.patch').write_bytes(patch['stdout'].encode('utf-8'))
    return [p for p in names.split('\0') if p]


def classify(result, envelope):
    error = str(envelope.get('error', '')) + '\n' + result['stderr']
    if result['timedOut'] or envelope.get('finished_reason') == 'print_timeout':
        return 'timeout'
    if re.search(r'authenticat|unauthorized|sign.in|log.in|invalid.grant', error, re.I):
        return 'auth_error'
    if re.search(r'permission.*denied|soft.denied|approval.*required|requires.*approval|not allowed', error, re.I):
        return 'permission_error'
    if (result['exitCode'] != 0 or envelope.get('status') != 'SUCCESS' or envelope.get('error')
            or envelope.get('finished_reason') or not str(envelope.get('response', '')).strip()):
        return 'cli_error'
    return 'needs_review'


def delegate(task, repo, agy=None):
    repo = Path(repo).resolve()
    model = task.get('model', 'gemini-4-argon-medium')
    if model not in MODELS and not (model in USER_AUTHORIZED_MODELS and task.get('modelAuthorization', '').strip()):
        raise ValueError('Model requires explicit user authorization; no substitution.')
    effort = task.get('effort')
    if effort is not None and effort not in {'low', 'medium', 'high', 'xhigh', 'max'}:
        raise ValueError('Unsupported CLI reasoning effort.')
    if model.endswith('-high') and not task.get('complexityReason', '').strip():
        raise ValueError('Argon High requires complexityReason.')
    if not task.get('task', '').strip() or not task.get('acceptance'):
        raise ValueError('Task and acceptance criteria are required.')
    readonly = task.get('readOnly', True)
    if not isinstance(readonly, bool):
        raise ValueError('readOnly must be a boolean.')
    files = [safe_path(repo, p) for p in task.get('files', [])]
    contexts = [safe_path(repo, p) for p in task.get('contextFiles', [])]
    if not readonly and not files:
        raise ValueError('A write task needs explicit files.')
    checks = task.get('checks', [])
    if not isinstance(checks, list) or any(not isinstance(c, list) or not c or
            any(not isinstance(v, str) for v in c) for c in checks):
        raise ValueError('Checks must be argument arrays, never shell strings.')
    timeout = int(task.get('timeoutSeconds', 900))
    if not 1 <= timeout <= 1800:
        raise ValueError('timeoutSeconds must be between 1 and 1800.')
    cli = agy or find_agy()
    if git(repo, 'check-ignore', '.worktrees/probe') != '.worktrees/probe':
        raise ValueError('.worktrees/ must be ignored before delegation.')
    agent_dir = repo / '.agents'
    agent_dir.mkdir(exist_ok=True)
    lock = agent_dir / 'delegation.lock'
    # Exclusive creation serializes agents; Codex reserves the task files too.
    with lock.open('x', encoding='utf-8') as handle:
        handle.write(json.dumps({'pid': os.getpid(), 'task': task.get('id')}))
    worktree = None
    started = time.monotonic()
    report = {'taskId': task.get('id', 'task'), 'model': model, 'accepted': False,
              'status': 'setup_error', 'changedFiles': [], 'checks': [], 'usage': None}
    run_id = time.strftime('%Y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:8]
    run_dir = agent_dir / 'runs' / run_id
    run_dir.mkdir(parents=True)
    report['runDirectory'] = str(run_dir)
    try:
        catalog = execute([*cli, 'models'], repo, 90)
        if catalog['exitCode'] or catalog['timedOut']:
            report['status'] = classify(catalog, {'status': 'ERROR'})
            report['error'] = catalog['stderr'] or catalog['stdout']
            return report
        if not re.search(r'(?m)^' + re.escape(model) + r'(?:\s|$)', catalog['stdout']):
            report.update(status='model_unavailable', error='Requested model absent from agy models.')
            return report
        worktree = repo / '.worktrees' / ('gemini-' + run_id)
        worktree.parent.mkdir(exist_ok=True)
        git(repo, 'worktree', 'add', '--detach', str(worktree), 'HEAD')
        report['worktree'] = str(worktree)
        policy_files = [safe_path(repo, p) for p in ['AGENTS.md', '.gitignore'] if (repo / p).is_file()]
        overlay = sorted(set(files + contexts + policy_files))
        before = fingerprint(repo, overlay)
        for name in overlay:
            # A tracked HEAD symlink may differ from the current source file.
            # Validate the destination and every ancestor before mkdir/copy.
            safe_path(worktree, name)
            target, source = worktree / name, repo / name
            if source.is_file():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
            elif target.is_file():
                target.unlink()
        # Stage only inside the isolated worktree. A tree object captures dirty
        # context without committing it or staging anything in the user's checkout.
        git(worktree, 'add', '-A')
        existing_overlay = [p for p in overlay if (worktree / p).is_file()]
        if existing_overlay:
            git(worktree, 'add', '-f', '--', *existing_overlay)
        baseline = git(worktree, 'write-tree')
        report['baselineTree'] = baseline
        shared = repo / '.agents/project-context.md'
        context = shared.read_text(encoding='utf-8') if shared.is_file() else ''
        prompt = '\n'.join([
            'You are the Gemini worker. Codex is the lead and reviewer. Never delegate.',
            'Never commit, stage, merge, push, deploy, install dependencies, read credentials, or access sibling worktrees.',
            'Work only in the current isolated worktree. Do not modify Git metadata.',
            'If graphify-out/graph.json exists, run graphify query "<task question>" BEFORE searching or reading source.',
            'Use graphify path/explain for relationships; raw reads only for graph-located paths.',
            'If graphify is unavailable, report it and read only the exact task/context files below.',
            'After code changes run graphify update .; report failure instead of hiding it.',
            'Read-only task: ' + str(readonly) + '. If true, do not write any files.',
            'Only writable files: ' + json.dumps([] if readonly else files),
            'Relevant current context files: ' + json.dumps(contexts),
            'Other files are the committed HEAD; only listed files were overlaid from current work.',
            context, 'Task: ' + task['task'],
            'API contracts: ' + task.get('apiContract', 'Preserve existing contracts; no mock replacements.'),
            'Acceptance criteria: ' + json.dumps(task['acceptance']),
            'Codex-owned automated checks: ' + json.dumps(checks),
            'Return under 150 words: outcome, exact changed files, checks actually run, blockers.',
            'A denied tool is a blocker. Do not claim completion when required work was denied.'
        ])
        if len(prompt) > 16000:
            raise ValueError('Task prompt too large; narrow it to at most 16000 characters.')
        (run_dir / 'prompt.txt').write_text(prompt, encoding='utf-8')
        (run_dir / 'task.json').write_text(json.dumps(task, indent=2), encoding='utf-8')
        mode = 'plan' if readonly else 'auto'
        effort_args = ['--effort', effort] if effort else []
        outcome = execute([*cli, '-p', prompt, '--model', model, *effort_args, '--mode', mode,
                           '--sandbox', '--output-format', 'json', '--print-timeout', f'{timeout}s'],
                          worktree, timeout + 10)
        for stream in ['stdout', 'stderr']:
            (run_dir / (stream + '.txt')).write_text(outcome[stream], encoding='utf-8')
        try:
            envelope = json.loads(outcome['stdout'])
            if not isinstance(envelope, dict):
                raise ValueError('Expected JSON object')
        except (ValueError, TypeError):
            envelope = {'status': 'ERROR', 'error': 'Invalid JSON from agy.'}
        report.update(status=classify(outcome, envelope), exitCode=outcome['exitCode'],
                      response=envelope.get('response', ''), usage=envelope.get('usage'),
                      error=envelope.get('error'), conversationId=envelope.get('conversation_id'))
        # Comparing a saved tree also catches changes the worker staged or committed.
        changed = capture_changes(worktree, baseline, run_dir)
        report['changedFiles'] = changed
        if any(name not in files for name in changed) or (readonly and changed):
            report['status'] = 'scope_violation'
        elif fingerprint(repo, overlay) != before:
            report['status'] = 'source_changed'
        elif report['status'] == 'needs_review':
            if not readonly and not changed:
                report['status'] = 'no_changes'
            before_checks = git(worktree, 'write-tree')
            whitespace = execute(['git', '-C', str(worktree), 'diff', '--cached', '--check', baseline], worktree)
            report['checks'].append({'command': ['git', 'diff', '--check'], **whitespace})
            for command in checks:
                report['checks'].append({'command': command, **execute(command, worktree, timeout)})
            if any(c['exitCode'] or c['timedOut'] for c in report['checks']):
                report['status'] = 'checks_failed'
            # Check commands are processes too: regenerate evidence after they
            # exit, and reject a passing check that changed the reviewed code.
            changed = capture_changes(worktree, baseline, run_dir, allow_check_outputs=True)
            report['changedFiles'] = changed
            if any(p not in files for p in changed) or (readonly and changed):
                report['status'] = 'scope_violation'
            elif git(worktree, 'write-tree') != before_checks:
                report['status'] = 'checks_modified_files'
            elif fingerprint(repo, overlay) != before:
                report['status'] = 'source_changed'
        report['reviewRequired'] = ['Inspect actual patch and unrelated changes',
            'Verify requirements, API contracts, imports, dependencies, security and real data',
            'Inspect automated check output; run relevant build/tests and useful visual checks',
            'One focused correction cycle at most; major visual work requires user approval',
            'Do not merge into main, push or deploy without user approval']
        return report
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
        report.update(status='setup_error', error=str(error))
        return report
    finally:
        report['durationSeconds'] = round(time.monotonic() - started, 3)
        (run_dir / 'result.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        # Keep worktree + diff for review or one correction. Never auto-apply or remove.
        lock.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('task', type=Path, help='Task JSON with exact files and acceptance criteria')
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        task = json.loads(args.task.read_text(encoding='utf-8-sig'))
        result = delegate(task, args.repo)
        print(json.dumps(result, indent=2))
        return 0 if result['status'] == 'needs_review' else 1
    except (OSError, ValueError, RuntimeError) as error:
        print(json.dumps({'status': 'setup_error', 'accepted': False, 'error': str(error)}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
