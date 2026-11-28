import {ApiError} from '../errors/ApiError.js';
export function validateAvatar(value){
  const invalid=()=>new ApiError(400,'INVALID_AVATAR','اختر صورة JPG أو PNG أو WebP بحجم مناسب.');
  if(value==='')return '';
  if(typeof value!=='string'||value.length>90000)throw invalid();
  const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!match)throw invalid();
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.toString('base64')!==match[2])throw invalid();
  const valid=match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!valid)throw invalid();
  return value;
}
