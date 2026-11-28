// Place recorded signs on a lesson video's timeline, word by word.
//
//   node tools/sign-capture/build_track.mjs src/data/signs/1-1-stickman.words.json > src/data/signs/1-1-stickman.track.json
//
// The words file lists which spoken forms each sign stands for; the time of each
// word inside its sentence comes from the narration captions, spread by word length
// (the same rule the caption highlight uses), so a sign starts with its word.
import fs from "node:fs";

const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const cues = JSON.parse(fs.readFileSync(new URL(`../../${spec.captions}`, import.meta.url), "utf8"));
const MIN = spec.minSeconds ?? 0.45, JOIN = spec.joinGapSeconds ?? 0.35;

// Each word of each sentence with its start and end time.
const words = cues.flatMap((cue) => {
  const list = cue.text.split(/\s+/).filter(Boolean);
  const total = list.reduce((n, w) => n + w.length + 1, 0), span = cue.end - cue.start;
  let acc = 0;
  return list.map((w) => { const start = cue.start + (acc / total) * span; acc += w.length + 1; return { w, start, end: cue.start + (acc / total) * span }; });
}).filter((x) => x.start < spec.until);

const segments = [];
for (const { w, start, end } of words) {
  const sign = spec.signs.find((s) => s.forms.includes(w));
  if (!sign) continue;
  if (sign.spell) {
    // Fingerspelled names: the letters share the word's time.
    if (segments.some((s) => s.spells === w)) continue;
    const span = Math.max(end - start, sign.spell.length * 0.22), step = span / sign.spell.length;
    sign.spell.forEach((clip, i) => segments.push({ start: start + i * step, end: start + (i + 1) * step, clip, gloss: `${sign.gloss} · ${i + 1}/${sign.spell.length}`, spells: w }));
  } else segments.push({ start, end: Math.max(end, start + MIN), clip: sign.clip, gloss: sign.gloss });
}
segments.sort((a, b) => a.start - b.start);
// No overlaps; close small gaps so neighbouring signs flow into each other.
for (let i = 0; i < segments.length; i++) {
  const next = segments[i + 1];
  if (next && segments[i].end > next.start) segments[i].end = next.start;
  if (next && next.start - segments[i].end < JOIN) segments[i].end = next.start;
}
const round = (n) => Math.round(n * 1000) / 1000;
const out = segments.map((s, i) => ({
  start: round(s.start), end: round(s.end), clip: s.clip, gloss: s.gloss,
  easeIn: i === 0 || segments[i - 1].end < s.start - 1e-6, easeOut: i === segments.length - 1 || segments[i + 1].start > s.end + 1e-6
}));
process.stdout.write(JSON.stringify({ _about: spec._about, source: spec.source, segments: out }, null, 1) + "\n");
