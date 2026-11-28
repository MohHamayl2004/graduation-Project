import test from 'node:test';
import assert from 'node:assert/strict';
import { fitBookStage } from '../shared/lessonFlipbook.js';

test('the book expands to fill desktop viewports and adjusts when the right sidebar expands or collapses', () => {
  for (const [viewportWidth, viewportHeight] of [[1366, 768], [1920, 1080]]) {
    const height = viewportHeight - 140;
    const collapsedWidth = viewportWidth - 96 - 32;
    const expandedWidth = viewportWidth - 239 - 32;
    const collapsedFit = fitBookStage(collapsedWidth, height);
    const expandedFit = fitBookStage(expandedWidth, height);
    for (const [fit, maxWidth] of [[collapsedFit, collapsedWidth], [expandedFit, expandedWidth]]) {
      assert.equal(fit.portrait, false);
      assert.ok(fit.width <= maxWidth + 1e-8);
      assert.ok(fit.height <= height + 1e-8);
      const pageRatio = (fit.width / 2) / fit.height;
      assert.ok(pageRatio >= 480 / 690 - 1e-8 && pageRatio <= 0.98 + 1e-8);
      assert.ok(fit.width / 2 > 460);
    }
    assert.ok(collapsedFit.width > expandedFit.width);
  }
});

test('narrow screens use one page and short wide screens keep facing pages', () => {
  for (const [width, height] of [[355, 620], [370, 500], [300, 260]]) {
    const fit = fitBookStage(width, height);
    assert.equal(fit.portrait, true);
    assert.ok(fit.width <= width && fit.height <= height);
    assert.ok(Math.abs(fit.width / fit.height - 480 / 690) < 1e-8);
  }
  assert.equal(fitBookStage(1000, 350).portrait, false);
});
