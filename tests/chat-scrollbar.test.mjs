import test from "node:test";
import assert from "node:assert/strict";
import { scrollbarMetrics, scrollbarOffset } from "../src/pages/AITutor/chatScrollbar.js";

test("thumb size and endpoints represent the real scroll range", () => {
  const top = scrollbarMetrics(600, 3000, 0);
  assert.equal(top.height, 120);
  assert.equal(top.top, 0);
  const bottom = scrollbarMetrics(600, 3000, 2400);
  assert.equal(bottom.top + bottom.height, 600);
  assert.equal(bottom.maxScroll, 2400);
  assert.equal(scrollbarMetrics(600, 600, 0).maxScroll, 0);
  assert.equal(scrollbarMetrics(0, 0, 0).top, 0);
});

test("thumb bends beyond the measured toggle and returns to the edge", () => {
  const obstacle = { top: 300, bottom: 416, right: 44 };
  assert.equal(scrollbarOffset(0, 40, 0, 1, obstacle), 0);
  assert.equal(scrollbarOffset(310, 40, 0, 1, obstacle), 49);
  assert.equal(scrollbarOffset(550, 40, 0, 1, obstacle), 0);
  const approaching = scrollbarOffset(230, 40, 0, 1, obstacle);
  assert.ok(approaching > 0 && approaching < 49);
  for (let top = 260; top <= 416; top++) assert.ok(1 + scrollbarOffset(top, 40, 0, 1, obstacle) > obstacle.right);
  assert.equal(scrollbarOffset(310, 40, 0, 1, null), 0);
});
