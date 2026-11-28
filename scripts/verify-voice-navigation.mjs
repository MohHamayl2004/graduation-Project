// Browser microphone -> real STT -> global router -> real TTS confirmation.
// Audio comes from a synthesized recording, through Chrome's input device;
// network requests and application responses are never mocked.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const output=resolve('.agents/check-output/qwen-voice');mkdirSync(output,{recursive:true});
const {token}=JSON.parse(readFileSync(resolve(output,'test-session.json'),'utf8'));
async function scenario({name,audio,from,to,click}) {
  const browser=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',[
    '--headless','--mute-audio','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${resolve(output,audio)}`,
    '--no-first-run','--no-default-browser-check','--disable-extensions','--disable-sync','--disable-background-networking',
    '--window-size=1440,1000','--remote-debugging-port=0',`--user-data-dir=${resolve(output,'voice-browser-'+name)}`
  ],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  let socket,id=0;const pending=new Map(),responses=[],errors=[];
  try {
    const endpoint=await new Promise((done,fail)=>{let log='';const timer=setTimeout(()=>fail(Error('Chrome startup timeout')),20000);browser.on('error',fail);browser.stderr.on('data',b=>{log+=b;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);done(m[1]);}});});
    socket=new WebSocket(endpoint);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
    socket.onmessage=e=>{const d=JSON.parse(e.data),p=pending.get(d.id);if(p){pending.delete(d.id);d.error?p.reject(Error(d.error.message)):p.resolve(d.result);}if(d.method==='Network.responseReceived'&&/\/api\/tutor\/speech/.test(d.params.response.url))responses.push({path:new URL(d.params.response.url).pathname,status:d.params.response.status,mime:d.params.response.mimeType});if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.text);};
    const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params,...(sessionId?{sessionId}:{})}));});
    const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const command=(m,p={})=>send(m,p,sessionId);
    const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    const capture=async file=>{const r=await command('Page.captureScreenshot',{format:'png'});writeFileSync(resolve(output,file),Buffer.from(r.data,'base64'));};
    const until=async expression=>{const end=Date.now()+45000;while(Date.now()<end){if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,150));}await capture(name+'-failure.png');console.error(await evaluate('({url:location.href,text:document.body.innerText.slice(-1400),speechErrors:window.__speechErrors,states:window.__voiceStates})'));console.error(responses);throw Error('Timed out: '+expression);};
    await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
    await command('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('nipras.token',${JSON.stringify(token)});localStorage.setItem('nipras.companion.settings.v1',JSON.stringify({mode:'compact',voice:true,microphone:true,recognition:'auto'}));`});
    await command('Page.navigate',{url:'http://127.0.0.1:5173/'});await until("location.origin==='http://127.0.0.1:5173'&&document.readyState!=='loading'");
    await evaluate(`sessionStorage.setItem('nipras.token',${JSON.stringify(token)});localStorage.setItem('nipras.companion.settings.v1',JSON.stringify({mode:'compact',voice:true,microphone:true,recognition:'auto'}));`);
    await command('Page.navigate',{url:'http://127.0.0.1:5173'+from});await command('Page.bringToFront');
    await until("document.querySelector('.nipras-companion [data-status=ready] canvas')");
    await evaluate(`window.__voiceStates=[];window.__speechErrors=[];window.addEventListener('nipras:speech-error',e=>window.__speechErrors.push(e.detail));new MutationObserver(()=>{const s=document.querySelector('.nipras-companion')?.dataset.companionState;if(s&&!window.__voiceStates.includes(s))window.__voiceStates.push(s);}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-companion-state']});`);
    if(click){await evaluate("document.querySelector('.nipras-companion-menu-trigger').click()");await until("document.querySelector('button[aria-label=\"تسجيل سؤال صوتي\"]')");await evaluate("document.querySelector('button[aria-label=\"تسجيل سؤال صوتي\"]').click()");}
    else await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Alt',code:'AltRight',windowsVirtualKeyCode:165,nativeVirtualKeyCode:165,modifiers:1});
    await until("document.querySelector('.nipras-companion').dataset.companionState==='listening'");
    await new Promise(r=>setTimeout(r,6000));
    if(click)await evaluate("document.querySelector('button[aria-label=\"تسجيل سؤال صوتي\"]').click()");
    else await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Alt',code:'AltRight',windowsVirtualKeyCode:165,nativeVirtualKeyCode:165,modifiers:0});
    await until(`location.pathname===${JSON.stringify(to)}`);await until("window.__voiceStates.includes('speaking')");await capture(name+'-redirect.png');
    assert.ok(responses.some(r=>r.path.endsWith('/transcribe')&&r.status===200));assert.ok(responses.some(r=>r.path.endsWith('/speech')&&r.status===200&&r.mime.startsWith('audio/')));assert.deepEqual(errors,[]);
    const states=await evaluate('window.__voiceStates');
    // AltGr must remain available for normal keyboard input.
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'AltGraph',code:'AltRight',windowsVirtualKeyCode:165,modifiers:3});
    assert.notEqual(await evaluate("document.querySelector('.nipras-companion').dataset.companionState"),'listening');
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:'AltGraph',code:'AltRight',windowsVirtualKeyCode:165,modifiers:0});
    return {name,from,to,input:click?'clickable microphone':'Right Alt',states,responses,errors,altGrPreserved:true};
  }finally{socket?.close();browser.kill();}
}
const results=[];
results.push(await scenario({name:'arabic',audio:'levantine.wav',from:'/dashboard',to:'/ai-tutor',click:false}));
results.push(await scenario({name:'english',audio:'navigate-progress.wav',from:'/lectures',to:'/progress',click:true}));
writeFileSync(resolve(output,'voice-navigation-browser.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results}));
