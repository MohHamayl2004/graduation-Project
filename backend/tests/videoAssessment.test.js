import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { generateQuestions, gradeVideoAnswer, transcriptCues } from '../services/videoAssessment.js';
import { createVideoRouter } from '../routes/videoAssessmentRoutes.js';

const vtt = 'WEBVTT\n\n1\n00:00:00.000 --> 00:00:10.000\nFirst explanation.\n\n00:00:10.500 --> 00:00:16.000\nMore details.\n\n00:00:16.000 --> 00:00:25.000\nLater topic.';
const question = { kind:'choice', prompt:'Which topic was covered?', options:['First','Later'], answer:'First', evidence:'First explanation.', feedback:'The first topic has just been explained.' };

test('questions use actual cue ends and only the already-taught prefix', async () => {
  const cues = transcriptCues(vtt,25);
  const results = await generateQuestions({cues,duration:25,count:3,objectives:['First topic']}, async (_,data) => {
    if (data.groups) return { boundaries:[0,0,1,2,99] };
    assert.equal(data.taught,'First explanation.');
    return {...question, correctIndex:0, cue:0};
  });
  assert.deepEqual(results.map(q=>q.at),[10]);
  await assert.rejects(generateQuestions({cues,duration:25,count:2}, async (_,data) => data.groups ? {boundaries:[0]} : {...question,correctIndex:0,cue:2}));
  assert.throws(()=>transcriptCues(vtt,20));
  assert.throws(()=>transcriptCues(vtt.replace('10.500','09.500'),25));
});

test('grading validates options and requires structured feedback for short answers', async () => {
  assert.equal((await gradeVideoAnswer(question,'First')).correct,true);
  await assert.rejects(gradeVideoAnswer(question,'outside'));
  await assert.rejects(gradeVideoAnswer({...question,kind:'short'},'response',async()=>({ correct:'yes' })));
});

test('student plan hides answer keys, and writing or skipping an attempt is idempotent and owner scoped', async () => {
  const records = new Map();
  const attempts = {
    find: filter => ({lean:async()=>[...records.values()].filter(r=>r.owner===filter.owner)}),
    findOne: filter => ({lean:async()=>records.get(JSON.stringify(filter))}),
    findOneAndUpdate: (filter, update) => ({lean:async()=>{
      const k=JSON.stringify(filter);
      if (!records.has(k)) records.set(k,{...filter,...update.$setOnInsert});
      return records.get(k);
    }}),
  };
  const app=express();
  app.use(express.json(),createVideoRouter({plans:[{_id:'video',revision:'v1',questions:[{id:'q',at:10,...question}]}],attempts,
    guard:(req,_res,next)=>{req.user={_id:req.get('user')};next();}}));
  const send=(owner,values)=>request(app).put('/video/questions/q').set('user',owner).send({revision:'v1',...values});
  const plan=await request(app).get('/video').set('user','A').expect(200);
  assert.equal(plan.body.questions[0].answer,undefined);
  assert.equal((await send('A',{answer:'First'})).body.result.correct,true);
  assert.equal((await send('A',{skip:true})).body.result.status,'answered');
  assert.equal((await send('B',{skip:true})).body.result.status,'skipped');
  assert.equal(records.size,2);
});
