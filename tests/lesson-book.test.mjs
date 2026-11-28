import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonBooks, lessonPage, rateOfChange, evaluateBookAnswer, bookTutorQuestion } from '../shared/lessonBook.js';

test('each lesson maps its own PDF pages to printed and original page numbers', () => {
  assert.deepEqual(lessonBooks.map(book => [book.id, book.pageCount, book.printedStart]), [['1-1', 5, 4], ['1-2', 10, 9], ['1-3', 3, 19]]);
  assert.deepEqual(lessonPage('1-1', 1), { lessonId: '1-1', localPdfPage: 1, printedPage: 4, originalPdfPage: 8, sourceJsonPath: 'data/processed/math_page008.json', activityId: 'example-1-rate', interactionType: 'secant-and-answer' });
  assert.deepEqual(lessonPage('1-1', 2), { lessonId: '1-1', localPdfPage: 2, printedPage: 5, originalPdfPage: 9, sourceJsonPath: 'data/processed/math_page009.json', activityId: 'secant-geometry', interactionType: 'secant-graph' });
  assert.equal(lessonPage('1-2', 10).originalPdfPage, 22);
  assert.equal(lessonPage('1-3', 3).printedPage, 21);
  assert.equal(lessonPage('1-1', 6), null);
});

test('the PDF-verified cubic produces the textbook answer and handles coincident points', () => {
  assert.deepEqual(rateOfChange(-1, 2), { x1: -1, x2: 2, y1: 7, y2: 1, dx: 3, dy: -6, rate: -2 });
  assert.equal(rateOfChange(1, 1).rate, null);
});

test('the tutor action carries the selected page and the verified example context', () => {
  assert.match(bookTutorQuestion('1-1', 1), /1-1.*٤.*٨.*س³ − ٥س \+ ٣/);
  assert.match(bookTutorQuestion('1-1', 2), /1-1.*٥.*٩.*س³ − ٥س \+ ٣/);
  assert.equal(bookTutorQuestion('1-1', 3), null);
});

test('only valid numeric answers are graded against the verified example', () => {
  assert.equal(evaluateBookAnswer('1-1', 'example-1-rate', '−٢'), true);
  assert.equal(evaluateBookAnswer('1-1', 'example-1-rate', '-2'), true);
  assert.equal(evaluateBookAnswer('1-1', 'example-1-rate', '2'), false);
  assert.equal(evaluateBookAnswer('1-1', 'example-1-rate', 'abc'), null);
  assert.equal(evaluateBookAnswer('1-2', 'example-1-rate', '-2'), null);
});
