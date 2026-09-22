import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dueCheckpoint, initialLessonState, isCorrect, lessonReducer, summarise, youtubeId } from "../src/pages/InteractiveLesson/lessonState.js";

const lesson = JSON.parse(await readFile(new URL("../src/data/interactive/demo.json", import.meta.url), "utf8"));
const points = lesson.checkpoints;

test("a pasted YouTube link becomes a video id, whatever its shape", () => {
  for (const link of [
    "https://www.youtube.com/watch?v=fYc7jjoP1d4",
    "https://youtu.be/fYc7jjoP1d4",
    "https://www.youtube.com/watch?v=fYc7jjoP1d4&t=90s",
    "https://www.youtube.com/embed/fYc7jjoP1d4",
    "fYc7jjoP1d4"
  ]) {
    assert.equal(youtubeId(link), "fYc7jjoP1d4", link);
  }
  assert.equal(youtubeId("https://example.com/video"), "");
  assert.equal(youtubeId(""), "");
});

test("the video stops at the first unanswered checkpoint, in order", () => {
  assert.equal(dueCheckpoint(points, 10, {}), null, "before the first one, nothing is due");
  assert.equal(dueCheckpoint(points, 61, {})?.id, "cp1");
  assert.equal(dueCheckpoint(points, 200, {})?.id, "cp1", "skipping ahead does not skip the question");
  assert.equal(dueCheckpoint(points, 200, { cp1: {} })?.id, "cp2");
  assert.equal(dueCheckpoint(points, 400, { cp1: {}, cp2: {}, cp3: {} }), null);
});

test("an answered checkpoint is never asked again, even after seeking back", () => {
  let state = lessonReducer(initialLessonState, { type: "reached", checkpoint: points[0] });
  state = lessonReducer(state, { type: "answered", checkpoint: points[0], choiceId: "b", seconds: 61 });
  state = lessonReducer(state, { type: "resumed" });
  assert.equal(state.current, null);
  assert.equal(dueCheckpoint(points, 61, state.answers), null);
  // Answering twice does not overwrite the first attempt.
  const again = lessonReducer(state, { type: "answered", checkpoint: points[0], choiceId: "a", seconds: 70 });
  assert.equal(again.answers.cp1.choiceId, "b");
});

test("a right answer is recorded as right, a wrong one keeps its choice", () => {
  let state = lessonReducer(initialLessonState, { type: "answered", checkpoint: points[1], choiceId: "a", seconds: 181 });
  assert.equal(state.answers.cp2.correct, true);
  state = lessonReducer(state, { type: "answered", checkpoint: points[2], choiceId: "b", seconds: 301 });
  assert.equal(state.answers.cp3.correct, false);
});

test("the summary counts attention and names what to review", () => {
  const answers = { cp1: { choiceId: "a", correct: true }, cp2: { choiceId: "b", correct: false } };
  const result = summarise(points, answers);
  assert.deepEqual([result.total, result.answered, result.correct], [3, 2, 1]);
  assert.deepEqual(result.missed.map((m) => m.checkpoint.id), ["cp2"]);
  assert.equal(result.focus, 33);
});

test("the demo lesson follows the contract: one correct choice and a reason for every option", () => {
  assert.equal(lesson.version, 1);
  assert.match(lesson.source.videoId, /^[\w-]{11}$/);
  for (const checkpoint of points) {
    assert.ok(checkpoint.at > 0, `${checkpoint.id} needs a time`);
    assert.equal(checkpoint.choices.filter((c) => c.correct).length, 1, `${checkpoint.id} needs exactly one correct choice`);
    for (const choice of checkpoint.choices) {
      assert.ok(choice.feedback?.length > 10, `${checkpoint.id}/${choice.id} needs feedback that names the mistake`);
      assert.equal(isCorrect(checkpoint, choice.id), Boolean(choice.correct));
    }
    assert.ok(checkpoint.source?.lesson, `${checkpoint.id} must point back at the book`);
  }
});

test("the player embeds YouTube and never downloads the video", async () => {
  const hook = await readFile(new URL("../src/pages/InteractiveLesson/useYouTubeLesson.js", import.meta.url), "utf8");
  assert.match(hook, /www\.youtube\.com\/iframe_api/);
  // The comment says "never downloaded"; what matters is that no code fetches the file.
  assert.doesNotMatch(hook, /ytdl|videoplayback|\.mp4/i);
});
