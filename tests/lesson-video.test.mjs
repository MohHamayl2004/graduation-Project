import test from "node:test";
import assert from "node:assert/strict";
import {
  validateStoryboard,
  renderLessonVideoHtml,
  sceneStages,
} from "../scripts/video/lessonVideo.js";

const storyboard = () => ({
  lessonId: "1-1",
  scenes: sceneStages.map((stage) => ({
    stage,
    heading: "متوسط التغير",
    narration:
      "نحسب متوسط التغير من خلال قسمة التغير في الصادات على التغير في السينات بين النقطتين.",
  })),
});
test("only ordered, bounded Arabic storyboard data reaches the trusted renderer", () => {
  assert.equal(validateStoryboard(storyboard()).scenes.length, 5);
  for (const mutate of [
    (s) => s.scenes.reverse(),
    (s) => (s.scenes[0].narration = "<script>alert(1)</script>"),
    (s) => (s.scenes[0].code = "process.exit()"),
    (s) => (s.lessonId = "../../other"),
    (s) => (s.scenes[0].heading = "x".repeat(200)),
  ]) {
    const s = storyboard();
    mutate(s);
    assert.throws(() => validateStoryboard(s));
  }
});
test("rendered diagrams use verified cubic endpoints and measured audio timing", () => {
  const s = validateStoryboard(storyboard()),
    timings = sceneStages.map((stage, i) => ({
      stage,
      start: i * 8,
      duration: 8,
      audioDuration: 7.5,
    }));
  const html = renderLessonVideoHtml(s, timings);
  assert.match(html, /data-duration="40"/);
  assert.match(html, /assets\/scene-0.mp3/);
  assert.match(html, /−٦ ÷ ٣ = −٢/);
  assert.match(html, /window\.__timelines/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.throws(() => renderLessonVideoHtml(s, [{ duration: Infinity }]));
});
