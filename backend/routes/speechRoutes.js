import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';
import multer from 'multer';
import { ApiError } from '../errors/ApiError.js';
import { createFishSpeechService as createSpeechService } from '../services/fishSpeechService.js';
import { createTranscriptionService, speechCapabilities } from '../services/qwenSpeechService.js';

export function createSpeechRouter({ guard = protect, env = process.env, synthesize = createSpeechService({env}), transcribe = createTranscriptionService({env}) } = {}) {
  const router = Router(); router.use(guard);
  const usage=new Map();
  const limit=(req,_res,next)=>{
    const now=Date.now();for(const [key,value]of usage)if(now-value.start>60000)usage.delete(key);
    const key=String(req.user?._id||'anonymous'),entry=usage.get(key)||{start:now,count:0};entry.count++;usage.set(key,entry);
    next(entry.count>12?new ApiError(429,'SPEECH_RATE_LIMIT','Too many speech requests. Please wait a minute.'):undefined);
  };
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:6*1024*1024,files:1,fields:0}}).single('audio');
  router.get('/capabilities',(_req,res)=>{res.set('Cache-Control','no-store');res.json(speechCapabilities(env));});
  router.post('/transcribe',limit,upload,asyncHandler(async(req,res)=>{
    if(!req.file)throw new ApiError(400,'STT_INVALID_AUDIO','An audio recording is required.');
    const controller=new AbortController(),abort=()=>{if(!res.writableEnded)controller.abort();};res.once('close',abort);
    try {const result=await transcribe({audio:req.file.buffer,mimeType:req.file.mimetype,signal:controller.signal});if(!controller.signal.aborted){res.set('Cache-Control','no-store');res.json(result);}}
    finally{res.removeListener('close',abort);}
  }));
  router.post('/', limit, asyncHandler(async (req, res) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const close = () => { if (!res.writableEnded) abort(); };
    req.once('aborted', abort); res.once('close', close);
    try {
      const result = await synthesize({ text: req.body?.text, signal: controller.signal });
      if (controller.signal.aborted || res.destroyed) return;
      res.set('Cache-Control', 'no-store'); res.set('X-TTS-Model', result.model);
      res.set('X-TTS-Sync', 'audio-amplitude');
      const duration = result.sync?.durationSeconds;
      if (Number.isFinite(duration) && duration > 0) res.set('X-TTS-Duration', String(duration));
      res.set('Access-Control-Expose-Headers', 'X-TTS-Model, X-TTS-Sync, X-TTS-Duration');
      res.type(result.contentType).send(result.audio);
    } finally { req.removeListener('aborted', abort); res.removeListener('close', close); }
  }));
  return router;
}
export default createSpeechRouter();
