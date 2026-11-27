import test from "node:test";
import assert from "node:assert/strict";
import { subjects, filterSubjects, filterLessons } from "../src/pages/Lectures/library.js";

test("library exposes the existing lesson and NIPRAS's own interactive video, without fabricated progress", () => {
  assert.equal(subjects.length, 2);
  assert.equal(subjects[0].name, "الرياضيات");
  assert.deepEqual(subjects[0].videos.map((video) => video.to), ["/interactive/1-1-stickman"]);
  assert.equal(subjects[0].lessons[0].to, "/lesson/1-1");
  assert.equal(subjects[0].lessons[0].title, "متوسط التغير");
});
test("search finds subjects and their actual lesson titles, with clear empty results", () => {
  assert.equal(filterSubjects("الرياضيات").length, 1);
  assert.equal(filterSubjects("متوسط").length, 1);
  assert.equal(filterSubjects("الكيمياء").length, 0);
  assert.equal(filterLessons(subjects[0], "التغير").length, 1);
  assert.equal(filterLessons(subjects[0], "غير موجود").length, 0);
  assert.equal(filterSubjects("  ").length, 2);
  assert.equal(filterSubjects("الكهرباء المتحركة")[0].id, "physics");
});
