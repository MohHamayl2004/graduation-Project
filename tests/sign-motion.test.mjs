// Recorded signing is blended between frames and placed on the video's timeline.
import test from "node:test";
import assert from "node:assert/strict";
import { frameAt, segmentAt, faceGoals } from "../src/character-engine/SignMotion.js";

const pose = (x) => ({ "11": [x, 0, 0], "12": [-x, 0, 0], "13": [x, -1, 0], "14": [-x, -1, 0], "15": [x, -2, 0], "16": [-x, -2, 0] });
const clip = { duration: 2, frames: [{ t: 0, pose: pose(0), left: null, right: null, face: { jawOpen: 0 } }, { t: 2, pose: pose(2), left: null, right: null, face: { jawOpen: 1 } }] };

test("frames are blended at any time between two recordings", () => {
  const f = frameAt(clip, 1);
  assert.deepEqual(f.pose["11"], [1, 0, 0]);
  assert.equal(f.face.jawOpen, 0.5);
  assert.deepEqual(frameAt(clip, -5).pose["11"], [0, 0, 0], "before the clip: its first frame");
  assert.deepEqual(frameAt(clip, 50).pose["11"], [2, 0, 0], "after the clip: its last frame");
  assert.equal(frameAt({ frames: [] }, 1), null);
});

test("a clip fills its sentence exactly, whatever its own length", () => {
  const track = [{ start: 10, end: 14, clip: "s", clipDuration: 2 }];
  assert.equal(segmentAt(track, 9.99), null);
  assert.equal(segmentAt(track, 10).clipTime, 0);
  assert.equal(segmentAt(track, 12).clipTime, 1, "half-way through the sentence is half-way through the clip");
  assert.equal(segmentAt(track, 14), null, "the sentence's end hands back to the companion");
  assert.equal(segmentAt([{ start: 0, end: 3, clip: "s" }], 1.5).clipTime, 1.5, "without a known length the clip runs at real time");
});

test("the signer's face drives the character's face", () => {
  assert.deepEqual(faceGoals({ face: { jawOpen: 0.4, mouthSmileLeft: 0.2, mouthSmileRight: 0.6, browInnerUp: 0.1 } }), { jawOpen: 0.4, mouthSmile: 0.4, browInnerUp: 0.1 });
  assert.equal(faceGoals({}), null);
});

import fs from "node:fs";
import { signBlend } from "../src/character-engine/SignMotion.js";
import { cueAt } from "../src/pages/InteractiveLesson/avatarTimeline.js";

test("a sign eases in from the companion, flows from the sign before it, and eases out", () => {
  const track = [
    { start: 0, end: 1, clip: "a", easeIn: true, easeOut: false },
    { start: 1, end: 2, clip: "b", easeIn: false, easeOut: true }
  ];
  assert.equal(signBlend(track, 0).weight, 0, "starts from the companion's pose");
  assert.equal(signBlend(track, 0.5).weight, 1);
  assert.equal(signBlend(track, 0.99).weight, 1, "no ease-out: the next sign follows");
  const b = signBlend(track, 1.02);
  assert.equal(b.previous.clip, "a", "blends from the sign before");
  assert.ok(b.into < 1);
  assert.ok(signBlend(track, 1.999).weight < 0.05, "eases out at the end");
  assert.equal(signBlend(track, 2), null);
});

test("the 1-1 sign track: every clip exists, signs are in order and sit on spoken words", () => {
  const track = JSON.parse(fs.readFileSync(new URL("../src/data/signs/1-1-stickman.track.json", import.meta.url), "utf8"));
  const cues = JSON.parse(fs.readFileSync(new URL("../src/data/interactive/1-1-stickman.captions.json", import.meta.url), "utf8"));
  assert.ok(track.segments.length > 0);
  assert.match(track.source, /الذكاء الاصطناعي/, "trial signs say where they come from");
  track.segments.forEach((s, i) => {
    assert.ok(fs.existsSync(new URL(`../public/signs/${s.clip}.json`, import.meta.url)), `missing clip ${s.clip}`);
    assert.ok(s.end > s.start, `${s.clip} has no time`);
    if (i) assert.ok(s.start >= track.segments[i - 1].end - 1e-6, `${s.clip} overlaps the sign before`);
    assert.notEqual(cueAt(cues, s.start + 1e-3), -1, `${s.clip} at ${s.start}s is not on a spoken sentence`);
  });
});
