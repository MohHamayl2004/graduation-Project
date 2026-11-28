import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { teacherState, animateMouth } from "../src/pages/AITutor/teacherAnimation.js";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

test("teacher speaks only during actual playback and stops on interruption or error", () => {
  for (const status of [undefined, "idle", "loading", "ended", "paused", "cancelled", "error", "streaming"]) {
    assert.equal(teacherState(status), "idle", String(status));
  }
  assert.equal(teacherState("playing"), "speaking");
});

test("visemes animate during playback and close immediately afterward", () => {
  const mesh = { morphTargetDictionary: { viseme_aa: 0, viseme_E: 1, viseme_O: 2, viseme_PP: 3, eyeBlinkLeft: 4 }, morphTargetInfluences: [0, 0, 0, 0, 0.4] };
  const visited = new Set();
  for (let frame = 0; frame < 120; frame++) {
    animateMouth([mesh], true, frame / 60, 1 / 60);
    mesh.morphTargetInfluences.slice(0, 4).forEach((value, index) => { if (value > 0.05) visited.add(index); });
  }
  assert.equal(visited.size, 4);
  animateMouth([mesh], false, 2, 1 / 60);
  assert.deepEqual(mesh.morphTargetInfluences, [0, 0, 0, 0, 0.4]);
});

test("the teacher stays in its sidebar container for both playback states", async () => {
  const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  try {
    const { default: TeacherCharacter } = await server.ssrLoadModule('/src/pages/AITutor/components/TeacherCharacter.jsx');
    for (const [playback, state] of [[undefined, 'idle'], ['playing', 'speaking'], ['cancelled', 'idle']]) {
      const markup = renderToStaticMarkup(React.createElement(TeacherCharacter, { speechPlayback: playback }));
      assert.match(markup, new RegExp(`class="tutor-teacher" data-state="${state}"`));
      assert.doesNotMatch(markup, /tutor-teacher-flight/);
    }
    assert.match(renderToStaticMarkup(React.createElement(TeacherCharacter, { idleOnly: true })), /sidebar-teacher/);
  } finally { await server.close(); }
});

test("the teacher model contains the supported visemes", async () => {
  const bytes = await readFile(new URL('../src/assets/images/male.glb', import.meta.url));
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  const names = gltf.meshes.flatMap(mesh => mesh.extras?.targetNames || []);
  for (const name of ['viseme_aa', 'viseme_E', 'viseme_O', 'viseme_PP']) assert.ok(names.includes(name));
});
