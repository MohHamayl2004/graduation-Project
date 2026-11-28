import test from 'node:test';
import assert from 'node:assert/strict';
import {FishSpeechClient} from '../src/character-engine/FishSpeechClient.js';

test('speech uses the browser global receiver when invoking native fetch',async()=>{
  const client=new FishSpeechClient({fetchImpl:async function(){
    assert.equal(this,globalThis,'WebIDL fetch rejects a custom client object as its receiver');
    return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/mpeg'}});
  }});
  const result=await client.synthesizeSpeech('أكيد، هيا نبدأ التعلم.');
  assert.equal(result.audio.size,3);
});
