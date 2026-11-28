// Time sampling only: never infer phonemes or timestamps from text/elapsed CPU time.
export class LipSyncController {
  constructor({ supportedRoles = [] } = {}) {
    this.roles = [...new Set(supportedRoles.filter(role => typeof role === 'string' && (role === 'jawOpen' || role.startsWith('viseme'))))];
    this.supported = new Set(this.roles); this.cues = []; this.mode = 'idle';
  }
  weights(values) {
    const result = Object.fromEntries(this.roles.map(role => [role, 0]));
    if (values && typeof values === 'object' && !Array.isArray(values)) for (const [role, weight] of Object.entries(values)) {
      if (this.supported.has(role) && Number.isFinite(weight)) result[role] = Math.max(0, Math.min(1, weight));
    }
    return result;
  }
  setTimingData(cues = []) {
    this.cues = (Array.isArray(cues) ? cues.slice(0, 5000) : [])
      .filter(cue => cue && Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.start >= 0 && cue.end > cue.start && cue.visemes && typeof cue.visemes === 'object' && !Array.isArray(cue.visemes))
      .map(cue => ({ start: cue.start, end: cue.end, visemes: this.weights(cue.visemes) }))
      .sort((a, b) => a.start - b.start || a.end - b.end);
  }
  update({ playing = false, playbackTime = 0, energy = 0, visemes = null } = {}) {
    let weights = this.weights();
    if (!playing) this.mode = 'idle';
    else if (!this.roles.length) this.mode = 'unavailable';
    else if (visemes && typeof visemes === 'object' && !Array.isArray(visemes)) { this.mode = 'timed-visemes'; weights = this.weights(visemes); }
    else if (this.cues.length) {
      this.mode = 'timed-visemes';
      const cue = Number.isFinite(playbackTime) && this.cues.find(cue => playbackTime >= cue.start && playbackTime < cue.end);
      weights = this.weights(cue?.visemes);
    } else {
      this.mode = 'audio-amplitude';
      const role = this.supported.has('jawOpen') ? 'jawOpen' : this.supported.has('visemeAA') ? 'visemeAA' : null;
      if (role) weights[role] = (Number.isFinite(energy) ? Math.max(0, Math.min(1, energy)) : 0) * .8;
      else this.mode = 'unavailable';
    }
    return { mode: this.mode, weights };
  }
  stop() { this.mode = 'idle'; return this.weights(); }
  getDiagnostics() { return { mode: this.mode, timingAvailable: this.cues.length > 0, supportedRoles: [...this.roles] }; }
}
