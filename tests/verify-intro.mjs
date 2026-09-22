// Verifies the real homepage library video in Chrome.
import assert from 'node:assert/strict';
const tabs=await fetch('http://127.0.0.1:9223/json').then(r=>r.json());
const socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0; const pending=new Map();
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}});
const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const until=async expression=>{for(let i=0;i<60;i++){if(await evaluate(expression))return;await pause(100);}throw Error('Timed out: '+expression);};
const appUrl=process.env.NIPRAS_TEST_URL||'http://127.0.0.1:5173';
try{
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:appUrl+'/'});await until('!!document.querySelector("main")');
 assert.equal(await evaluate('!!document.querySelector("#nipras-intro h2, #nipras-intro .intro-fallback")'),false,'showcase contains no old heading or building illustration');
 await evaluate('scrollTo({top:0,behavior:"instant"})');await pause(200);
 await send('Page.reload',{ignoreCache:true});await pause(1000);
 assert.equal(await evaluate('document.querySelector("main").firstElementChild.id'),'nipras-intro','video replaces entire first hero');
 assert.equal(await evaluate('!!document.querySelector("#nipras-intro button, #nipras-intro input")'),false,'no playback UI');
 assert.equal(await evaluate('document.body.textContent.includes("معلّمك الذكي لنجاحك في")'),false,'old headline removed');
 await evaluate('document.querySelector("#nipras-intro").scrollIntoView()');
 await until('document.querySelector("#nipras-intro video")?.readyState>=2');
 assert.match(await evaluate('document.querySelector("#nipras-intro video").currentSrc'),/main-page-library-video/);
 for(const [width,height] of [[1440,900],[768,1024],[390,844]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await pause(150);
  const bounds=await evaluate('(()=>{const s=document.querySelector("#nipras-intro"),v=s.querySelector("video"),r=s.getBoundingClientRect(),vr=v.getBoundingClientRect(),css=getComputedStyle(s);return {width:r.width,height:r.height,videoWidth:vr.width,videoHeight:vr.height,viewport:document.documentElement.clientWidth,screen:innerHeight,padding:css.padding,margin:css.margin};})()');
  assert.equal(bounds.width,bounds.viewport);assert.equal(bounds.videoWidth,bounds.width);assert.equal(bounds.videoHeight,bounds.height);assert.ok(bounds.height>=bounds.screen*.85&&bounds.height<=bounds.screen);assert.equal(bounds.padding,'0px');assert.equal(bounds.margin,'0px');
 }
 assert.equal(await evaluate('document.querySelector("#nipras-intro video").loop'),false);
 assert.equal(await evaluate('document.querySelector("#nipras-intro video").controls'),false);
 assert.equal(await evaluate('getComputedStyle(document.querySelector("#nipras-intro video")).objectFit'),'cover');
 // Reload starts a fresh automatic playback; leaving the showcase pauses it.
 await send('Page.reload');await until('document.querySelector("#nipras-intro video")?.readyState>=2');
 await evaluate('document.querySelector("#journey-after").scrollIntoView()');await pause(250);assert.equal(await evaluate('document.querySelector("#nipras-intro video").paused'),true);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Page.reload');await pause(600);await evaluate('document.querySelector("#nipras-intro").scrollIntoView()');
 await until('document.querySelector("#nipras-intro video")?.readyState>=2');
 assert.equal(await evaluate('document.querySelector("#nipras-intro video").paused'),true,'reduced motion disables autoplay');
 assert.equal(await evaluate('!!document.querySelector("canvas, #nipras-campus")'),false,'scroll-driven 3D campus removed');
 console.log('PASS library video source, no UI, cover, offscreen pause, reduced motion, and no 3D campus');
}finally{
 await send('Emulation.setEmulatedMedia',{features:[]});
 socket.close();
}
