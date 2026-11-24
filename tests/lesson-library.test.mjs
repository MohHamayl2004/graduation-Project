import test from "node:test";
import assert from "node:assert/strict";
import { subjects, filterSubjects, filterLessons } from "../src/pages/Lectures/library.js";

test("library preserves the three textbook lessons and links the complete interactive unit", () => {
  assert.equal(subjects.length, 1);
  assert.equal(subjects[0].name, "الرياضيات");
  assert.deepEqual(subjects[0].videos.map(v => v.to), ["/lectures/videos/lesson-20261117"]);
  assert.equal(subjects[0].videos[0].title, "متوسط التغير");
  assert.equal(subjects[0].lessons[0].to, "/lesson/1-1");
  assert.equal(subjects[0].lessons[0].title, "متوسط التغير");
  assert.deepEqual(subjects[0].lessons.map(item => item.to), ["/lesson/1-1", "/lesson/1-2", "/lesson/1-3", "/math-unit"]);
});
test("search finds subjects and their actual lesson titles, with clear empty results", () => {
  assert.equal(filterSubjects("الرياضيات").length, 1);
  assert.equal(filterSubjects("متوسط").length, 1);
  assert.equal(filterSubjects("الكيمياء").length, 0);
  assert.equal(filterLessons(subjects[0], "التغير").length, 1);
  assert.equal(filterLessons(subjects[0], "غير موجود").length, 0);
  assert.equal(filterSubjects("  ").length, 1);
});
