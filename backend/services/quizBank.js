// The answer keys of the quizzes the site shows (src/data/quizzes), read from
// the same files, so a browser cannot report a wrong answer as right.
import { quizzes } from "../../src/data/quizzes/rateOfChange.js";

export function loadQuizBank(list = quizzes) {
  return new Map(list.map((q) => [q.id, { id: q.id, title: q.title, subject: q.subject, studyLessonId: q.studyLessonId || null,
    questions: new Map(q.questions.map((x) => [x.id, { answer: x.answer, choices: new Set(x.choices.map((c) => c.key)) }])) }]));
}

// answers: { [questionId]: choiceKey } for every question of the quiz. Null if anything is unknown or missing.
export function gradeQuiz(bank, quizId, answers) {
  const quiz = bank.get(quizId);
  if (!quiz || !answers || typeof answers !== "object") return null;
  const graded = [];
  for (const [questionId, q] of quiz.questions) {
    const choice = answers[questionId];
    if (typeof choice !== "string" || !q.choices.has(choice)) return null;
    graded.push({ questionId, choice, correct: choice === q.answer });
  }
  const correct = graded.filter((a) => a.correct).length;
  return { quiz, answers: graded, correct, total: graded.length, score: Math.round((correct / graded.length) * 100) };
}
