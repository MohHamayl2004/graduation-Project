import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

export async function withCharacterBrowser(name, action) {
  const output = resolve('.agents/check-output', name); mkdirSync(output, { recursive: true });
  const server = await createServer({ configFile: false, plugins: [react()], server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/.tmp*/**', '**/.worktrees/**', '**/.agents/**', '**/graphify-out/**', '**/.codex/**'] } }, logLevel: 'error' });
  await server.listen();
  const browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--mute-audio', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--disable-background-networking', '--window-size=1440,1100', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${resolve(output, 'profile')}`], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let socket; let nextId = 0; const pending = new Map(), shaderErrors = [];
  try {
    const endpoint = await new Promise((done, fail) => { let log = ''; const timer = setTimeout(() => fail(Error('Chrome startup timeout')), 20000); browser.once('error', fail); browser.stderr.on('data', bytes => { log += bytes; const match = log.match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); done(match[1]); } }); });
    socket = new WebSocket(endpoint); await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
    socket.onmessage = event => {
      const response = JSON.parse(event.data), task = pending.get(response.id);
      if (task) { pending.delete(response.id); response.error ? task.reject(Error(response.error.message)) : task.resolve(response.result); }
      if (response.method === 'Log.entryAdded' || response.method === 'Runtime.consoleAPICalled') {
        const text = response.params.entry?.text || response.params.args?.map(arg => arg.value || arg.description || '').join(' ') || '';
        if (/Shader Error|WebGLProgram:|VALIDATE_STATUS|ERROR: 0:/.test(text)) shaderErrors.push(text);
      }
    };
    const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
    const { targetId } = await command('Target.createTarget', { url: `http://127.0.0.1:${server.httpServer.address().port}/character-playground.html` });
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
    await command('Log.enable', {}, sessionId); await command('Runtime.enable', {}, sessionId);
    const evaluate = async expression => { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const until = async (expression, label) => { const end = Date.now() + 30000; while (Date.now() < end) { if (await evaluate(expression)) return; await delay(150); } throw Error(`Timed out: ${label || expression}`); };
    const capture = async file => { const image = await command('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(resolve(output, file), Buffer.from(image.data, 'base64')); };
    await until('window.__niprasCharacter?.getSnapshot()?.ready', 'real avatar');
    const result = await action({ evaluate, delay, until, capture, command: (method, params) => command(method, params, sessionId), output });
    if (shaderErrors.length) throw Error(`Character shader failed: ${shaderErrors[0]}`);
    return result;
  } finally { socket?.close(); browser.kill(); await server.close(); }
}
