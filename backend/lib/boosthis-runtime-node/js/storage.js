// @ts-nocheck
/* eslint-disable */
// Built from src/storage.ts so plain node can run the kit. Do not edit.
import { createHash, randomBytes } from "node:crypto";
import { homedir, hostname, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  copyFileSync,
  existsSync,
  fstatSync,
  linkSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync
} from "node:fs";
let platformForTests = null;
function hostPlatform() {
  return platformForTests ?? process.platform;
}
function _setHostPlatformForTests(platform) {
  platformForTests = platform;
}
const STORE_FILE = "node-runtime-store.json";
const LOCK_FILE = "node-runtime-store.lock";
const DIR_PREFIX = "boosthis-";
const LOCK_WAIT_MS = 500;
const LOCK_STALE_MS = 3e3;
const LOCK_WAIT_ORDINARY_MS = LOCK_STALE_MS + 250;
let backend = null;
let resolvedBase = null;
let resolvedDir = null;
let backingUsable = false;
let writesRefused = false;
let stateLoss = null;
let lossAnnounced = false;
let appRootMemo = null;
let scopeMemo = null;
let restoredFromDisk = false;
let restoredKeys = /* @__PURE__ */ new Set();
let writeDegraded = false;
const CRASH_LOCK_FILE = "node-crash.lock";
const CRASH_GENERATION = "node-crash-generation";
const CRASH_LOCK_WAIT_MS = 500;
let crashGeneration;
let crashGuardDepth = 0;
let crashGuardWarned = false;
function crashGuardFailure() {
  if (crashGuardWarned) return;
  crashGuardWarned = true;
  console.warn("[boosthis] Crash state refused: the shared crash lock or erase generation could not be used. Crashes are dropped, not written or uploaded without coordination. A writable state directory is required.");
}
function withCrashGeneration(apply) {
  return crashTransaction(false, apply);
}
function crashTransaction(erase, apply) {
  if (crashGuardDepth > 0 && !erase) return apply();
  let fd = null;
  let lockPath = null;
  try {
    const dir = stateDir();
    if (!dir || !backingUsable || writesRefused) throw new Error("no durable crash state");
    if (crashGuardDepth === 0) {
      lockPath = join(dir, CRASH_LOCK_FILE);
      const got = acquireCrashLock(lockPath, CRASH_LOCK_WAIT_MS);
      if (got === "busy") return void 0;
      if (got === null) throw new Error("crash lock unavailable");
      fd = got;
    }
    const generationFile = join(dir, CRASH_GENERATION);
    let generation = "0";
    try {
      generation = readFileSync(generationFile, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (!/^(0|[0-9a-f]{32})$/.test(generation)) throw new Error("invalid generation");
    if (erase) {
      const next = createHash("sha256").update(`${process.pid}:${process.hrtime.bigint()}:${generation}`).digest("hex").slice(0, 32);
      const temp = `${generationFile}.${process.pid}.tmp`;
      try {
        writeFileSync(temp, next, { mode: 384 });
        replaceFile(temp, generationFile);
      } catch (error) {
        try {
          unlinkSync(temp);
        } catch {
        }
        throw error;
      }
    } else {
      crashGeneration ??= generation;
      if (crashGeneration !== generation) return void 0;
    }
    crashGuardDepth++;
    try {
      return apply();
    } finally {
      crashGuardDepth--;
    }
  } catch {
    crashGuardFailure();
    return void 0;
  } finally {
    if (lockPath !== null) releaseLock(fd, lockPath);
  }
}
function acquireCrashLock(lockPath, waitMs) {
  const deadline = Date.now() + waitMs;
  for (; ; ) {
    let code;
    try {
      return writeLockFile(lockPath);
    } catch (err) {
      code = err?.code;
    }
    if (code === "EEXIST") {
      if (judgeHeldCrashLock(lockPath) !== "held") continue;
    } else if (!transientCreateRefusal(code)) {
      return null;
    }
    if (Date.now() >= deadline) return "busy";
    sleepSync(1 + Math.floor(Math.random() * 3));
  }
}
function judgeHeldCrashLock(lockPath) {
  const look = lookAtLock(lockPath);
  if (look === null) return "vanished";
  if (!provablyAbandoned(look)) return "held";
  lockBreakPauseForTests?.("judged", look.ino);
  return breakAbandonedLock(lockPath, look.ino, provablyAbandoned);
}
function provablyAbandoned(look) {
  return look.holder === "gone" || look.holder === "unknown" && Date.now() - look.mtimeMs > LOCK_STALE_MS;
}
const BREAK_CLAIM = ".breaking-";
const CLAIM_DRAFT = ".claiming-";
let lockBreakPauseForTests = null;
function breakAbandonedLock(lockPath, judgedIno, abandoned) {
  const tag = randomBytes(8).toString("hex");
  const claim = `${lockPath}${BREAK_CLAIM}${tag}`;
  if (!placeClaim(`${lockPath}${CLAIM_DRAFT}${tag}`, claim)) return "held";
  try {
    if (anotherLiveClaim(lockPath, claim)) return "held";
    lockBreakPauseForTests?.("claimed", judgedIno);
    const now = lookAtLock(lockPath);
    if (now === null) return "vanished";
    if (now.ino !== judgedIno || !abandoned(now)) return "held";
    lockBreakPauseForTests?.("checked", judgedIno);
    unlinkSync(lockPath);
    lockBreakPauseForTests?.("broken", judgedIno);
    return "broken";
  } catch {
    return "held";
  } finally {
    try {
      unlinkSync(claim);
    } catch {
    }
  }
}
function placeClaim(draft, claim) {
  try {
    writeFileSync(draft, lockIdentity(), { flag: "wx", mode: 384 });
    renameSync(draft, claim);
    return true;
  } catch {
    try {
      unlinkSync(draft);
    } catch {
    }
    return false;
  }
}
function anotherLiveClaim(lockPath, ours) {
  const dir = dirname(lockPath);
  const prefix = basename(lockPath) + BREAK_CLAIM;
  const own = basename(ours);
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return true;
  }
  for (const name of names) {
    if (name === own || !name.startsWith(prefix)) continue;
    const look = lookAtLock(join(dir, name));
    if (look !== null && look.holder !== "gone") return true;
  }
  return false;
}
function transientCreateRefusal(code) {
  return hostPlatform() === "win32" && (code === "EPERM" || code === "EACCES" || code === "EBUSY");
}
function eraseCrashState() {
  const erased = crashTransaction(true, () => mutate((data) => {
    delete data["boosthis:crash-pending:v1"];
    delete data["boosthis:runs:v1"];
  }, { requireLock: true }));
  if (erased !== true) throw new Error("Boosthis could not erase shared crash state; retry forget when the state lock is available.");
}
function envValue(...names) {
  for (const name of names) {
    const v = process.env[name];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return void 0;
}
function appRoot() {
  if (appRootMemo !== null) return appRootMemo;
  const candidates = [
    envValue("BOOSTHIS_PROJECT_ROOT", "BOOSTEN_PROJECT_ROOT"),
    (() => {
      try {
        return process.cwd();
      } catch {
        return void 0;
      }
    })()
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (statSync(candidate).isDirectory()) {
        appRootMemo = candidate;
        return appRootMemo;
      }
    } catch {
    }
  }
  appRootMemo = tmpdir();
  return appRootMemo;
}
const nativeResolver = {
  resolve: (root) => resolve(root),
  realpath: (root) => realpathSync.native(root)
};
let resolverForTests = null;
function canonicalSpelling(root, platform = hostPlatform(), resolver = resolverForTests ?? nativeResolver) {
  let out = resolver.resolve(root);
  if (platform === "win32" || platform === "darwin") {
    try {
      const real = resolver.realpath(out);
      if (respelledOnly(out, real, platform)) out = real;
    } catch {
    }
  }
  if (platform === "win32" && /^[a-z]:/.test(out)) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}
function respelledOnly(typed, real, platform) {
  const split = platform === "win32" ? /[\\/]+/ : /\/+/;
  const a = typed.split(split).filter(Boolean);
  const b = real.split(split).filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every(
    (part, i) => part.toLowerCase() === b[i].toLowerCase() || platform === "win32" && part.includes("~")
  );
}
function hashKey(root) {
  return createHash("sha1").update(root).digest("hex").slice(0, 16);
}
function scopeKey() {
  if (scopeMemo !== null) return scopeMemo;
  let key;
  try {
    key = hashKey(canonicalSpelling(appRoot()));
  } catch {
    key = "0000000000000000";
  }
  scopeMemo = key;
  return key;
}
function* earlierSpellings() {
  const seen = /* @__PURE__ */ new Set();
  const once = function* (spelling) {
    if (seen.has(spelling)) return;
    seen.add(spelling);
    yield spelling;
  };
  const typed = appRoot();
  const platform = hostPlatform();
  yield* once(typed);
  if (platform === "win32" && /^[a-zA-Z]:/.test(typed)) {
    yield* once(typed.charAt(0).toLowerCase() + typed.slice(1));
    yield* once(typed.charAt(0).toUpperCase() + typed.slice(1));
  }
  if (platform !== "win32" && platform !== "darwin") return;
  const pieces = canonicalSpelling(typed).split(/([\\/]+)/);
  const cases = (texts) => {
    const forms = [texts, texts.map((t) => t.toLowerCase()), texts.map((t) => t.toUpperCase())];
    return forms.filter((f, i) => forms.findIndex((g) => g.join("/") === f.join("/")) === i);
  };
  let names = pieces.flatMap((piece, i) => i % 2 === 0 && piece !== "" ? [i] : []);
  const units = [];
  if (platform === "win32" && names.length > 0 && /^[a-zA-Z]:$/.test(pieces[names[0]])) {
    units.push({ at: [names[0]], forms: cases([pieces[names[0]]]) });
    names = names.slice(1);
  }
  const tied = names.slice(0, -6);
  if (tied.length > 0) units.push({ at: tied, forms: cases(tied.map((i) => pieces[i])) });
  for (const i of names.slice(-6)) units.push({ at: [i], forms: cases([pieces[i]]) });
  const pick = units.map(() => 0);
  for (; ; ) {
    const out = pieces.slice();
    units.forEach((unit, u2) => unit.at.forEach((at, j) => out[at] = unit.forms[pick[u2]][j]));
    yield* once(out.join(""));
    let u = units.length - 1;
    for (; u >= 0; u--) {
      if (++pick[u] < units[u].forms.length) break;
      pick[u] = 0;
    }
    if (u < 0) return;
  }
}
function earlierStoreKey() {
  if (resolvedBase === null) return null;
  const current = scopeKey();
  const platform = hostPlatform();
  const typed = appRoot();
  try {
    if (platform !== "win32" && platform !== "darwin" && hashKey(typed) === current) return null;
  } catch {
    return null;
  }
  const held = /* @__PURE__ */ new Set();
  try {
    for (const name of readdirSync(resolvedBase)) {
      const key = name.startsWith(DIR_PREFIX) ? name.slice(DIR_PREFIX.length) : "";
      if (!/^[0-9a-f]{16}$/.test(key) || key === current) continue;
      if (existsSync(join(resolvedBase, name, STORE_FILE))) held.add(key);
    }
  } catch {
    return null;
  }
  if (held.size === 0) return null;
  const settled = canonicalSpelling(typed);
  for (const spelling of earlierSpellings()) {
    const key = hashKey(spelling);
    if (held.has(key) && canonicalSpelling(spelling) === settled) return key;
  }
  return null;
}
function dirIsWritable(dir) {
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 448 });
    const probe = join(dir, `.probe-${process.pid}`);
    writeFileSync(probe, "1", { mode: 384 });
    try {
      unlinkSync(probe);
    } catch {
    }
    return true;
  } catch {
    return false;
  }
}
function adoptUnscopedStore() {
  if (resolvedBase === null || resolvedDir === null) return;
  const legacy = join(resolvedBase, STORE_FILE);
  const scoped = join(resolvedDir, STORE_FILE);
  try {
    if (!existsSync(legacy) || existsSync(scoped)) return;
    try {
      renameSync(legacy, scoped);
    } catch {
      if (existsSync(scoped) || !existsSync(legacy)) return;
      writeFileSync(scoped, readFileSync(legacy), { mode: 384 });
      try {
        unlinkSync(legacy);
      } catch {
      }
    }
    try {
      chmodSync(scoped, 384);
    } catch {
    }
  } catch {
  }
}
function adoptLegacyScopedStore() {
  if (resolvedBase === null || resolvedDir === null) return;
  const scoped = join(resolvedDir, STORE_FILE);
  try {
    if (existsSync(scoped)) return;
    const key = earlierStoreKey();
    if (key === null) return;
    const legacyDir = join(resolvedBase, DIR_PREFIX + key);
    if (!moveWithoutReplacing(join(legacyDir, STORE_FILE), scoped)) return;
    moveWithoutReplacing(join(legacyDir, CRASH_GENERATION), join(resolvedDir, CRASH_GENERATION));
    try {
      chmodSync(scoped, 384);
    } catch {
    }
  } catch {
  }
}
function moveWithoutReplacing(from, to) {
  try {
    linkSync(from, to);
  } catch (err) {
    const code = err?.code;
    if (code === "EEXIST" || code === "ENOENT") return false;
    try {
      copyFileSync(from, to, fsConstants.COPYFILE_EXCL);
    } catch {
      return false;
    }
  }
  try {
    unlinkSync(from);
  } catch {
  }
  return true;
}
const ABANDONED_TEMP_MS = 6e4;
function sweepAbandonedTemps(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  const now = Date.now();
  for (const name of names) {
    const claim = name.includes(`.lock${BREAK_CLAIM}`);
    const ours = claim || name.startsWith(`.${STORE_FILE}.tmp-`) || name.startsWith(`${CRASH_GENERATION}.`) && name.endsWith(".tmp") || name.includes(`.lock${CLAIM_DRAFT}`);
    if (!ours) continue;
    const file = join(dir, name);
    try {
      if (now - statSync(file).mtimeMs <= ABANDONED_TEMP_MS) continue;
      if (claim && lookAtLock(file)?.holder !== "gone") continue;
      unlinkSync(file);
    } catch {
    }
  }
}
function settleBacking() {
  adoptLegacyScopedStore();
  adoptUnscopedStore();
  if (resolvedDir !== null) sweepAbandonedTemps(resolvedDir);
}
function resolveBacking() {
  if (backend !== null) return;
  const scoped = DIR_PREFIX + scopeKey();
  const configured = envValue("BOOSTHIS_STATE_DIR", "BOOSTEN_STATE_DIR");
  if (configured) {
    resolvedBase = configured;
    resolvedDir = join(configured, scoped);
    backend = "configured";
    backingUsable = dirIsWritable(resolvedDir);
    if (backingUsable) settleBacking();
    return;
  }
  try {
    const home = join(homedir(), ".boosthis");
    if (dirIsWritable(join(home, scoped))) {
      resolvedBase = home;
      resolvedDir = join(home, scoped);
      backend = "home";
      backingUsable = true;
      settleBacking();
      return;
    }
  } catch {
  }
  try {
    const scratch = join(tmpdir(), ".boosthis");
    if (dirIsWritable(join(scratch, scoped))) {
      resolvedBase = scratch;
      resolvedDir = join(scratch, scoped);
      backend = "scratch";
      backingUsable = true;
      settleBacking();
      return;
    }
  } catch {
  }
  resolvedBase = null;
  resolvedDir = null;
  backend = "memory";
  backingUsable = false;
}
function storageBackend() {
  resolveBacking();
  return backend ?? "memory";
}
function storageDurable() {
  storageBackend();
  return backend !== "memory" && backingUsable && !writesRefused && !writeDegraded;
}
function storageStateLoss() {
  return stateLoss;
}
function stateDir() {
  resolveBacking();
  return resolvedDir;
}
function storeFile() {
  const dir = stateDir();
  return dir === null ? null : join(dir, STORE_FILE);
}
function noteLoss(loss) {
  stateLoss = loss;
  if (lossAnnounced) return;
  lossAnnounced = true;
  try {
    const line = loss.kind === "corrupt" ? `[boosthis] Saved state at ${loss.file} could not be read (not valid JSON) and has been set aside as ${loss.setAsideAs ?? "a copy beside it"}. This process starts with no stored credentials and will register again; measurements already uploaded are unaffected.` : `[boosthis] Saved state at ${loss.file} exists but could not be read${loss.code ? ` (${loss.code})` : ""}. Boosthis is keeping state in memory for this process and will NOT write over that file. Fix its ownership, or point BOOSTHIS_STATE_DIR at a directory this process owns.`;
    process.stderr.write(line + "\n");
  } catch {
  }
}
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const until = Date.now() + ms;
    while (Date.now() < until) {
    }
  }
}
function startTicks(pid) {
  if (hostPlatform() === "win32") return null;
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return stat.slice(stat.lastIndexOf(")") + 2).split(" ")[19] ?? null;
  } catch {
    return null;
  }
}
const LIVE_PREFIX = "node-live-";
const LIVE_SWEEP_MAX = 32;
const EXCLUSIVE_SHARE_FLAG = (() => {
  const named = fsConstants.UV_FS_O_EXLOCK;
  if (typeof named === "number" && named !== 0) return named;
  return process.platform === "win32" ? 268435456 : 0;
})();
let ownLiveFd = null;
const shareModeProbe = {
  create(dir) {
    if (process.platform !== "win32" || EXCLUSIVE_SHARE_FLAG === 0) return null;
    const mark = randomBytes(8).toString("hex");
    const file = join(dir, LIVE_PREFIX + mark);
    let fd;
    try {
      fd = openSync(
        file,
        fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_RDWR | EXCLUSIVE_SHARE_FLAG,
        384
      );
    } catch {
      return null;
    }
    let proven = false;
    try {
      closeSync(openSync(file, "r"));
    } catch (err) {
      proven = err?.code === "EBUSY";
    }
    if (!proven) {
      try {
        closeSync(fd);
      } catch {
      }
      try {
        unlinkSync(file);
      } catch {
      }
      return null;
    }
    ownLiveFd = fd;
    return mark;
  },
  check(dir, mark) {
    const file = join(dir, LIVE_PREFIX + mark);
    try {
      closeSync(openSync(file, "r"));
    } catch (err) {
      const code = err?.code;
      if (code === "EBUSY") return "alive";
      if (code === "ENOENT") return "gone";
      return "unknown";
    }
    try {
      unlinkSync(file);
    } catch {
    }
    return "gone";
  }
};
let livenessProbe = shareModeProbe;
let ownLiveMark;
function processLivenessMark() {
  if (ownLiveMark !== void 0) return ownLiveMark;
  ownLiveMark = null;
  if (hostPlatform() !== "win32") return null;
  const dir = stateDir();
  if (dir === null || !backingUsable) return null;
  try {
    ownLiveMark = livenessProbe.create(dir);
  } catch {
    ownLiveMark = null;
  }
  if (ownLiveMark !== null) sweepEndedMarks(dir);
  return ownLiveMark;
}
function processLiveness(mark) {
  if (!/^[0-9a-f]{16}$/.test(mark)) return "unknown";
  if (mark === ownLiveMark) return "alive";
  const dir = stateDir();
  if (dir === null) return "unknown";
  try {
    return livenessProbe.check(dir, mark);
  } catch {
    return "unknown";
  }
}
function sweepEndedMarks(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  let looked = 0;
  for (const name of names) {
    if (!name.startsWith(LIVE_PREFIX)) continue;
    const mark = name.slice(LIVE_PREFIX.length);
    if (mark === ownLiveMark || !/^[0-9a-f]{16}$/.test(mark)) continue;
    if (looked++ >= LIVE_SWEEP_MAX) break;
    try {
      livenessProbe.check(dir, mark);
    } catch {
    }
  }
}
function _setLivenessProbeForTests(probe) {
  livenessProbe = probe ?? shareModeProbe;
  ownLiveMark = void 0;
  if (ownLiveFd !== null) {
    try {
      closeSync(ownLiveFd);
    } catch {
    }
    ownLiveFd = null;
  }
}
let ownStart;
function lockIdentity() {
  const mark = processLivenessMark();
  if (mark !== null) return `${process.pid}@${hostname()}@w${mark}`;
  if (ownStart === void 0) ownStart = startTicks("self");
  return `${process.pid}@${hostname()}${ownStart === null ? "" : `@${ownStart}`}`;
}
function lookAtLock(file) {
  let fd = null;
  try {
    fd = openSync(file, "r");
  } catch (err) {
    if (err?.code === "ENOENT") return null;
  }
  try {
    const st = fd !== null ? fstatSync(fd, { bigint: true }) : statSync(file, { bigint: true });
    let text = "";
    if (fd !== null) {
      try {
        text = readFileSync(fd, "utf8");
      } catch {
      }
    }
    return { ino: st.ino, mtimeMs: Number(st.mtimeMs), holder: holderNamedBy(text) };
  } catch (err) {
    if (err?.code === "ENOENT") return null;
    return { ino: -1n, mtimeMs: Date.now(), holder: "unknown" };
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
      }
    }
  }
}
function holderNamedBy(text) {
  const m = /^(\d+)@([^@]+)(?:@(\d+|w[0-9a-f]{16}))?$/.exec(text.trim());
  if (m === null || m[2] !== hostname()) return "unknown";
  const pid = Number(m[1]);
  if (!Number.isSafeInteger(pid) || pid <= 0) return "unknown";
  try {
    process.kill(pid, 0);
  } catch (err) {
    if (err?.code !== "EPERM") return "gone";
  }
  const named = m[3];
  if (named === void 0) return "alive";
  if (named.startsWith("w")) {
    return processLiveness(named.slice(1)) === "gone" ? "gone" : "alive";
  }
  const now = startTicks(pid);
  return now === null || now === named ? "alive" : "gone";
}
function storeLockAbandoned(look) {
  return Date.now() - look.mtimeMs > LOCK_STALE_MS && look.holder !== "alive";
}
function acquireLock(lockPath, waitMs) {
  const deadline = Date.now() + waitMs;
  for (; ; ) {
    try {
      const fd = writeLockFile(lockPath);
      return fd;
    } catch (err) {
      const code = err?.code;
      if (code !== "EEXIST") {
        if (!transientCreateRefusal(code)) return null;
        if (Date.now() >= deadline) return "busy";
        sleepSync(2);
        continue;
      }
      const look = lookAtLock(lockPath);
      if (look === null) continue;
      if (storeLockAbandoned(look)) {
        if (breakAbandonedLock(lockPath, look.ino, storeLockAbandoned) !== "held") continue;
        if (Date.now() >= deadline) return "busy";
        sleepSync(1 + Math.floor(Math.random() * 3));
        continue;
      }
      if (Date.now() >= deadline) return "busy";
      sleepSync(2);
    }
  }
}
function writeLockFile(lockPath) {
  const fd = openSync(lockPath, "wx", 384);
  try {
    writeSync(fd, lockIdentity());
  } catch {
  }
  return fd;
}
function releaseLock(fd, lockPath) {
  if (fd === null) return;
  let ours = false;
  try {
    ours = fstatSync(fd, { bigint: true }).ino === statSync(lockPath, { bigint: true }).ino;
  } catch {
    ours = false;
  }
  try {
    closeSync(fd);
  } catch {
  }
  if (!ours) return;
  try {
    unlinkSync(lockPath);
  } catch {
  }
}
let mem = null;
let memStamp = null;
function stampOf(file) {
  try {
    const st = statSync(file);
    return `${st.ino}:${st.size}:${st.mtimeMs}`;
  } catch {
    return null;
  }
}
function readDisk(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (err) {
    const code = err?.code;
    if (code === "ENOENT") return { ok: false, reason: "missing" };
    return { ok: false, reason: "unreadable", code };
  }
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return { ok: false, reason: "corrupt", raw };
    }
    const data = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") data[k] = v;
    }
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "corrupt", raw };
  }
}
function setAside(file) {
  const target = `${file}.unreadable-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}`;
  try {
    renameSync(file, target);
    return target;
  } catch {
    return null;
  }
}
function handleFailedRead(file, read) {
  if (read.ok || read.reason === "missing") return {};
  if (read.reason === "corrupt") {
    const setAsideAs = setAside(file);
    noteLoss({
      kind: "corrupt",
      file,
      ...setAsideAs ? { setAsideAs } : {},
      at: Date.now()
    });
    return {};
  }
  writesRefused = true;
  noteLoss({
    kind: "unreadable",
    file,
    ...read.code ? { code: read.code } : {},
    at: Date.now()
  });
  return {};
}
function load() {
  const file = storeFile();
  if (file === null) {
    if (!mem) mem = {};
    return mem;
  }
  const stamp = stampOf(file);
  if (mem && stamp === memStamp) return mem;
  const read = readDisk(file);
  const data = read.ok ? read.data : handleFailedRead(file, read);
  mem = data;
  memStamp = read.ok ? stamp : stampOf(file);
  if (read.ok && Object.keys(data).length > 0) {
    restoredFromDisk = true;
    for (const key of Object.keys(data)) restoredKeys.add(key);
  }
  return data;
}
let tmpCounter = 0;
const REPLACE_RETRY_BUDGET_MS = 1e3;
const REPLACE_RETRY_DELAYS_MS = [5, 10, 20, 40, 80, 120];
function replaceFile(tmp, file) {
  const deadline = performance.now() + REPLACE_RETRY_BUDGET_MS;
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(tmp, file);
      return;
    } catch (err) {
      const code = err?.code;
      const brief = hostPlatform() === "win32" && (code === "EPERM" || code === "EACCES" || code === "EBUSY");
      const left = deadline - performance.now();
      if (!brief || left <= 0) throw err;
      const pause = REPLACE_RETRY_DELAYS_MS[Math.min(attempt, REPLACE_RETRY_DELAYS_MS.length - 1)];
      sleepSync(Math.max(1, Math.min(pause, Math.ceil(left))));
    }
  }
}
function writeAtomic(dir, file, data) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 448 });
  try {
    chmodSync(dir, 448);
  } catch {
  }
  const tmp = join(dir, `.${STORE_FILE}.tmp-${process.pid}-${tmpCounter++}`);
  try {
    writeFileSync(tmp, JSON.stringify(data), { mode: 384 });
    try {
      chmodSync(tmp, 384);
    } catch {
    }
    replaceFile(tmp, file);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
    }
    throw err;
  }
  try {
    chmodSync(file, 384);
  } catch {
  }
}
function mutate(apply, opts) {
  const dir = stateDir();
  const file = storeFile();
  if (dir === null || file === null || !backingUsable || writesRefused) {
    apply(load());
    return false;
  }
  const lockPath = join(dir, LOCK_FILE);
  let fd = null;
  try {
    const got = acquireLock(
      lockPath,
      opts?.requireLock === true ? LOCK_WAIT_MS : LOCK_WAIT_ORDINARY_MS
    );
    fd = got === "busy" ? null : got;
    if (got === null && opts?.requireLock === true) {
      opts.skipped = true;
      return false;
    }
    if (got === "busy" && opts?.requireLock !== true) {
      apply(load());
      return false;
    }
    if (got === "busy" && opts?.requireLock === true) {
      opts.skipped = true;
      return false;
    }
    let seen = stampOf(file);
    const read = readDisk(file);
    if (!read.ok && read.reason === "unreadable") {
      handleFailedRead(file, read);
      apply(load());
      return false;
    }
    let data = read.ok ? read.data : handleFailedRead(file, read);
    if (apply(data) === false) {
      mem = data;
      memStamp = stampOf(file);
      return true;
    }
    for (let tries = 0; tries < 3; tries++) {
      const current = stampOf(file);
      if (current === seen) break;
      const again = readDisk(file);
      if (!again.ok) {
        apply(load());
        return false;
      }
      seen = current;
      data = again.data;
      if (apply(data) === false) {
        mem = data;
        memStamp = stampOf(file);
        return true;
      }
    }
    writeAtomic(dir, file, data);
    mem = data;
    memStamp = stampOf(file);
    return true;
  } catch {
    writeDegraded = true;
    return false;
  } finally {
    releaseLock(fd, lockPath);
  }
}
const storage = {
  async get(key) {
    return load()[key] ?? null;
  },
  async set(key, value) {
    mutate((data) => {
      data[key] = value;
    });
  },
  async remove(key) {
    mutate((data) => {
      delete data[key];
    });
  },
  // Synchronous variants. The backing store is a single JSON file whose read
  // and write are already synchronous (readFileSync / renameSync), so these are
  // the SAME operations without the async wrapper. The crash reporter uses
  // setSync at capture time so a FATAL crash that kills the process before a
  // network flush completes still persists the pending buffer to disk — it
  // cannot await an async write mid-crash.
  getSync(key) {
    return load()[key] ?? null;
  },
  setSync(key, value) {
    mutate((data) => {
      data[key] = value;
    });
  },
  removeSync(key) {
    mutate((data) => {
      delete data[key];
    });
  },
  /**
   * Read-modify-write ONE key with the file locked for the whole span.
   *
   * `getSync` then `setSync` is two separate locks with a gap in the middle,
   * and anything a sibling worker wrote in that gap is lost. A caller whose
   * value is a collection — the crash buffer is the one that matters — must use
   * this instead, so its merge sees what the other workers actually left.
   *
   * `update` receives the value on disk (null when absent) and returns the new
   * value, or null to remove the key. It must not throw; if it does, the store
   * is left exactly as it was. Returns what was stored.
   */
  updateSync(key, update) {
    return storage.updateSyncPersisted(key, update).value;
  },
  /**
   * `updateSync`, and whether the new value actually reached DISK.
   *
   * Every write in this store is best-effort: a full disk, a directory that
   * turned read-only, or no writable directory at all leaves the value in
   * memory and returns quietly, because losing a cached token is not worth
   * crashing somebody's server over. For ONE caller that silence is the bug
   * rather than the kindness — the crash buffer, whose entire purpose is to
   * outlive the process. It cannot infer failure from an exception, because
   * there is none, so it asks here instead and says, in the kit's own words,
   * that the crash it caught will not survive.
   *
   * `persisted: false` means exactly "this value is in memory only". It is not
   * an error and nothing else need react to it.
   */
  updateSyncPersisted(key, update) {
    const { value, persisted } = updateKey(key, update);
    return { value, persisted };
  },
  /**
   * `updateSyncPersisted` for a caller that would rather MISS an update than
   * LOSE one.
   *
   * The ordinary write waits for a live holder until it releases or its lock
   * is old enough to break as abandoned, because a credential must land. A
   * record of COUNTS would rather not hold the host's thread that long:
   * skipping costs one pass that the caller re-applies next time. So when the
   * lock is still contended after a short wait, nothing is applied — not on
   * disk and not in memory — and `skipped` is true.
   *
   * A store with no durable backing has no siblings to race; there the update
   * applies to memory exactly as `updateSyncPersisted` would.
   */
  updateSyncExclusive(key, update) {
    return updateKey(key, update, { requireLock: true });
  }
};
function updateKey(key, update, opts) {
  if (crashGuardDepth === 0 && (key === "boosthis:crash-pending:v1" || key === "boosthis:runs:v1")) {
    return withCrashGeneration(() => updateKey(key, update, { requireLock: true })) ?? { value: null, persisted: false, skipped: true };
  }
  let result = null;
  const persisted = mutate((data) => {
    const previous = data[key] ?? null;
    const next = update(previous);
    result = next;
    if (next === previous) return false;
    if (next === null) delete data[key];
    else data[key] = next;
    return true;
  }, opts);
  return { value: result, persisted, skipped: opts?.skipped === true };
}
function _resetStorageForTests() {
  crashGeneration = void 0;
  crashGuardWarned = false;
  const dir = resolvedDir;
  const base = resolvedBase;
  mem = null;
  memStamp = null;
  try {
    const file = storeFile();
    if (file !== null) rmSync(file);
  } catch {
  }
  try {
    if (dir !== null) rmSync(join(dir, LOCK_FILE));
  } catch {
  }
  try {
    if (base !== null) rmSync(join(base, STORE_FILE));
  } catch {
  }
  backend = null;
  resolvedBase = null;
  resolvedDir = null;
  backingUsable = false;
  writesRefused = false;
  stateLoss = null;
  lossAnnounced = false;
  restoredFromDisk = false;
  restoredKeys = /* @__PURE__ */ new Set();
  writeDegraded = false;
  appRootMemo = null;
  scopeMemo = null;
  ownStart = void 0;
  lockBreakPauseForTests = null;
  _setLivenessProbeForTests(livenessProbe === shareModeProbe ? null : livenessProbe);
}
function _setLockBreakPauseForTests(pause) {
  lockBreakPauseForTests = pause;
}
function _setPathResolutionForTests(resolver) {
  resolverForTests = resolver;
}
const _storageInternals = {
  STORE_FILE,
  LOCK_FILE,
  CRASH_LOCK_FILE,
  DIR_PREFIX,
  LIVE_PREFIX,
  appRoot,
  scopeKey,
  canonicalSpelling,
  earlierSpellings: () => [...earlierSpellings()],
  dir: () => stateDir(),
  file: () => storeFile(),
  base: () => {
    resolveBacking();
    return resolvedBase;
  },
  /** Break the crash lock as a sibling would that judged it abandoned when
   *  it was the file `ino`. */
  breakCrashLock: (ino) => {
    const dir = stateDir();
    if (dir === null) throw new Error("no state folder");
    return breakAbandonedLock(join(dir, CRASH_LOCK_FILE), ino, provablyAbandoned);
  },
  /** Clear the state folder of what interrupted writes left, as a later
   *  start does. */
  sweep: () => {
    const dir = stateDir();
    if (dir === null) throw new Error("no state folder");
    sweepAbandonedTemps(dir);
  }
};
function storageKeyRestored(key) {
  load();
  return restoredKeys.has(key);
}
function storageRestored() {
  load();
  return restoredFromDisk;
}
export {
  _resetStorageForTests,
  _setHostPlatformForTests,
  _setLivenessProbeForTests,
  _setLockBreakPauseForTests,
  _setPathResolutionForTests,
  _storageInternals,
  eraseCrashState,
  hostPlatform,
  processLiveness,
  processLivenessMark,
  storage,
  storageBackend,
  storageDurable,
  storageKeyRestored,
  storageRestored,
  storageStateLoss,
  withCrashGeneration
};
