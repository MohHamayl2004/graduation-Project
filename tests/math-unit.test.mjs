import test from "node:test";
import assert from "node:assert/strict";
import { numericAnswer, diagramState } from "../shared/mathUnit.js";
import {
  unitLessons,
  gradeUnitAnswer,
  publicUnitLesson,
} from "../backend/services/mathUnitCurriculum.js";

test("unit curriculum covers seven actual source lessons with reviewed exercises", () => {
  assert.deepEqual(
    unitLessons.map((l) => l.code),
    ["1-1", "1-2", "1-3", "1-4", "1-5", "1-6", "1-7"],
  );
  for (const lesson of unitLessons) {
    assert.ok(
      lesson.definitions.length &&
        lesson.examples.length &&
        lesson.activities.length >= 3,
    );
    for (const activity of lesson.activities) {
      assert.ok(activity.source && activity.explanation);
      const answer = String(
        activity.kind === "choice" ? activity.correct : activity.answer,
      );
      assert.equal(
        gradeUnitAnswer(lesson.code, activity.id, answer)?.correct,
        true,
      );
    }
    const client = publicUnitLesson(lesson.code);
    assert.ok(
      client.activities.every(
        (a) => !("answer" in a) && !("correct" in a) && !("explanation" in a),
      ),
    );
  }
});
test("numeric grading accepts Arabic digits and exact fractions, rejects code and undefined values", () => {
  assert.equal(numericAnswer("−٢/٣"), -2 / 3);
  assert.equal(numericAnswer(" ٠٫٥ "), 0.5);
  for (const bad of [
    "1/0",
    "0/0",
    "Infinity",
    "1;process.exit()",
    "2+2",
    "",
    null,
  ])
    assert.equal(numericAnswer(bad), null);
  assert.equal(gradeUnitAnswer("1-7", "implicit-slope", "٢/٣").correct, true);
  assert.equal(gradeUnitAnswer("1-1", "rate", "٢").correct, false);
  assert.equal(gradeUnitAnswer("1-1", "missing", "2"), null);
});
test("interactive diagrams use analytic derivatives, valid limit domains and actual source points", () => {
  const rate = diagramState("1-1", -1, 2);
  assert.equal(rate.value, -2);
  assert.equal(diagramState("1-1", 1, 1).value, null);
  assert.equal(diagramState("1-2", 2).value, 4);
  assert.ok(Math.abs(diagramState("1-3", Math.PI / 2).value - 1) < 1e-10);
  assert.ok(Math.abs(diagramState("1-4", 0.001).value - 1) < 1e-5);
  assert.equal(diagramState("1-5", 1).value, 8);
  assert.equal(diagramState("1-6", 2).value, 300);
  const implicit = diagramState("1-7", 1);
  assert.ok(Math.abs(implicit.y - 1) < 1e-10);
  assert.ok(Math.abs(implicit.value - 2 / 3) < 1e-10);
});
