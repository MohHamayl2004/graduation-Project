import { withCharacterBrowser } from './lib/character-browser.mjs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

await withCharacterBrowser('teaching-gestures',async({evaluate,until,delay,capture,command,output})=>{
  const results=[];
  const click=label=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(label)});if(!b)throw Error('Missing gesture control');b.click();})()`);
  const snap=()=>evaluate('window.__niprasCharacter.getSnapshot()');
  const sideView=async(name)=>{await evaluate('window.__niprasCharacter.getControllers().rig.root.rotation.y=Math.PI/2');await delay(160);await capture(name);await evaluate('window.__niprasCharacter.getControllers().rig.root.rotation.y=0');await delay(100);};
  for(const avatar of ['male','female']){
    await click('Return to idle');
    if((await snap()).avatarId!==avatar){await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Test avatar"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(avatar)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await until(`window.__niprasCharacter.getSnapshot().ready&&window.__niprasCharacter.getSnapshot().avatarId===${JSON.stringify(avatar)}`);}
    const root=await evaluate('window.__niprasCharacter.getControllers().rig.root.position.toArray()');
    await click('Greeting salute');await delay(300);await capture(`${avatar}-greeting-rise.png`);
    await until('window.__niprasCharacter.getSnapshot().teaching.greetingWeight>.999');await delay(160);const salute=await snap();
    assert.ok(salute.fingers.right);assert.ok(Math.hypot(...salute.bones.RightHand.worldPosition.map((v,i)=>v-salute.bones.Head.worldPosition[i]))<.28);
    await capture(`${avatar}-greeting-front.png`);await sideView(`${avatar}-greeting-side.png`);
    await until('window.__niprasCharacter.getSnapshot().teaching.greetingElapsed===null');await delay(350);await capture(`${avatar}-greeting-return.png`);
    assert.equal(await evaluate('window.__niprasCharacter.getControllers().animation.greet()'),false,'Welcome must not loop');
    await click('Left hand near pocket');await until('!window.__niprasCharacter.getSnapshot().teaching.switching&&window.__niprasCharacter.getSnapshot().teaching.pocketWeights.left>.99');await delay(200);
    await capture(`${avatar}-left-pocket-front.png`);await sideView(`${avatar}-left-pocket-side.png`);
    await click('Switch hands');await until('window.__niprasCharacter.getSnapshot().teaching.switching&&Object.values(window.__niprasCharacter.getSnapshot().teaching.pocketWeights).every(v=>v<.01)');await capture(`${avatar}-switch-neutral.png`);
    await until('!window.__niprasCharacter.getSnapshot().teaching.switching&&window.__niprasCharacter.getSnapshot().teaching.pocketWeights.right>.99');await delay(200);await capture(`${avatar}-right-pocket-front.png`);await sideView(`${avatar}-right-pocket-side.png`);
    await click('Open-palm explanation');await delay(900);await capture(`${avatar}-explain.png`);
    await click('Point to lesson');await delay(800);await capture(`${avatar}-point.png`);
    await click('Encourage student');await delay(800);await capture(`${avatar}-encourage.png`);
    await click('Return to idle');await delay(650);assert.deepEqual(await evaluate('window.__niprasCharacter.getControllers().rig.root.position.toArray()'),root);
    const final=await snap();assert.ok(final.outline.enabled&&!final.error);assert.equal(final.teaching.greetingWeight,0);
    results.push({avatar,saluteWrist:salute.bones.RightHand.worldPosition,saluteHead:salute.bones.Head.worldPosition,fingers:salute.fingers,outline:final.outline.enabled,rootStationary:true,pocketInsertionSupported:final.teaching.pocketInsertionSupported});
  }
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(400);await capture('mobile-gesture-controls.png');
  assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'));
  writeFileSync(resolve(output,'results.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results}));
});
