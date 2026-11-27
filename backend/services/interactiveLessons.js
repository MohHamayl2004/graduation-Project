import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The answer key comes from the same lesson files the site plays
// (src/data/interactive/*.json), so the API decides what is correct and a
// client cannot report a wrong answer as right.
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/data/interactive");

export function loadInteractiveLessons(dir = DIR) {
  const lessons = new Map();
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json"))) {
    const lesson = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    if (!lesson.studyLessonId) continue; // a demo with no lesson in the study catalog is not tracked
    lessons.set(path.basename(file, ".json"), {
      studyLessonId: lesson.studyLessonId,
      checkpoints: new Map((lesson.checkpoints || []).map((cp) => [cp.id, {
        skill: cp.skill || null,
        choices: new Map((cp.choices || []).map((c) => [c.id, Boolean(c.correct)]))
      }]))
    });
  }
  return lessons;
}

// What a submitted answer means: its study lesson, skill and correctness, or null if unknown.
export function gradeAnswer(lessons, { interactiveId, checkpointId, choiceId }) {
  const lesson = lessons.get(interactiveId);
  const checkpoint = lesson?.checkpoints.get(checkpointId);
  if (!checkpoint || !checkpoint.choices.has(choiceId)) return null;
  return { studyLessonId: lesson.studyLessonId, skill: checkpoint.skill, correct: checkpoint.choices.get(choiceId) };
}
