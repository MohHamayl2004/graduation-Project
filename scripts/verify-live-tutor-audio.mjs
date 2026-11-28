// Verify actual synthesized audio against the real avatar in an isolated Chrome profile.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const audioFile = resolve(process.argv[2] || '.agents/check-output/live-tutor/arabic.wav');
const page = process.argv[3] || 'http://127.0.0.1:5173/character-playground.html';
const output = resolve('.agents/check-output/live-tutor'); mkdirSync(output, { recursive: true });
assert.ok(existsSync(audioFile), 'Generate the real Fish WAV before running this check.');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = spawn(chrome, ['--headless', '--mute-audio', '--enable-unsafe-swiftshader', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--disable-background-networking', '--window-size=1440,1100', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${resolve(output, 'chrome-profile')}`], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let socket; const pending = new Map(); let id = 0;
try {
  const endpoint = await new Promise((done, fail) => {
    let log = ''; const timer = setTimeout(() => fail(Error('Chrome startup timed out')), 20000);
    browser.stderr.on('data', chunk => { log += chunk; const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); done(match[1]); } });
    browser.once('error', fail);
  });
  socket = new WebSocket(endpoint); await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
  socket.onmessage = event => { const response = JSON.parse(event.data), task = pending.get(response.id); if (task) { pending.delete(response.id); response.error ? task.reject(Error(response.error.message)) : task.resolve(response.result); } };
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const { targetId } = await command('Target.createTarget', { url: page });
  const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async expression => { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const until = async expression => { const end = Date.now() + 30000; while (Date.now() < end) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 150)); } throw Error(`Timed out: ${expression}`); };
  await until('window.__niprasCharacter?.getSnapshot()?.ready');
  await command('DOM.enable', {}, sessionId);
  const { root } = await command('DOM.getDocument', {}, sessionId);
  const { nodeId } = await command('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' }, sessionId);
  await command('DOM.setFileInputFiles', { nodeId, files: [audioFile] }, sessionId);
  await until('document.querySelector("audio").readyState >= 2');
  await evaluate('document.querySelector("audio").play()');
  const observed = await evaluate(`new Promise(resolve => {
    let peak=0, speaking=false; const end=performance.now()+4000;
    function sample(){const s=window.__niprasCharacter.getSnapshot();peak=Math.max(peak,s.morphs.jawOpen||s.morphs.visemeAA||0);speaking ||= s.animationState==='speaking';if(performance.now()>=end||document.querySelector('audio').ended)resolve({peak,speaking,time:document.querySelector('audio').currentTime,duration:document.querySelector('audio').duration});else requestAnimationFrame(sample)}sample();
  })`);
  assert.ok(observed.peak > .03, `Mouth failed to respond to real audio: ${observed.peak}`);
  assert.ok(observed.speaking, 'Actual playback did not trigger speaking');
  const shot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(resolve(output, 'real-fish-character.png'), Buffer.from(shot.data, 'base64'));
  await evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent==='Stop & reset').click()`);
  const stopped = await evaluate(`({paused:document.querySelector('audio').paused,playing:window.__niprasCharacter.getSpeech().playing,mouth:window.__niprasCharacter.getSnapshot().morphs.jawOpen||window.__niprasCharacter.getSnapshot().morphs.visemeAA||0})`);
  assert.ok(stopped.paused && !stopped.playing); assert.equal(stopped.mouth, 0);
  const result = { passed: true, source: 'actual Fish S2 Pro WAV', observed, stopped, limitation: 'Amplitude-driven mouth movement; pronunciation-level lip-sync is unverified.' };
  writeFileSync(resolve(output, 'audio-browser-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { socket?.close(); browser.kill(); }
