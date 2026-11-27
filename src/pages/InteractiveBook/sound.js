// Small sounds for the book, made with the Web Audio API so there are no
// sound files to license or load: a page turn, a switch click, a balance
// "ding", and right / wrong answers. The student can mute them.
const KEY = "nipras-book-sound";
let context = null;
let muted = (() => { try { return localStorage.getItem(KEY) === "off"; } catch { return false; } })();

function audio() {
  if (muted || typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  if (context.state === "suspended") context.resume().catch(() => {});
  return context;
}

function tone(freq, { at = 0, length = 0.15, type = "sine", volume = 0.18, slide } = {}) {
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t); osc.stop(t + length + 0.02);
}

function noise({ length = 0.35, from = 1800, to = 500, volume = 0.22 } = {}) {
  const ctx = audio(); if (!ctx) return;
  const t = ctx.currentTime, frames = Math.floor(ctx.sampleRate * length);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 1.6);
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = buffer; filter.type = "bandpass"; filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(from, t); filter.frequency.exponentialRampToValueAtTime(to, t + length);
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
}

export const sound = {
  get muted() { return muted; },
  setMuted(value) { muted = value; try { localStorage.setItem(KEY, value ? "off" : "on"); } catch { /* private mode */ } },
  flip: () => noise(),
  click: () => { tone(2200, { length: 0.03, type: "square", volume: 0.08 }); tone(900, { at: 0.02, length: 0.04, type: "square", volume: 0.06 }); },
  connect: () => tone(660, { length: 0.08, type: "triangle", volume: 0.12 }),
  light: () => { tone(523, { length: 0.25 }); tone(784, { at: 0.08, length: 0.35, volume: 0.14 }); },
  ding: () => { tone(1320, { length: 0.9, volume: 0.16 }); tone(1980, { at: 0.01, length: 0.6, volume: 0.06 }); },
  right: () => { tone(660, { length: 0.12 }); tone(880, { at: 0.1, length: 0.12 }); tone(1175, { at: 0.2, length: 0.25 }); },
  wrong: () => tone(220, { length: 0.3, type: "sawtooth", volume: 0.08, slide: 150 }),
  buzz: () => tone(110, { length: 0.5, type: "sawtooth", volume: 0.07 })
};
