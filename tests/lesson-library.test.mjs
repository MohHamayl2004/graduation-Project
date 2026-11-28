import test from "node:test";
import assert from "node:assert/strict";
import { subjects, filterSubjects, filterLessons } from "../src/pages/Lectures/library.js";

test("library lists the math videos, the three textbook lessons with the full unit, and the physics book", () => {
  assert.equal(subjects.length, 2);
  assert.equal(subjects[0].name, "الرياضيات");
  assert.deepEqual(subjects[0].videos.map((v) => v.to), ["/interactive/1-1-stickman", "/lectures/videos/lesson-20261117"]);
  assert.equal(subjects[0].lessons[0].to, "/lesson/1-1");
  assert.equal(subjects[0].lessons[0].title, "متوسط التغير");
  assert.deepEqual(subjects[0].lessons.map((item) => item.to), ["/lesson/1-1", "/lesson/1-2", "/lesson/1-3", "/math-unit", "/lesson-slides"]);
  // Physics is the interactive book: real pages, no videos or lessons yet.
  assert.equal(subjects[1].name, "الفيزياء");
  assert.deepEqual(subjects[1].books.map((book) => book.to), ["/book/physics"]);
  assert.equal(subjects[1].videos.length + subjects[1].lessons.length, 0);
});
test("search finds subjects and their actual lesson titles, with clear empty results", () => {
  assert.equal(filterSubjects("الرياضيات").length, 1);
  assert.equal(filterSubjects("متوسط").length, 1);
  assert.equal(filterSubjects("الكيمياء").length, 0);
  assert.equal(filterLessons(subjects[0], "التغير").length, 2, "the reading book and the slide lesson");
  assert.equal(filterLessons(subjects[0], "غير موجود").length, 0);
  assert.equal(filterSubjects("  ").length, 2);
  assert.equal(filterSubjects("الكهرباء المتحركة")[0].id, "physics");
});
