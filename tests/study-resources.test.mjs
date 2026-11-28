// Every study-plan link must point at content that exists: a real lesson in
// the catalog, a real interactive video, quiz, lesson page or book page and experiment.
import test from "node:test";
import assert from "node:assert/strict";
import { studyResources } from "../src/data/studyResources.js";
import { studyLessons } from "../shared/studyPlanCatalog.js";
import { physicsUnit2 } from "../src/data/books/physicsUnit2.js";
import { quizzes } from "../src/data/quizzes/rateOfChange.js";
import fs from "node:fs";

const activities = ["explanation", "example", "practice", "quiz", "summary"];
const interactive = fs.readdirSync(new URL("../src/data/interactive/", import.meta.url)).map((f) => f.replace(/\.json$/, ""));

test("study-plan resources point at real lessons and real content", () => {
  const lessonIds = new Set(studyLessons.map((l) => l.lessonId));
  for (const [lessonId, byActivity] of Object.entries(studyResources)) {
    assert.ok(lessonIds.has(lessonId), `${lessonId} is not in the study catalog`);
    for (const [activity, links] of Object.entries(byActivity)) {
      assert.ok(activities.includes(activity), `${lessonId}: unknown activity ${activity}`);
      for (const r of links) {
        const url = new URL(r.to, "http://x");
        if (r.kind === "video") { assert.equal(url.pathname.split("/")[1], "interactive"); assert.ok(interactive.includes(url.pathname.split("/")[2]), r.to); assert.ok(fs.existsSync(new URL(`../public/${r.poster}`, import.meta.url)), r.poster); }
        else if (r.kind === "quiz") assert.ok(quizzes.some((q) => q.id === url.searchParams.get("quiz")), r.to);
        else if (r.kind === "lesson") assert.ok(["/lesson/1-1", "/lesson-book/1-1", "/math-unit"].includes(url.pathname), r.to);
        else if (r.kind === "book") {
          const page = physicsUnit2.pages.find((p) => String(p.bookPage) === url.searchParams.get("page"));
          assert.ok(page, `${r.to}: no such book page`);
          if (url.searchParams.get("try")) assert.ok(page.hotspots.some((h) => h.id === url.searchParams.get("try")), `${r.to}: no such experiment on that page`);
        } else assert.fail(`${r.to}: unknown kind ${r.kind}`);
      }
    }
  }
});

test("the rate-of-change lesson links its video, quiz and interactive lesson", () => {
  const r = studyResources["math-u1-l1"];
  assert.equal(r.explanation[0].to, "/interactive/1-1-stickman");
  assert.equal(r.quiz[0].to, "/quizzes?quiz=rate-of-change");
});
