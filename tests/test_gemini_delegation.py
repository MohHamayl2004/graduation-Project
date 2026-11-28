"""Offline integration tests: disposable Git repositories and a deterministic CLI double."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

RUNNER = Path(__file__).resolve().parents[1] / 'scripts' / 'delegate_gemini.py'


class DelegationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'repo'
        self.root.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.email', 'fixture@example.invalid')
        self.git('config', 'user.name', 'Fixture')
        (self.root / '.gitignore').write_text('.worktrees/\n.agents/runs/\n')
        (self.root / 'sample.txt').write_text('committed\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'fixture')
        self.fake = Path(self.temp.name) / 'fake.py'
        self.fake.write_text('''import json, pathlib, sys, time
args=sys.argv[1:]
if args == ['models']:
 print('gemini-4-argon-medium\\tArgon Medium\\ngemini-3.8-flash-high\\tGemini Flash High'); sys.exit(0)
prompt=args[args.index('-p')+1]
assert '--dangerously-skip-permissions' not in args
assert args[args.index('--model')+1] in ['gemini-4-argon-medium','gemini-3.8-flash-high']
if 'MAX_EFFORT_TEST' in prompt: assert args[args.index('--effort')+1]=='max'
assert 'graphify query' in prompt
if 'SLEEP_TEST' in prompt: time.sleep(30)
if 'CLI_ERROR_TEST' in prompt:
 print(json.dumps({'status':'ERROR','error':'authentication required'})); sys.exit(0)
if 'PERMISSION_TEST' in prompt: print('permission denied',file=sys.stderr)
if 'EDIT_TEST' in prompt:
 assert pathlib.Path('sample.txt').read_text()=='current dirty context\\n'
 pathlib.Path('sample.txt').write_text('review this change\\n')
if 'OUTSIDE_TEST' in prompt:
 pathlib.Path('unrelated.txt').write_text('unwanted\\n')
if 'IGNORED_TEST' in prompt:
 pathlib.Path('.agents/runs').mkdir(parents=True)
 pathlib.Path('.agents/runs/hidden.txt').write_text('hidden change\\n')
print(json.dumps({'status':'SUCCESS','response':'fixture answer','usage':{'total_tokens':7}}))
''')

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args], text=True).strip()

    def run_task(self, text='READ_TEST', **overrides):
        spec = importlib.util.spec_from_file_location('delegation', RUNNER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        task = {'id': 'fixture', 'task': text, 'readOnly': True,
                'files': [], 'contextFiles': ['sample.txt'],
                'acceptance': ['Return fixture answer'], 'checks': [], 'timeoutSeconds': 30}
        task.update(overrides)
        return module.delegate(task, self.root, [sys.executable, str(self.fake)])

    def test_read_only_returns_usage_and_requires_codex_review(self):
        result = self.run_task()
        self.assertEqual(result['status'], 'needs_review')
        self.assertEqual(result['usage']['total_tokens'], 7)
        self.assertEqual(result['changedFiles'], [])
        self.assertFalse(result['accepted'])

    def test_dirty_context_is_overlaid_and_patch_does_not_touch_original(self):
        (self.root / 'sample.txt').write_text('current dirty context\n')
        result = self.run_task('EDIT_TEST', readOnly=False, files=['sample.txt'])
        self.assertEqual(result['status'], 'needs_review')
        self.assertEqual(result['changedFiles'], ['sample.txt'])
        self.assertEqual((self.root / 'sample.txt').read_text(), 'current dirty context\n')
        patch = Path(result['runDirectory']) / 'changes.patch'
        self.assertIn('+review this change', patch.read_text())
        self.assertNotIn('+current dirty context', patch.read_text())
        self.git('apply', '--check', str(patch))

    def test_exit_zero_with_error_is_failure(self):
        result = self.run_task('CLI_ERROR_TEST')
        self.assertEqual(result['status'], 'auth_error')

    def test_unrelated_changes_block_review(self):
        self.assertEqual(self.run_task('OUTSIDE_TEST')['status'], 'scope_violation')

    def test_soft_permission_denial_is_failure(self):
        self.assertEqual(self.run_task('PERMISSION_TEST')['status'], 'permission_error')

    def test_ignored_changes_cannot_escape_scope_check(self):
        result = self.run_task('IGNORED_TEST')
        self.assertEqual(result['status'], 'scope_violation')
        self.assertIn('.agents/runs/hidden.txt', result['changedFiles'])

    def test_timeout_is_failure(self):
        self.assertEqual(self.run_task('SLEEP_TEST', timeoutSeconds=1)['status'], 'timeout')

    def test_failed_automated_check_blocks_review(self):
        result = self.run_task(checks=[[sys.executable, '-c', 'raise SystemExit(2)']])
        self.assertEqual(result['status'], 'checks_failed')

    def test_checks_cannot_change_code_after_patch_was_captured(self):
        (self.root / 'sample.txt').write_text('current dirty context\n')
        result = self.run_task('EDIT_TEST', readOnly=False, files=['sample.txt'], checks=[
            [sys.executable, '-c', "from pathlib import Path; Path('sample.txt').write_text('changed by check\\n')"]])
        self.assertEqual(result['status'], 'checks_modified_files')
        patch = (Path(result['runDirectory']) / 'changes.patch').read_text()
        self.assertIn('+changed by check', patch)

    def test_checks_can_write_generated_output_in_reserved_directory(self):
        result = self.run_task(checks=[[sys.executable, '-c',
            "from pathlib import Path; p=Path('.agents/check-output/build'); p.mkdir(parents=True); (p/'index.html').write_text('build output')"]])
        self.assertEqual(result['status'], 'needs_review')
        self.assertEqual(result['changedFiles'], [])

    def test_path_escape_and_secret_context_rejected(self):
        for filename in ['../outside', '.env', 'backend/.env.local', 'keys/private.pem', '.git/config']:
            with self.subTest(filename=filename), self.assertRaises(ValueError):
                self.run_task(contextFiles=[filename])

    def test_high_model_needs_explicit_reason(self):
        with self.assertRaises(ValueError):
            self.run_task(model='gemini-4-argon-high')

    def test_explicitly_authorized_flash_supports_max_effort(self):
        result = self.run_task('MAX_EFFORT_TEST', model='gemini-3.8-flash-high',
            effort='max', modelAuthorization='User explicitly selected this available model',
            complexityReason='Arabic and English intent disambiguation')
        self.assertEqual(result['status'], 'needs_review')

    def test_alternate_model_and_invalid_effort_require_valid_configuration(self):
        with self.assertRaises(ValueError):
            self.run_task(model='gemini-3.8-flash-high', complexityReason='review')
        with self.assertRaises(ValueError):
            self.run_task(effort='unbounded')


if __name__ == '__main__':
    unittest.main()
