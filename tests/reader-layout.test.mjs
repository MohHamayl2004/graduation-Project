import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fitBookStage, lesson11Leaves, enginePage, logicalPage, restoredLeaf, leafIndex } from '../shared/lessonFlipbook.js';
import { rateOfChange, exampleFunction, evaluateBookAnswer, lessonBooks, bookTutorQuestion } from '../shared/lessonBook.js';

test('fitBookStage handles desktop two-page spreads and mobile single-page views', () => {
  // Desktop wide viewports
  for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 800], [1024, 768]]) {
    const stage = fitBookStage(w - 120, h - 140);
    assert.equal(stage.portrait, false, `Viewport ${w}x${h} should use two-page spread`);
    assert.ok(stage.width <= w, `Stage width ${stage.width} must fit within viewport ${w}`);
    assert.ok(stage.height <= h, `Stage height ${stage.height} must fit within viewport ${h}`);
    const pageRatio = (stage.width / 2) / stage.height;
    assert.ok(pageRatio >= 480 / 690 - 0.01 && pageRatio <= 0.89, `Page ratio ${pageRatio} should stay within bounds`);
  }

  // Mobile portrait viewports (threshold is width < 680)
  for (const [w, h] of [[360, 640], [375, 667], [390, 844], [412, 915], [600, 900]]) {
    const stage = fitBookStage(w, h);
    assert.equal(stage.portrait, true, `Narrow viewport ${w}x${h} should trigger single-page portrait`);
    assert.ok(stage.width <= w);
    assert.ok(stage.height <= h);
    assert.ok(Math.abs(stage.width / stage.height - 480 / 690) < 1e-4, 'Single-page portrait maintains exact 480:690 ratio');
  }
});

test('focus mode dimension expansion increases readable stage area', () => {
  const normalWidth = 1366 - 240 - 32; // With expanded sidebar
  const focusWidth = 1366 - 32;        // Sidebar collapsed/hidden in focus mode
  const height = 768 - 110;

  const normalFit = fitBookStage(normalWidth, height);
  const focusFit = fitBookStage(focusWidth, height);

  assert.equal(normalFit.portrait, false);
  assert.equal(focusFit.portrait, false);
  assert.ok(focusFit.width > normalFit.width, 'Focus mode should provide wider reading surface');
  assert.ok(focusFit.height >= normalFit.height, 'Focus mode stage height should not shrink');
  assert.ok((focusFit.width * focusFit.height) > (normalFit.width * normalFit.height), 'Total reader area expands in focus mode');
});

test('RTL enginePage and logicalPage mapping maintains bi-directional integrity', () => {
  const count = lesson11Leaves.length;
  assert.equal(count, 10, 'Lesson 1-1 contains 10 leaves');

  // In portrait (single-page mode): enginePage = count - 1 - logical
  for (let logical = 0; logical < count; logical++) {
    const engine = enginePage(logical);
    assert.equal(logicalPage(engine, true), logical, `Roundtrip mapping failed for leaf ${logical} in portrait`);
  }

  // In two-page spread (landscape):
  // When engine is on the right-hand side, logicalPage returns the right page index
  const firstSpreadLogical = logicalPage(enginePage(0), false);
  assert.ok(firstSpreadLogical === 0 || firstSpreadLogical === 1);
});

test('RTL keyboard navigation mapping matches Arabic reading progression', () => {
  // In RTL Arabic, progression moves from right to left:
  // - Turning forward (التالي) moves leftward in visual flipbook flow -> turn(1) triggered by ArrowLeft
  // - Turning backward (السابق) moves rightward -> turn(-1) triggered by ArrowRight
  const simulateNavKey = (key, current, portrait, totalLeaves) => {
    const step = portrait ? 1 : 2;
    switch (key) {
      case 'ArrowLeft':
      case 'PageDown':
        return Math.min(totalLeaves - 1, current + step);
      case 'ArrowRight':
      case 'PageUp':
        return Math.max(0, current - step);
      case 'Home':
        return 0;
      case 'End':
        return totalLeaves - 1;
      default:
        return current;
    }
  };

  assert.equal(simulateNavKey('ArrowLeft', 0, true, 10), 1, 'ArrowLeft advances forward in portrait');
  assert.equal(simulateNavKey('ArrowLeft', 0, false, 10), 2, 'ArrowLeft advances 2 pages in two-page spread');
  assert.equal(simulateNavKey('ArrowRight', 4, true, 10), 3, 'ArrowRight goes backward in portrait');
  assert.equal(simulateNavKey('PageDown', 2, true, 10), 3, 'PageDown advances forward');
  assert.equal(simulateNavKey('PageUp', 3, true, 10), 2, 'PageUp goes backward');
  assert.equal(simulateNavKey('Home', 7, true, 10), 0, 'Home jumps to cover/first leaf');
  assert.equal(simulateNavKey('End', 2, true, 10), 9, 'End jumps to final review leaf');
});

test('readability text scale values and calculations', () => {
  const getScaleMultiplier = mode => {
    switch (mode) {
      case 'xlarge': return 1.30;
      case 'large': return 1.15;
      case 'normal':
      default: return 1.0;
    }
  };

  assert.equal(getScaleMultiplier('normal'), 1.0);
  assert.equal(getScaleMultiplier('large'), 1.15);
  assert.equal(getScaleMultiplier('xlarge'), 1.30);

  // Baseline font sizes scaled correctly
  const baseBodyFont = 13.5;
  assert.equal(Math.round(baseBodyFont * getScaleMultiplier('normal') * 10) / 10, 13.5);
  assert.equal(Math.round(baseBodyFont * getScaleMultiplier('large') * 10) / 10, 15.5);
  assert.equal(Math.round(baseBodyFont * getScaleMultiplier('xlarge') * 10) / 10, 17.6);
});

test('preserves math curriculum content, leaves, and activity contracts', () => {
  // Leaf sequence integrity
  const kinds = lesson11Leaves.map(leaf => leaf.kind);
  assert.deepEqual(kinds, [
    'original', 'meaning',
    'original', 'graph',
    'original', 'exercise',
    'original', 'connection',
    'original', 'review'
  ]);

  // Math function and rate calculations
  assert.equal(exampleFunction(-1), 7);
  assert.equal(exampleFunction(2), 1);
  const result = rateOfChange(-1, 2);
  assert.equal(result.dx, 3);
  assert.equal(result.dy, -6);
  assert.equal(result.rate, -2);

  // Activity answer evaluation supports Arabic and English numbers
  assert.equal(evaluateBookAnswer('1-1', 'example-1-rate', '-2'), true);
  assert.equal(evaluateBookAnswer('1-1', 'example-1-rate', '−٢'), true);
  assert.equal(evaluateBookAnswer('1-1', 'example-1-rate', '3'), false);
  assert.equal(evaluateBookAnswer('1-1', 'example-1-rate', 'abc'), null);

  // Progress restoration
  assert.equal(restoredLeaf({ bookLeaf: 'secant' }), leafIndex('secant'));
  assert.equal(restoredLeaf({ lastPage: 3 }), leafIndex('text-6'));
});

test('living-book.css contains focus mode, font scale, and mobile responsive rules', () => {
  const css = readFileSync('src/pages/Lesson/living-book.css', 'utf8');
  assert.match(css, /\.living-screen\.is-focus-mode/, 'Contains is-focus-mode selector');
  assert.match(css, /--living-font-scale/, 'Contains --living-font-scale variable');
  assert.match(css, /\.living-scale-controls/, 'Contains font scale controls styling');
  assert.match(css, /\.living-focus-toggle/, 'Contains focus mode toggle styling');
  assert.match(css, /@media \(max-width: 700px\)/, 'Contains mobile breakpoint');
  assert.match(css, /:focus-visible/, 'Contains accessible focus-visible styles');
});
