// Run against an isolated local fixture: node scripts/verify-lesson11-book.mjs
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!existsSync(chrome)) throw Error('Set CHROME_PATH to your installed Chrome or Chromium executable.');
const server = await createServer({ configFile: false, plugins: [react()], server: { host: '127.0.0.1', port: 5175, strictPort: true, hmr: false, watch: { ignored: ['**/.tmp*/**'] } }, logLevel: 'error' });
await server.listen();
const browser = spawn(chrome, ['--headless', '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=2000,1200', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${resolve('node_modules/.cache/lesson11-browser-profile')}`], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, id = 0;
const pending = new Map();
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Chrome debugging endpoint did not start.')), 15000);
    browser.on('error', reject);
    browser.stderr.on('data', data => { const match = String(data).match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => { const response = JSON.parse(event.data); const request = pending.get(response.id); if (request) { pending.delete(response.id); response.error ? request.reject(Error(response.error.message)) : request.resolve(response.result); } };
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const { targetId } = await command('Target.createTarget', { url: `http://127.0.0.1:5175/tests/lesson-book.browser.html${process.env.BOOK_TEST_WIDTH ? `?width=${process.env.BOOK_TEST_WIDTH}` : ''}` });
  const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
  let results = '', previous = '';
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    const value = await command('Runtime.evaluate', { expression: 'document.querySelector("#results")?.textContent', returnByValue: true }, sessionId);
    results = value.result.value || '';
    if (results !== previous) { console.log(results.slice(previous.length)); previous = results; }
    if (results.includes('FAIL:')) throw Error('Browser checks failed; see details above.');
    if (results.includes('ALL BROWSER CHECKS PASSED')) break;
    await delay(400);
  }
  if (!results.includes('ALL BROWSER CHECKS PASSED')) throw Error('Browser verification timed out.');
  // Real viewport captures complement the fixture's DOM geometry assertions.
  mkdirSync('tmp/lesson11-verification', { recursive: true });
  for (const [width, height] of [[1366,768], [1920,1080], [390,844]]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 680 }, sessionId);
    await command('Page.navigate', { url: 'http://127.0.0.1:5175/tests/fixtures/lesson11-book.html' }, sessionId);
    await delay(600);
    await command('Runtime.evaluate', { expression: `(() => { const nav=document.querySelector('.living-navigation select'); nav.value='3';nav.dispatchEvent(new Event('change',{bubbles:true})); })()` }, sessionId);
    await delay(900);
    const drag = await command('Runtime.evaluate', { expression: `(() => { const point=document.querySelector('[data-leaf-id="secant"]:not([data-animation-copy]) .discovery-point'); const r=point.querySelector('circle:nth-of-type(2)').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,value:point.getAttribute('aria-valuenow')}; })()`, returnByValue: true }, sessionId);
    const point = drag.result.value;
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 }, sessionId);
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x + 35, y: point.y, button: 'left', buttons: 1 }, sessionId);
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x + 35, y: point.y, button: 'left', clickCount: 1 }, sessionId);
    await delay(100);
    const moved = await command('Runtime.evaluate', { expression: `document.querySelector('[data-leaf-id="secant"]:not([data-animation-copy]) .discovery-point').getAttribute('aria-valuenow')`, returnByValue: true }, sessionId);
    if (moved.result.value === point.value) throw Error(`Graph point drag failed at ${width}×${height}.`);
    console.log(`PASS pointer drag ${width}×${height}`);
    const screenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(`tmp/lesson11-verification/book-${width}x${height}.png`, Buffer.from(screenshot.data, 'base64'));
    if (width === 1366) {
      await command('Runtime.evaluate', { expression: `(() => { const nav=document.querySelector('.living-navigation select'); nav.value='8';nav.dispatchEvent(new Event('change',{bubbles:true})); })()` }, sessionId);
      await delay(900);
      await command('Runtime.evaluate', { expression: `(() => { const leaf=document.querySelector('[data-leaf-id="text-8"]:not([data-animation-copy])'); const select=leaf.querySelector('.leaf-question-picker select');select.value='lesson-1-1-exercise-8-b';select.dispatchEvent(new Event('change',{bubbles:true})); })()` }, sessionId);
      await delay(100);
      await command('Runtime.evaluate', { expression: `document.querySelector('[data-leaf-id="text-8"]:not([data-animation-copy]) .leaf-question-solve').click()` }, sessionId);
      await delay(100);
      for (let step = 0; step < 2; step++) {
        await command('Runtime.evaluate', { expression: `[...document.querySelectorAll('.leaf-solution button')].find(button=>button.textContent==='الخطوة التالية').click()` }, sessionId);
        await delay(100);
      }
      const solution = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
      writeFileSync('tmp/lesson11-verification/solution-1366x768.png', Buffer.from(solution.data, 'base64'));
    }
  }
  await command('Browser.close');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  socket?.close();
  if (browser.exitCode === null) browser.kill();
  await server.close();
}
