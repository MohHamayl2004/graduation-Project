// The companion character beside a lesson video follows the video's own clock:
// everything here is a pure function of the video time, so play, pause, seek
// and playback speed all land on the same answer the video shows.
//
// cues: the narration as [{ start, end, text }] in video seconds
// (src/data/interactive/<lesson>.captions.json, from the film's captions).

// The cue playing at time t, or -1 between sentences. Binary search: cues are sorted.
export function cueAt(cues, t) {
  let lo = 0, hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (t < cues[mid].start) hi = mid - 1;
    else if (t >= cues[mid].end) lo = mid + 1;
    else return mid;
  }
  return -1;
}

// The word being said at time t inside a cue, spreading the cue's time over its
// words by their length (the voice says longer words for longer).
export function wordAt(cue, t) {
  const words = cue.text.split(/\s+/).filter(Boolean);
  if (!words.length) return { words, index: -1 };
  const share = Math.min(1, Math.max(0, (t - cue.start) / (cue.end - cue.start)));
  const total = words.reduce((n, w) => n + w.length + 1, 0);
  let acc = 0;
  for (let i = 0; i < words.length; i++) {
    acc += words[i].length + 1;
    if (share * total < acc) return { words, index: i };
  }
  return { words, index: words.length - 1 };
}

// Words that refer to what is on screen: the character points at the video.
const POINTING = /(^|\s)(هون|هاد|هاي|شوف|لاحظ|بنطلع|هذا|هذه)(\s|$)/;

// What the character does at time t.
export function avatarAction({ cues, t, playing, ended }) {
  if (ended) return { state: "idle", cue: -1, point: false };
  const cue = cueAt(cues, t);
  if (cue < 0) return { state: playing ? "listening" : "idle", cue, point: false };
  const point = POINTING.test(cues[cue].text);
  return { state: point ? "pointing" : cue % 2 ? "explaining" : "speaking", cue, point };
}

// Mouth opening while a sentence is spoken: syllable-like pulses on the video's
// clock, so the mouth runs faster at 1.5× and stops when the video stops.
export function mouthEnergy({ cues, t, playing }) {
  if (!playing) return 0;
  const cue = cueAt(cues, t);
  if (cue < 0) return 0;
  const edge = Math.min(1, (t - cues[cue].start) / 0.12, (cues[cue].end - t) / 0.12);
  return Math.max(0, edge) * (0.25 + 0.55 * Math.abs(Math.sin(t * Math.PI * 4.6)));
}

// Signs recorded for words (src/data/signs/lexicon.json). A sign is a list of
// hand targets in the character's space; words without one are listed, not invented.
export function signsFor(cues, lexicon) {
  const known = new Set(), missing = new Set();
  for (const cue of cues) for (const word of cue.text.split(/\s+/).filter(Boolean)) (lexicon[word] ? known : missing).add(word);
  return { known: [...known], missing: [...missing] };
}
