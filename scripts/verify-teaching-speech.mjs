// Real local/private model checks; no instance lifecycle operations or DB writes.
import '../backend/config/env.js';
import { createFishSpeechService } from '../backend/services/fishSpeechService.js';
import { openTutorStream } from '../backend/services/aiTutorClient.js';
import { withCharacterBrowser } from './lib/character-browser.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const folder=resolve('.agents/check-output/teaching-speech');mkdirSync(folder,{recursive:true});
const fixtureIndex=process.argv.indexOf('--audio');
const existingAudio=fixtureIndex>=0?process.argv[fixtureIndex+1]:null;
if(fixtureIndex>=0&&!existingAudio)throw new Error('--audio requires an existing audio file');
const question='ما ناتج ٢ + ٣؟ أجب بجملة قصيرة.';let first='';
for(const [index,input] of [question,'وما ناتج إضافة واحد إلى الجواب السابق؟ أجب بجملة قصيرة.'].entries()){
  if(existingAudio)break;
  const events=await openTutorStream({question:input,history:index?[{role:'user',content:question},{role:'assistant',content:first}]:[],signal:AbortSignal.timeout(60000)});
  let answer='';for await(const event of events)if(event.type==='done')answer=event.answer;
  assert.ok(answer&&/[\u0600-\u06ff]/.test(answer));if(!index)first=answer;
}
const sentence='مرحباً يا أبطال، أنا معلمكم في نبراس، واليوم سنتعلم الرياضيات بطريقة ممتعة.';
const speech=existingAudio?{audio:readFileSync(resolve(existingAudio)),contentType:'audio/wav',sync:{mode:'audio-amplitude'}}:await createFishSpeechService()({text:sentence,signal:AbortSignal.timeout(120000)});
assert.equal(speech.contentType,'audio/wav');assert.ok(speech.audio.length>1000);
const audioFile=resolve(folder,'requested-arabic.wav');writeFileSync(audioFile,speech.audio);
await withCharacterBrowser('teaching-speech',async({evaluate,until,command,capture,output})=>{
  const results=[];
  for(const avatar of ['male','female']){
    if((await evaluate('window.__niprasCharacter.getSnapshot().avatarId'))!==avatar){
      await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Test avatar"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(avatar)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await until(`window.__niprasCharacter.getSnapshot().ready&&window.__niprasCharacter.getSnapshot().avatarId===${JSON.stringify(avatar)}`);
    }
    await command('DOM.enable');const{root}=await command('DOM.getDocument');const{nodeId}=await command('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type=file]'});
    await command('DOM.setFileInputFiles',{nodeId,files:[audioFile]});await until('document.querySelector("audio").readyState>=2');
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Greeting salute').click();document.querySelector('audio').play()`);
    const playback=await evaluate(`new Promise(resolve=>{let peak=0;const end=performance.now()+1800;function sample(){const s=window.__niprasCharacter.getSnapshot();peak=Math.max(peak,s.morphs.jawOpen||0);if(performance.now()>end)resolve({peak,mode:s.speech.mode,outline:s.outline.enabled,playing:window.__niprasCharacter.getSpeech().playing});else requestAnimationFrame(sample)}sample();})`);
    assert.ok(playback.peak>.05&&playback.playing&&playback.outline);assert.equal(playback.mode,'audio-amplitude');await capture(`${avatar}-real-arabic.png`);
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Stop & reset').click()`);
    assert.equal(await evaluate('window.__niprasCharacter.getSnapshot().morphs.jawOpen'),0);assert.equal(await evaluate('window.__niprasCharacter.getSnapshot().teaching.greetingWeight'),0);
    await evaluate('document.querySelector("audio").currentTime=0;document.querySelector("audio").play()');
    await until('window.__niprasCharacter.getSnapshot().morphs.jawOpen>.05');
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Stop & reset').click()`);
    results.push({avatar,...playback,interruption:'closed mouth and cancelled greeting',replay:true});
  }
  const result={passed:true,realQwenQuestions:existingAudio?0:2,sentence:existingAudio?null:sentence,audioSource:existingAudio?'existing local WAV':'new Fish synthesis',ttsSync:speech.sync,audioBytes:speech.audio.length,results,limitation:'No provider phoneme timings; measured audio energy fallback, not verified phoneme-level lip-sync.'};
  writeFileSync(resolve(output,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
});
