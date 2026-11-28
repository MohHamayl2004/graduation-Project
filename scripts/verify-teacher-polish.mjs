import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { withCharacterBrowser } from './lib/character-browser.mjs';

const baseline = process.argv.includes('--baseline');
await withCharacterBrowser(baseline ? 'teacher-before' : 'teacher-after', async ({ evaluate, delay, until, capture, command, output }) => {
  const results = [];
  const change = (label, value) => evaluate(`(()=>{const el=document.querySelector('select[aria-label=${JSON.stringify(label)}]');const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  for (const avatar of ['male', 'female']) {
    await change('Test avatar', avatar);
    await until(`window.__niprasCharacter.getSnapshot().ready && window.__niprasCharacter.getSnapshot().avatarId===${JSON.stringify(avatar)}`, 'avatar swap');
    const root = await evaluate('window.__niprasCharacter.getControllers().rig.root.position.toArray()');
    for (const state of ['idle', 'listening', 'speaking']) {
      await change('Animation state', state); await delay(state === 'speaking' ? 1100 : 550);
      const snap = await evaluate('window.__niprasCharacter.getSnapshot()');
      assert.ok(snap.ready && !snap.error); assert.ok(snap.renderer.triangles > 0);
      await capture(`${avatar}-${state}-front.png`);
      await evaluate('window.__niprasCharacter.getControllers().rig.root.rotation.y = Math.PI / 2'); await delay(500);
      await capture(`${avatar}-${state}-side.png`);
      await evaluate('window.__niprasCharacter.getControllers().rig.root.rotation.y = 0'); await delay(150);
      const position = await evaluate('window.__niprasCharacter.getControllers().rig.root.position.toArray()');
      assert.deepEqual(position, root, 'The standing teacher must not drift');
      assert.ok(snap.renderer.calls < 50, 'Outline has excessive draw calls');
      results.push({ avatar, state, renderer: snap.renderer, outline: snap.outline || null });
    }
  }
  // Runtime avatar switches must retain a stable amount of GPU-owned data.
  const first = await evaluate('window.__niprasCharacter.getSnapshot().renderer');
  for (const avatar of ['male','female','male','female']) {
    await change('Test avatar', avatar);
    await until(`window.__niprasCharacter.getSnapshot().ready && window.__niprasCharacter.getSnapshot().avatarId===${JSON.stringify(avatar)}`); await delay(150);
  }
  const last = await evaluate('window.__niprasCharacter.getSnapshot().renderer');
  assert.ok(last.geometries <= first.geometries + 1 && last.textures <= first.textures + 1, 'GPU resources grow on character swaps');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await delay(400); await capture('female-mobile.png');
  const result = { passed: true, baseline, results, resources: { before: first, after: last } };
  writeFileSync(resolve(output, 'results.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
});
