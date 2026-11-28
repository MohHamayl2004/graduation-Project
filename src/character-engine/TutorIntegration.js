import { normalizeGesture } from './gestureContract.js';
// Speech state follows media playback, never the arrival of chatbot text.
const audioSources = new WeakMap();
export class TutorIntegration {
  constructor(options = {}) {
    this.getControllers = options.getControllers || (() => null);
    this.synthesize = options.synthesize;
    this.createAudio = options.createAudio || (url => new Audio(url));
    this.createObjectURL = options.createObjectURL || (blob => URL.createObjectURL(blob));
    this.revokeObjectURL = options.revokeObjectURL || (url => URL.revokeObjectURL(url));
    this.onStatus = options.onStatus || (() => {});
    this.audio = null; this.listeners = []; this.cues = []; this.playing = false;
    this.generation = 0; this.disposed = false; this.phase = 'idle'; this.durationSeconds = null;
    this.listening = false; this.selection = normalizeGesture(null); this.gestureStarted = false;
  }

  setListening(active) {
    if (active) { this.interrupt(); this.listening = true; }
    else this.listening = false;
    this.setTutorState({ phase: this.phase });
  }

  setTutorState({ phase = 'idle', error } = {}) {
    this.phase = error ? 'idle' : phase;
    if (!this.playing) this.getControllers()?.animation?.setState(this.listening ? 'listening' : phase === 'streaming' && !error ? 'thinking' : 'idle');
  }

  attachAudio(audio, { cues = [] } = {}) {
    this.detachAudio();
    if (this.disposed || !audio) return;
    this.audio = audio;
    this.cues = (Array.isArray(cues) ? cues : []).slice(0, 5000).filter(cue => cue && Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start && cue.start >= 0);
    const listen = (name, fn) => { audio.addEventListener(name, fn); this.listeners.push(() => audio.removeEventListener(name, fn)); };
    listen('playing', () => {
      if (!this.analyser && typeof window !== 'undefined') {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (Context) { try { this.ownedContext ||= new Context(); this.enableAudioAnalysis(this.ownedContext); } catch { /* Playback remains available without amplitude analysis. */ } }
      }
      this.playing = true;
      const controls = this.getControllers();
      if (!this.gestureStarted) {
        controls?.animation?.setState('speaking');
        controls?.animation?.selectGesture?.(this.selection.gesture);
        controls?.face?.setExpression?.(['happy','supportive'].includes(this.selection.emotion) ? 'happy' : 'neutral', .45);
        this.gestureStarted = Boolean(controls);
      }
      this.onStatus('playing'); this.update();
    });
    for (const name of ['pause', 'ended', 'waiting', 'error', 'abort', 'emptied']) listen(name, () => {
      this.playing = false; this.getControllers()?.face?.setSpeech({ playing: false, energy: 0, visemes: null });
      this.gestureStarted = false;
      this.getControllers()?.animation?.cancelGestures?.(); this.getControllers()?.ik?.clearTargets?.(); this.getControllers()?.face?.setLookTarget?.(null);
      this.getControllers()?.animation?.setState(this.phase === 'streaming' ? 'thinking' : 'idle'); this.onStatus(name);
    });
    listen('seeked', () => this.update());
  }

  enableAudioAnalysis(context) {
    if (!this.audio || this.analyser) return Boolean(this.analyser);
    try {
      // A media element may only be attached to a Web Audio source once.
      const existing = audioSources.get(this.audio);
      if (existing && existing.context !== context) return false;
      const source = existing?.source || context.createMediaElementSource(this.audio);
      audioSources.set(this.audio, { source, context });
      const analyser = context.createAnalyser(); analyser.fftSize = 256;
      source.connect(analyser); analyser.connect(context.destination);
      this.analysis = { source, context }; this.analyser = analyser; this.samples = new Uint8Array(analyser.fftSize);
      context.resume?.().catch(() => {});
      return true;
    } catch { return false; }
  }

  update() {
    if (this.disposed) return;
    // Media events own body transitions. Do not overwrite contextual gestures
    // with speaking on every rendered frame.
    let energy = 0;
    if (this.playing && this.analyser) {
      this.analyser.getByteTimeDomainData(this.samples);
      energy = Math.min(1, Math.sqrt(this.samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / this.samples.length) * 5);
    }
    const cue = this.playing && this.cues.find(item => this.audio.currentTime >= item.start && this.audio.currentTime < item.end);
    this.getControllers()?.face?.setSpeech({ playing: this.playing, energy, visemes: cue?.visemes || null, playbackTime: Number.isFinite(this.audio?.currentTime) ? this.audio.currentTime : 0, timingData: this.cues });
  }

  getSpeechSnapshot() {
    const facial = this.getControllers()?.face?.getSpeechDiagnostics?.();
    return { playing: this.playing, currentTime: Number.isFinite(this.audio?.currentTime) ? this.audio.currentTime : 0,
      durationSeconds: Number.isFinite(this.audio?.duration) && this.audio.duration > 0 ? this.audio.duration : this.durationSeconds,
      mode: !this.playing ? 'idle' : facial?.mode || (this.cues.length ? 'timed-visemes' : this.analyser ? 'audio-amplitude' : 'unavailable'),
      timingAvailable: this.cues.length > 0 };
  }

  speak(text, options = {}) {
    const pending=this.pendingSpeech;
    if(pending&&pending.text===text&&pending.token===options.token&&pending.generation===this.generation)return pending.promise;
    const task=this.startSpeech(text,options);
    const request={text,token:options.token,generation:this.generation,promise:null};
    request.promise=task.finally(()=>{if(this.pendingSpeech===request)this.pendingSpeech=null;});
    this.pendingSpeech=request;
    return request.promise;
  }

  clearSpeechCache() { this.cachedSpeech=null; }

  async startSpeech(text, options = {}) {
    this.interrupt();
    this.listening = false; this.selection = normalizeGesture(options); this.gestureStarted = false;
    if (this.disposed || !this.synthesize) throw new Error('Fish speech is not configured.');
    const generation = this.generation; const controller = new AbortController(); this.request = controller;
    this.onStatus('loading');
    try {
      const cached=this.cachedSpeech;
      const result = cached&&cached.text===text&&cached.token===options.token ? cached.result : await this.synthesize(text, { ...options, signal: controller.signal });
      if (this.disposed || generation !== this.generation || controller.signal.aborted) return;
      const blob = result instanceof Blob ? result : result?.audio;
      if (!(blob instanceof Blob) || !blob.size) throw new Error('Speech synthesis returned no audio.');
      // Keep only the last clip in memory. Replays do not consume TTS credits.
      this.cachedSpeech=blob.size<=15*1024*1024?{text,token:options.token,result}:null;
      const url = this.createObjectURL(blob); this.objectURL = url;
      const audio = this.createAudio(url); this.attachAudio(audio, { cues: options.cues ?? result?.timingData });
      this.durationSeconds = Number.isFinite(result?.sync?.durationSeconds) && result.sync.durationSeconds > 0 ? result.sync.durationSeconds : null;
      await audio.play();
      if (this.disposed || generation !== this.generation) audio.pause();
      return audio;
    } catch (error) {
      if (controller.signal.aborted || generation !== this.generation || this.disposed) return;
      if (error.name === 'NotAllowedError' && this.audio) { this.onStatus('blocked'); return; }
      this.clearSpeechCache();
      this.detachAudio();
      if (this.objectURL) { this.revokeObjectURL(this.objectURL); this.objectURL = null; }
      this.getControllers()?.animation?.setState('idle'); this.onStatus('error');
      throw error;
    } finally { if (this.request === controller) this.request = null; }
  }

  async resume() {
    if (this.disposed || !this.audio) return;
    const audio = this.audio, generation = this.generation;
    try {
      await this.ownedContext?.resume();
      if (this.disposed || this.generation !== generation || this.audio !== audio) return;
      await audio.play();
      if (this.audio !== audio) audio.pause();
    } catch(error) {
      // A cancelled play()/AudioContext promise belongs to the old utterance,
      // and must not report a failure over a later answer or conversation.
      if(this.disposed||this.generation!==generation||this.audio!==audio)return;
      throw error;
    }
  }

  detachAudio() {
    this.listeners.splice(0).forEach(remove => remove());
    this.audio?.pause();
    this.analysis?.source.disconnect(); this.analyser?.disconnect();
    this.analysis = null; this.analyser = null; this.samples = null;
    this.audio = null; this.cues = []; this.playing = false; this.durationSeconds = null;
    this.getControllers()?.face?.setSpeech({ playing: false, energy: 0, visemes: null });
    this.getControllers()?.animation?.setState(this.phase === 'streaming' ? 'thinking' : 'idle');
  }

  interrupt() {
    this.pendingSpeech=null;
    this.generation++; this.request?.abort(); this.request = null;
    this.audio?.pause();
    if (this.audio) { try { this.audio.currentTime = 0; } catch { /* Media metadata may not be available yet. */ } }
    this.playing = false; this.phase = 'idle'; this.gestureStarted = false;
    this.getControllers()?.face?.setSpeech({ playing: false, energy: 0, visemes: null });
    this.getControllers()?.animation?.setState('idle'); this.onStatus('cancelled');
    this.getControllers()?.animation?.cancelGestures?.();
    this.getControllers()?.ik?.clearTargets?.(); this.getControllers()?.face?.setLookTarget?.(null);
    this.detachAudio();
    if (this.objectURL) { this.revokeObjectURL(this.objectURL); this.objectURL = null; }
  }

  dispose() { if (!this.disposed) { this.interrupt(); this.clearSpeechCache(); this.detachAudio(); this.ownedContext?.close().catch(() => {}); this.disposed = true; } }
}
