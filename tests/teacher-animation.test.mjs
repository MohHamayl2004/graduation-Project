import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { teacherState, animateMouth, teacherDestination, teacherSidebarHome, teacherTravelPoint, visualSpeechDuration } from "../src/pages/AITutor/teacherAnimation.js";
import { chatReducer, initialChatState } from "../src/pages/AITutor/chatState.js";

const question = () => chatReducer(initialChatState, { type: "questionSent", content: "question", userId: "u", assistantId: "a" });
const event = (state, value) => chatReducer(state, { type: "streamEvent", event: value });

test("idle canvas fits the visible sidebar above its measured rounded bottom edge", () => {
  const anchor = { left: 1256, top: 559, width: 128, height: 170 };
  const sidebar = { left: 1213, top: 12, right: 1428, bottom: 668 };
  const viewport = { left: 0, top: 0, right: 1440, bottom: 680 };
  const home = teacherSidebarHome(anchor, sidebar, viewport, 24);
  assert.deepEqual(home, { x: 1256, y: 474, width: 128, height: 170 });
  const resized = teacherSidebarHome(anchor, { ...sidebar, left: 1284, bottom: 508 }, { ...viewport, bottom: 520 }, 24);
  assert.ok(resized.x >= 1284 && resized.x + resized.width <= 1428);
  assert.equal(resized.y + resized.height, 484);
  assert.equal(resized.width, 128);
  assert.equal(resized.height, 170);
  const fits = { ...anchor, top: 300 };
  assert.deepEqual(teacherSidebarHome(fits, sidebar, viewport, 24), { x: fits.left, y: fits.top, width: 128, height: 170 });
});

test("teacher destination belongs to the actual workspace and fits above the composer", () => {
  const destination = teacherDestination({ left: 320, top: 100, width: 900, height: 700 }, { width: 128, height: 210 }, 720);
  assert.deepEqual(destination, { x: 336, y: 116, width: 128, height: 210 });
  const mobile = teacherDestination({ left: 8, top: 120, width: 374, height: 440 }, { width: 128, height: 210 }, 300);
  assert.ok(mobile.x >= 8 && mobile.x + mobile.width <= 382);
  assert.ok(mobile.y + mobile.height <= 284);
  assert.equal(mobile.width / mobile.height, 128 / 210);
});

test("travel follows a curved path without changing either endpoint", () => {
  const start = { x: 1200, y: 650 }, end = { x: 330, y: 120 };
  assert.deepEqual(teacherTravelPoint(start, end, 0), start);
  assert.deepEqual(teacherTravelPoint(start, end, 1), end);
  const middle = teacherTravelPoint(start, end, 0.5);
  assert.equal(middle.x, (start.x + end.x) / 2);
  assert.ok(middle.y < (start.y + end.y) / 2);
  assert.ok(visualSpeechDuration("short") < visualSpeechDuration("long ".repeat(100)));
  assert.ok(visualSpeechDuration("long".repeat(10000)) <= 5000);
});

test("teacher follows real chat events, ignoring whitespace and metadata", () => {
  assert.equal(teacherState(initialChatState), "idle");
  assert.equal(teacherState(initialChatState, true), "processing");
  let state = question();
  assert.equal(teacherState(state), "processing");
  state = event(state, { type: "delta", text: " \n" });
  assert.equal(teacherState(state), "processing");
  state = event(state, { type: "delta", text: "answer" });
  assert.equal(teacherState(state), "speaking");
  assert.equal(teacherState(event(state, { type: "done", answer: "answer" })), "idle");
  assert.equal(teacherState(chatReducer(state, { type: "stopped" })), "error");
  assert.equal(teacherState(chatReducer(state, { type: "streamFailed", message: "offline" })), "error");
  assert.equal(teacherState(event(state, { type: "error", message: "failed" })), "error");
});

test("supported visemes vary smoothly and close immediately after speech", () => {
  const mesh = { morphTargetDictionary: { viseme_aa: 0, viseme_E: 1, viseme_O: 2, viseme_PP: 3, eyeBlinkLeft: 4 }, morphTargetInfluences: [0, 0, 0, 0, 0.4] };
  const visited = new Set();
  for (let frame = 0; frame < 120; frame++) {
    animateMouth([mesh], true, frame / 60, 1 / 60);
    mesh.morphTargetInfluences.slice(0, 4).forEach((value, i) => {
      assert.ok(value >= 0 && value <= 0.55);
      if (value > 0.05) visited.add(i);
    });
  }
  assert.equal(visited.size, 4);
  animateMouth([mesh], false, 2, 1 / 60);
  assert.deepEqual(mesh.morphTargetInfluences, [0, 0, 0, 0, 0.4]);
  assert.doesNotThrow(() => animateMouth([{ morphTargetDictionary: {}, morphTargetInfluences: [] }], true, 1, 0.016));
});

test("supplied GLB contains the visemes used by the simulation", async () => {
  const bytes = await readFile(new URL("../src/assets/images/male.glb", import.meta.url));
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  const gltf = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
  const names = gltf.meshes.flatMap((mesh) => mesh.extras?.targetNames || []);
  for (const name of ["viseme_aa", "viseme_E", "viseme_O", "viseme_PP", "jawOpen"]) assert.ok(names.includes(name), name);
});
