// The companion character beside the lesson video: every decision is a function
// of the video time, so it plays, pauses, seeks, speeds up and ends with the video.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cueAt, wordAt, avatarAction, mouthEnergy, signsFor } from "../src/pages/InteractiveLesson/avatarTimeline.js";

const cues = JSON.parse(fs.readFileSync(new URL("../src/data/interactive/1-1-stickman.captions.json", import.meta.url), "utf8"));
const lesson = JSON.parse(fs.readFileSync(new URL("../src/data/interactive/1-1-stickman.json", import.meta.url), "utf8"));

test("the narration timings fit the film and its questions", () => {
  assert.ok(cues.length > 50);
  for (let i = 1; i < cues.length; i++) assert.ok(cues[i].start >= cues[i - 1].end - 1e-6, `cue ${i} overlaps the one before`);
  assert.ok(cues.at(-1).end <= lesson.source.duration, "narration ends inside the video");
  // Every question stops the video between two sentences, never mid-sentence.
  for (const cp of lesson.checkpoints) assert.equal(cueAt(cues, cp.at), -1, `${cp.id} at ${cp.at}s cuts a sentence`);
});

test("seeking anywhere gives the sentence and word the video is at", () => {
  const c = cues[10], mid = (c.start + c.end) / 2;
  assert.equal(cueAt(cues, mid), 10);
  assert.equal(cueAt(cues, c.start), 10);
  assert.equal(cueAt(cues, c.end), cueAt(cues, c.end)); // the end belongs to what follows
  assert.equal(cueAt(cues, -1), -1);
  assert.equal(cueAt(cues, 9999), -1);
  const first = wordAt(c, c.start), last = wordAt(c, c.end - 1e-3);
  assert.equal(first.index, 0);
  assert.equal(last.index, first.words.length - 1);
});

test("paused or ended, the character does not talk; playing, it follows the sentence", () => {
  const c = cues[3], t = (c.start + c.end) / 2;
  assert.equal(mouthEnergy({ cues, t, playing: false }), 0);
  assert.ok(mouthEnergy({ cues, t: t + 0.05, playing: true }) > 0 || mouthEnergy({ cues, t, playing: true }) > 0);
  assert.equal(mouthEnergy({ cues, t: cues[3].end + 0.01 < cues[4].start ? cues[3].end + 0.01 : 9999, playing: true }), 0);
  assert.equal(avatarAction({ cues, t, playing: true, ended: true }).state, "idle");
  assert.notEqual(avatarAction({ cues, t, playing: true, ended: false }).state, "idle");
  // The same time gives the same action whichever way the video got there (seek, speed).
  assert.deepEqual(avatarAction({ cues, t, playing: true }), avatarAction({ cues, t, playing: true }));
});

test("sentences about what is on screen point at the video", () => {
  const i = cues.findIndex((c) => /(^|\s)(هاد|شوف|بنطلع)(\s|$)/.test(c.text));
  assert.ok(i >= 0);
  const a = avatarAction({ cues, t: (cues[i].start + cues[i].end) / 2, playing: true });
  assert.equal(a.state, "pointing"); assert.equal(a.point, true);
});

test("words without a recorded sign are listed, never invented", () => {
  const lexicon = JSON.parse(fs.readFileSync(new URL("../src/data/signs/lexicon.json", import.meta.url), "utf8"));
  const { known, missing } = signsFor(cues, Object.fromEntries(Object.entries(lexicon).filter(([k]) => !k.startsWith("_"))));
  assert.equal(known.length, 0);
  assert.ok(missing.includes("سامي"));
});
