import '../../backend/config/env.js';
import fs from 'node:fs';
import {askVideoModel} from '../../backend/services/videoAssessment.js';
import {lessons} from './unit1Lessons.mjs';
for(const lesson of lessons){
  const file='backend/data/video-assessments/'+lesson.id+'.json';
  const plan=JSON.parse(fs.readFileSync(file));
  if(plan.checkpointReview) {console.log(lesson.id,'reusing selection');continue;}
  const result=await askVideoModel('Select pedagogically appropriate comprehension checks from the supplied candidates. A candidate must assess only narration already heard, fall after a completed explanation, and reinforce a distinct concept. Return selectedIds and a concise reason. Prefer two well-spaced checks when both are valid.', {
    scenes:lesson.scenes.map((s,i)=>({i,narration:s.narration})),
    candidates:lesson.quizzes.map((q,i)=>({id:'checkpoint-'+i,afterScene:q.scene,prompt:q.prompt,answer:q.answer})),
  }, {type:'object',properties:{selectedIds:{type:'array',items:{type:'string'},minItems:1,maxItems:2},reason:{type:'string'}},required:['selectedIds','reason'],additionalProperties:false});
  if(!Array.isArray(result.selectedIds)||!result.selectedIds.length||result.selectedIds.some(id=>!plan.questions.some(q=>q.id===id)))throw Error('Invalid checkpoint selection');
  plan.questions=plan.questions.filter(q=>result.selectedIds.includes(q.id));
  plan.checkpointSelection='Qwen selected from source-reviewed end-of-scene candidates';
  plan.checkpointReview={model:process.env.AI_MODEL_ID, ...result};
  fs.writeFileSync(file,JSON.stringify(plan,null,2));
  console.log(lesson.id,result.selectedIds);
}
