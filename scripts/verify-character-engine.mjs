// Self-contained browser QA, following the project's Chrome/CDP test convention.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const output = '.agents/check-output/character-browser'; mkdirSync(output, { recursive: true });
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!existsSync(chrome)) throw new Error('Set CHROME_PATH to an installed Chrome executable.');
const server = await createServer({ configFile: false, plugins: [react()], server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/.tmp*/**', '**/.worktrees/**', '**/.agents/**', '**/graphify-out/**', '**/.codex/**'] } }, logLevel: 'error' });
await server.listen(); const url = `http://127.0.0.1:${server.httpServer.address().port}/character-playground.html`;
const browser = spawn(chrome, ['--headless', '--mute-audio', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--disable-background-networking', '--window-size=1440,1100', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${resolve(output, 'profile')}`], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
const delay = ms => new Promise(r => setTimeout(r, ms)); const results = []; let socket, id = 0; const pending = new Map();
try {
  const endpoint = await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('Chrome startup timed out')), 15000);
    browser.on('error', fail); browser.stderr.on('data', data => { const match = String(data).match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); done(match[1]); } });
  });
  socket = new WebSocket(endpoint); await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
  socket.onmessage = event => { const value = JSON.parse(event.data); const request = pending.get(value.id); if (request) { pending.delete(value.id); value.error ? request.reject(new Error(value.error.message)) : request.resolve(value.result); } };
  const command = (method, params = {}, sessionId) => new Promise((done, fail) => { const next = ++id; pending.set(next, { resolve: done, reject: fail }); socket.send(JSON.stringify({ id: next, method, params, ...(sessionId ? { sessionId } : {}) })); });
  const { targetId } = await command('Target.createTarget', { url }); const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async expression => {
    const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const until = async (expression, label) => { const deadline = Date.now() + 30000; while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(150); } throw new Error(`Timed out: ${label}`); };
  const capture = async name => { const shot = await command('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(`${output}/${name}.png`, Buffer.from(shot.data, 'base64')); };
  const snapshot = () => evaluate('window.__niprasCharacter.getSnapshot()');
  const change = (label, value, type = 'select') => evaluate(`(() => {const el=document.querySelector(${JSON.stringify(`${type}[aria-label="${label}"]`)}); if(!el)throw Error('Missing control'); const setter=Object.getOwnPropertyDescriptor(${type === 'select' ? 'HTMLSelectElement' : 'HTMLInputElement'}.prototype,'value').set; setter.call(el,${JSON.stringify(String(value))}); el.dispatchEvent(new Event(${JSON.stringify(type === 'select' ? 'change' : 'input')},{bubbles:true})); })()`);
  await until('window.__niprasCharacter?.getSnapshot()?.ready', 'male GLB load'); await delay(700);
  let current = await snapshot(); assert.equal(current.avatarId, 'male'); assert.ok(current.capabilities.leftArm && current.capabilities.visemes);
  assert.ok(current.renderer.triangles > 0); results.push({ test: 'male_real_glb', renderer: current.renderer, capabilities: current.capabilities }); await capture('male-idle');
  // Morph blink is observed on the real loaded geometry, not a synthetic rig.
  const blink = await evaluate(`new Promise(resolve => {let peak=0;const end=performance.now()+6000;function sample(){peak=Math.max(peak,window.__niprasCharacter.getSnapshot().morphs.blinkLeft||0);if(peak>.15||performance.now()>end)resolve(peak);else requestAnimationFrame(sample)}sample()})`);
  assert.ok(blink > .15, `Expected blink, got ${blink}`); results.push({ test: 'actual_blink', peak: blink });
  await evaluate(`document.querySelector('input[type=checkbox][aria-label="Enable left hand target"]').click()`);
  await change('Left hand X', .42, 'input'); await change('Left hand Y', 1.15, 'input'); await change('Left hand Z', .3, 'input'); await delay(900);
  current = await snapshot(); const hand = current.bones.LeftHand.worldPosition;
  const distance = Math.hypot(hand[0] - .42, hand[1] - 1.15, hand[2] - .3); assert.ok(distance < .05, `Left hand target error: ${distance}`);
  results.push({ test: 'actual_left_hand_IK', hand, error: distance });
  await evaluate(`document.querySelector('input[type=checkbox][aria-label="Enable right hand target"]').click()`);
  await change('Right hand X', -.42, 'input'); await change('Right hand Y', 1.15, 'input'); await change('Right hand Z', .3, 'input'); await delay(900);
  current = await snapshot(); assert.ok(Math.hypot(...current.bones.RightHand.worldPosition.map((v,i)=>v-[-.42,1.15,.3][i])) < .05); await capture('independent-hands');
  await change('Head yaw', 25, 'input'); await change('Expression', 'happy'); await delay(500);
  current = await snapshot(); assert.ok(current.morphs.smileLeft > .4); results.push({ test: 'head_expression', head: current.bones.Head.quaternion, smile: current.morphs.smileLeft }); await capture('happy-head-turn');
  const spineBefore = current.bones.Spine.quaternion;
  await change('Body lean', 5, 'input'); await change('Body twist', -8, 'input'); await delay(400);
  current = await snapshot(); assert.ok(current.bones.Spine.quaternion.some((v,i)=>Math.abs(v-spineBefore[i])>.01)); results.push({test:'actual_body_posture',spine:current.bones.Spine.quaternion});
  // Disable targets, exercise gestures, then swap the actual descriptor.
  await evaluate(`document.querySelector('input[aria-label="Enable left hand target"]').click();document.querySelector('input[aria-label="Enable right hand target"]').click(); [...document.querySelectorAll('button')].find(x=>x.textContent==='Explain').click()`); await delay(600); await capture('teaching-gesture');
  await evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent==='Retarget nod & switch avatar').click()`);
  await until('window.__niprasCharacter?.getSnapshot()?.avatarId==="female" && window.__niprasCharacter.getSnapshot().ready', 'female GLB load');
  await until('window.__niprasCharacter.getSnapshot().clip==="retargeted-head-nod"', 'retargeted rotation clip');
  results.push({ test: 'real_avatar_retargeted_clip', clip: (await snapshot()).clip }); await delay(600);
  current = await snapshot(); assert.ok(current.capabilities.leftArm && current.capabilities.blink); results.push({ test: 'female_real_glb', renderer: current.renderer }); await capture('female');
  const geometries = results[0].renderer.geometries, textures = results[0].renderer.textures;
  for (const avatar of ['male','female','male']) { await change('Test avatar', avatar); await until(`window.__niprasCharacter.getSnapshot().avatarId===${JSON.stringify(avatar)} && window.__niprasCharacter.getSnapshot().ready`, 'repeat swap'); await delay(150); }
  current = await snapshot(); assert.equal(current.avatarId, 'male'); assert.ok(current.renderer.geometries <= geometries && current.renderer.textures <= textures, `Same-avatar resource growth: ${JSON.stringify(current.renderer)}`); results.push({ test: 'swap_resource_ownership', renderer: current.renderer });
  await evaluate(`window.__niprasCharacter.setCharacter({id:'invalid',url:location.origin+'/missing-character.glb',adapter:'standard'})`);
  const preserved = await snapshot(); assert.ok(preserved.ready && preserved.error); assert.equal(preserved.avatarId, 'male');
  await delay(250); const continuing = await snapshot();
  assert.ok(continuing.bones.Head.quaternion.some((value,index)=>Math.abs(value-preserved.bones.Head.quaternion[index])>1e-7), 'Preserved avatar must keep animating after failed swap');
  results.push({ test: 'failed_swap_preserves_live_avatar', avatar: continuing.avatarId });
  await evaluate(`(async()=>{await window.__niprasCharacter.setCharacter('male');return true})()`); await until('window.__niprasCharacter.getSnapshot().ready && !window.__niprasCharacter.getSnapshot().error', 'swap recovery');
  await evaluate('document.querySelector(".character-point-card").click()'); await delay(2600);
  assert.equal(await evaluate('window.__niprasCharacter.getControllers().ik.targets.right.weight'), 0); results.push({ test: 'temporary_pointing_released' });
  // Generated diagnostic tone is actual media playback, NOT a voice or lip-sync proof.
  await evaluate(`(() => {const rate=16000,count=rate*3,buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);const str=(offset,s)=>[...s].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));str(0,'RIFF');view.setUint32(4,36+count*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,count*2,true);for(let i=0;i<count;i++)view.setInt16(44+i*2,Math.sin(2*Math.PI*220*i/rate)*12000,true);const dt=new DataTransfer();dt.items.add(new File([buffer],'diagnostic-tone.wav',{type:'audio/wav'}));const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`); await delay(250);
  await evaluate('document.querySelector("audio").play()'); await delay(500);
  current = await snapshot(); const speech = await evaluate('window.__niprasCharacter.getSpeech()');
  assert.ok(speech.playing && speech.currentTime > 0); assert.ok(current.morphs.jawOpen > .05, `Expected audio-driven jaw, got ${current.morphs.jawOpen}`); results.push({ test: 'actual_media_energy', currentTime: speech.currentTime, jaw: current.morphs.jawOpen }); await capture('actual-audio-playing');
  await evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent==='Stop & reset').click()`); await delay(100);
  current = await snapshot(); assert.equal(current.morphs.jawOpen, 0); assert.equal((await evaluate('window.__niprasCharacter.getSpeech()')).playing, false); results.push({ test: 'audio_interruption', jaw: current.morphs.jawOpen });
  await evaluate('document.querySelector("audio").play()'); await delay(350); current = await snapshot(); assert.ok(current.morphs.jawOpen > .05); results.push({test:'audio_replay_after_interrupt',jaw:current.morphs.jawOpen});
  await evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent==='Stop & reset').click()`);
  for (const [width,height] of [[1440,1100],[390,844]]) {
    await command('Emulation.setDeviceMetricsOverride', { width,height,deviceScaleFactor:1,mobile:width<700 }, sessionId); await delay(400);
    const layout = await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,stage:document.querySelector(".character-stage").getBoundingClientRect().width})');
    assert.ok(layout.scrollWidth <= width + 1, `Horizontal overflow: ${JSON.stringify(layout)}`); assert.ok(layout.stage > 200); results.push({ test: `layout_${width}`, ...layout }); await capture(`layout-${width}`);
  }
  writeFileSync(`${output}/results.json`, JSON.stringify({ passed:true, results, limitations:['Diagnostic tone verifies audio-event/energy synchronization only; not human speech, phoneme lip-sync, Fish generation or Arabic pronunciation.'] },null,2));
  console.log(JSON.stringify({ passed:true, results },null,2));
} catch (error) {
  writeFileSync(`${output}/results.json`,JSON.stringify({ passed:false,results,error:error.message },null,2)); throw error;
} finally {
  socket?.close(); browser.kill(); await server.close();
}
