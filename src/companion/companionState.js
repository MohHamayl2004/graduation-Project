export const DEFAULT_SETTINGS=Object.freeze({mode:'floating',size:230,voice:true,microphone:true,motion:1,gestures:true,glow:true,shadow:true,recognition:'auto'});
export function readSettings(raw){
  let value;try{value=JSON.parse(raw);}catch{return {...DEFAULT_SETTINGS};}
  if(!value||typeof value!=='object')return {...DEFAULT_SETTINGS};
  const result={...DEFAULT_SETTINGS};
  for(const key of ['voice','microphone','gestures','glow','shadow'])if(typeof value[key]==='boolean')result[key]=value[key];
  if(['floating','compact','focused','hidden'].includes(value.mode))result.mode=value.mode;
  if(Number.isFinite(value.size))result.size=Math.max(150,Math.min(320,value.size));
  if(Number.isFinite(value.motion))result.motion=Math.max(0,Math.min(1,value.motion));
  if(['auto','browser'].includes(value.recognition))result.recognition=value.recognition;
  return result;
}
export function clampPosition(position,viewport,size){
  const clamp=(n,max)=>Math.min(Math.max(8,max),Math.max(8,Number.isFinite(n)?n:8));
  return {x:clamp(position?.x,viewport.width-size.width-8),y:clamp(position?.y,viewport.height-size.height-8)};
}
export const dragMoved=(start,end)=>Math.hypot(end.x-start.x,end.y-start.y)>6;
export const canStartDrag=event=>event.pointerType!=='mouse'||event.button===0;
export const isPushToTalk=event=>event.code==='AltRight'&&!event.ctrlKey&&!event.metaKey&&!event.getModifierState?.('AltGraph');
