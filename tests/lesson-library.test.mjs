import test from "node:test";
import assert from "node:assert/strict";
import { subjects, filterSubjects, filterLessons } from "../src/pages/Lectures/library.js";

test("library exposes the existing lesson without fabricated videos or progress", () => {
  assert.equal(subjects.length, 1);
  assert.equal(subjects[0].name, "الرياضيات");
  assert.equal(subjects[0].videos.length, 0);
  assert.equal(subjects[0].lessons[0].to, "/lesson/1-1");
  assert.equal(subjects[0].lessons[0].title, "متوسط التغير");
});
test("search finds subjects and their actual lesson titles, with clear empty results", () => {
  assert.equal(filterSubjects("الرياضيات").length, 1);
  assert.equal(filterSubjects("متوسط").length, 1);
  assert.equal(filterSubjects("الكيمياء").length, 0);
  assert.equal(filterLessons(subjects[0], "التغير").length, 1);
  assert.equal(filterLessons(subjects[0], "غير موجود").length, 0);
  assert.equal(filterSubjects("  ").length, 1);
});
