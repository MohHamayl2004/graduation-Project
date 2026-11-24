import User from '../models/User.js';
import {userDto} from '../services/billingService.js';
import {validateAvatar} from '../validation/profileAvatar.js';
import asyncHandler from '../middleware/asyncHandler.js';
import {ApiError} from '../errors/ApiError.js';

export function createAvatarHandler({saveAvatar=(id,avatarUrl)=>User.findByIdAndUpdate(id,{$set:{avatarUrl}},{new:true,runValidators:true})}={}){
  return asyncHandler(async(req,res)=>{
    const avatarUrl=validateAvatar(req.body?.avatarUrl);
    const user=await saveAvatar(req.user._id,avatarUrl);
    if(!user)throw new ApiError(404,'USER_NOT_FOUND','تعذر العثور على حساب الطالب.');
    res.set('Cache-Control','no-store');res.json({user:userDto(user)});
  });
}
