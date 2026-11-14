import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { lesson11Questions, lesson11QuestionVerification } from '../src/pages/Lesson/content/lesson11Questions.js';

test('all 26 PDF-verified questions and worked subparts have stable individual IDs and correct page ownership', () => {
  assert.equal(lesson11Questions.length, 26);
  assert.equal(new Set(lesson11Questions.map(question => question.id)).size, 26);
  assert.deepEqual([1, 2, 3, 4, 5].map(page => lesson11Questions.filter(question => question.pdfPage === page).length), [4, 2, 5, 5, 10]);
  for (const question of lesson11Questions) {
    assert.equal(question.printedPage, question.pdfPage + 3);
    assert.match(question.id, /^lesson-1-1-/);
    assert.ok(question.label && question.prompt && question.hint);
    assert.ok(question.steps.length >= 2);
    assert.ok(question.steps.every(step => step.text));
  }
  assert.equal(lesson11QuestionVerification.identifiedCount, 26);
  assert.deepEqual(lesson11QuestionVerification.unresolved, []);
});

test('all stored mathematical steps render strictly through KaTeX', () => {
  for (const question of lesson11Questions) {
    for (const math of [...question.steps.map(step => step.math), question.answer].filter(Boolean)) {
      assert.doesNotThrow(() => katex.renderToString(math, { throwOnError: true, strict: 'error' }), `${question.id}: ${math}`);
    }
  }
});

test('PDF corrections override contradictory extracted JSON in the question data', () => {
  const find = suffix => lesson11Questions.find(question => question.id === `lesson-1-1-${suffix}`);
  assert.equal(find('example-1-rate').answer, '-2');
  assert.equal(find('activity-2-worked').answer, '\\frac{3}{2}');
  assert.equal(find('activity-2-to-6').answer, '-\\frac{2}{3}');
  assert.equal(find('exercise-3').answer, 'a=4');
  assert.equal(find('exercise-8-b').answer, 'n=-2');
  const piecewise = (x, a) => x < 2 ? 6 - x : x * x + a * x;
  assert.equal((piecewise(4, 4) - piecewise(1, 4)) / (4 - 1), 9);
  const logarithmic = x => x + Math.log(x ** -2);
  assert.ok(Math.abs((logarithmic(Math.E) - logarithmic(1)) / (Math.E - 1) - (3 - Math.E) / (1 - Math.E)) < 1e-12);
});

test('exercise answers agree with independent endpoint calculations', () => {
  const find = suffix => lesson11Questions.find(question => question.id === `lesson-1-1-${suffix}`);
  const f = x => 3 / x + x * x;
  assert.ok(Math.abs(f(5) - f(3) - 78 / 5) < 1e-12);
  assert.equal((f(1) - f(4)) / (1 - 4), 17 / 4);
  assert.equal(find('exercise-1-a').answer, '\\frac{78}{5}');
  assert.equal(find('exercise-1-b').answer, '\\frac{17}{4}');
  assert.equal(find('exercise-4').answer, '16');
  assert.equal(find('exercise-5').answer, '1');
  assert.equal(find('exercise-6').answer, 'b=2');
  assert.equal(find('example-4-speed').answer, '11\\;\\mathrm{m/s}');
});
