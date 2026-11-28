// Run from the repository root. Media and WebVTT are publisher-owned files.
import '../backend/config/env.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { generateQuestions, transcriptCues } from '../backend/services/videoAssessment.js';

const [id, lessonId, title, objectives, requested = '3'] = process.argv.slice(2);
if (!/^[a-z0-9-]{1,80}$/.test(id || '') || !lessonId || !title || !objectives) {
  throw Error('Usage: node scripts/prepare-video-assessment.mjs VIDEO_ID LESSON_ID TITLE OBJECTIVES [COUNT]');
}
const base = 'public/videos/' + id;
const duration = Number(execFileSync(process.env.FFPROBE_PATH || 'ffprobe', [
  '-v','error','-show_entries','format=duration','-of','csv=p=0', base + '.mp4',
], { encoding:'utf8' }).trim());
const vtt = await readFile(base + '.vtt','utf8');
const cues = transcriptCues(vtt, duration);
const revision = createHash('sha256').update(await readFile(base + '.mp4')).update(vtt)
  .update(JSON.stringify(['cue-groups-v2', objectives, requested, lessonId, title])).digest('hex');
const dir = 'backend/data/video-assessments';
const path = dir + '/' + id + '.json';
let cached;
try { cached = JSON.parse(await readFile(path,'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
if (cached?.revision === revision) {
  console.log('Reusing verified source revision:', id);
} else {
  const questions = await generateQuestions({ cues, duration, objectives, count:Number(requested) });
  const plan = { _id:id, lessonId, title, duration, revision, url:'/videos/'+id+'.mp4', captions:'/videos/'+id+'.vtt', questions };
  await mkdir(dir, { recursive:true });
  await writeFile(path, JSON.stringify(plan,null,2)+'\n');
  console.log(id, questions.map(q => q.at));
}
