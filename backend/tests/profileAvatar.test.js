import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {validateAvatar} from '../validation/profileAvatar.js';
import {createAvatarHandler} from '../controllers/avatarController.js';
import {errorHandler} from '../middleware/errorMiddleware.js';
import createAuthRouter from '../routes/authRoutes.js';
const image='data:image/jpeg;base64,'+Buffer.from([255,216,255,224,0,1]).toString('base64');
test('profile pictures accept bounded raster data and removal, rejecting SVG and arbitrary URLs',()=>{
 assert.equal(validateAvatar(image),image);assert.equal(validateAvatar(''),'');
 for(const input of ['https://other.example/photo.jpg','data:image/svg+xml;base64,PHN2Zz4=',null,image+'bad','data:image/jpeg;base64,'+'A'.repeat(100000)])assert.throws(()=>validateAvatar(input),e=>e.code==='INVALID_AVATAR');
});
test('profile updates use only the authenticated user and return the saved account photo',async()=>{
 const denied=express();denied.use(express.json());denied.use(createAuthRouter());denied.use(errorHandler);
 assert.equal((await request(denied).patch('/me/avatar').send({avatarUrl:image})).status,401);
 let saved;const app=express();app.use(express.json());app.patch('/avatar',(req,_res,next)=>{req.user={_id:'own-student'};next();},createAvatarHandler({saveAvatar:async(id,avatarUrl)=>{saved={id,avatarUrl};return {_id:id,fullName:'Student',avatarUrl};}}));app.use(errorHandler);
 const result=await request(app).patch('/avatar').send({avatarUrl:image,userId:'someone-else',role:'admin'});
 assert.equal(result.status,200);assert.deepEqual(saved,{id:'own-student',avatarUrl:image});assert.equal(result.body.user.avatarUrl,image);assert.equal(result.body.user.role,'student');
 assert.equal((await request(app).patch('/avatar').send({avatarUrl:'javascript:alert(1)'})).status,400);
});
