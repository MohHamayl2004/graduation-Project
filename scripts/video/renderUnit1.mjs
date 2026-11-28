import '../../backend/config/env.js';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createFishSpeechService} from '../../backend/services/fishSpeechService.js';
import {lessons} from './unit1Lessons.mjs';

const ffmpeg=process.env.FFMPEG_PATH || 'ffmpeg', ffprobe=process.env.FFPROBE_PATH || 'ffprobe';
const {chromium}=await import(pathToFileURL(path.resolve('.local/browser-qa/node_modules/playwright-core/index.mjs')));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const speech=createFishSpeechService();
const stamp=s=>new Date(Math.round(s*1000)).toISOString().slice(11,23);
try {
for(const lesson of lessons){
  const dir=path.resolve('public/videos/sources',lesson.id);
  fs.mkdirSync(dir,{recursive:true});
  const scenes=[];let duration=0;
  for(const [i,s] of lesson.scenes.entries()){
    const audio=path.join(dir,'scene-'+i+'.mp3');
    const signature=createHash('sha256').update(s.narration).digest('hex');
    const receipt=audio+'.json';
    if(!fs.existsSync(audio)||!fs.existsSync(receipt)||JSON.parse(fs.readFileSync(receipt)).signature!==signature){
      const result=await speech({text:s.narration});
      fs.writeFileSync(audio,result.audio);fs.writeFileSync(receipt,JSON.stringify({signature,model:result.model}));
    }
    const spoken=Number(execFileSync(ffprobe,['-v','error','-show_entries','format=duration','-of','csv=p=0',audio],{encoding:'utf8'}));
    scenes.push({...s,start:duration,duration:spoken+1.2,audio:'scene-'+i+'.mp3'});duration+=spoken+1.2;
  }
  const { quizzes, ...publicLesson } = lesson;
  fs.writeFileSync(path.join(dir,'storyboard.json'),JSON.stringify({...publicLesson,scenes,duration},null,2));
  const html=fs.readFileSync('scripts/video/unit1Stage.html','utf8').replace('/*LESSON_DATA*/',JSON.stringify({lesson:publicLesson,scenes,duration}));
  fs.writeFileSync(path.join(dir,'animation.html'),html);
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.join(dir,'animation.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  const silent=path.join(dir,'silent.mp4'),fps=12;
  const encoder=spawn(ffmpeg,['-y','-v','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p',silent],{windowsHide:true,stdio:['pipe','ignore','pipe']});
  let encoderErrors='';encoder.stderr.on('data',b=>encoderErrors+=b);
  const ended=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code?reject(Error(encoderErrors)):resolve());});
  for(let frame=0;frame<Math.ceil(duration*fps);frame++){
    await page.evaluate(t=>window.renderFrame(t),frame/fps);
    const data=await page.screenshot({type:'jpeg',quality:85});
    if(!encoder.stdin.write(data)) await new Promise(resolve=>encoder.stdin.once('drain',resolve));
  }
  encoder.stdin.end();await ended;await page.close();
  const inputs=scenes.flatMap(s=>['-i',path.join(dir,s.audio)]);
  const filters=scenes.map((s,i)=>`[${i+1}:a]apad,atrim=duration=${s.duration},asetpts=PTS-STARTPTS[a${i}]`).join(';')+';'+scenes.map((_,i)=>`[a${i}]`).join('')+`concat=n=${scenes.length}:v=0:a=1[a]`;
  const output=path.resolve('public/videos',lesson.id+'.mp4');
  execFileSync(ffmpeg,['-y','-v','error','-i',silent,...inputs,'-filter_complex',filters,'-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-movflags','+faststart','-t',String(duration),output]);
  fs.unlinkSync(silent);
  fs.writeFileSync(path.resolve('public/videos',lesson.id+'.vtt'),'WEBVTT\n\n'+scenes.map(s=>stamp(s.start)+' --> '+stamp(s.start+s.duration-1)+'\n'+s.narration).join('\n\n')+'\n');
  const questions=lesson.quizzes.map((q,i)=>({id:'checkpoint-'+i,at:scenes[q.scene].start+scenes[q.scene].duration-0.4,kind:q.kind,prompt:q.prompt,options:q.options,answer:q.answer,feedback:q.feedback,evidence:scenes[q.scene].narration}));
  const revision=createHash('sha256').update(JSON.stringify({lesson,scenes})).digest('hex');
  const plan={_id:lesson.id,lessonId:lesson.lessonId,title:lesson.title,duration,revision,url:'/videos/'+lesson.id+'.mp4',captions:'/videos/'+lesson.id+'.vtt',grade:12,subject:'math',book:lesson.book,sourcePages:lesson.pages,checkpointSelection:'Reviewed instructional scene ends, authored from verified textbook content',questions};
  fs.writeFileSync('backend/data/video-assessments/'+lesson.id+'.json',JSON.stringify(plan,null,2));
  console.log(lesson.id,'rendered',duration.toFixed(2),'seconds',questions.map(q=>q.at));
}
}finally{await browser.close();}
