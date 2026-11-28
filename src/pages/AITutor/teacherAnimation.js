export function teacherState(playback) {
  return playback === "playing" ? "speaking" : "idle";
}

// Animate the existing model visemes only while speech audio is playing.
export function animateMouth(meshes, speaking, time, delta) {
  const shapes = ["viseme_aa", "viseme_E", "viseme_O", "viseme_PP"];
  const beat = time * 6.7;
  const current = Math.floor(beat) % shapes.length;
  const opening = Math.pow(Math.sin((beat % 1) * Math.PI), 2) * (0.35 + 0.2 * Math.sin(time * 2.3) ** 2);
  const blend = 1 - Math.exp(-delta * 22);
  for (const mesh of meshes) {
    for (const [i, name] of shapes.entries()) {
      const index = mesh.morphTargetDictionary[name];
      if (index === undefined) continue;
      const target = speaking && i === current ? opening : 0;
      mesh.morphTargetInfluences[index] = speaking ? mesh.morphTargetInfluences[index] + (target - mesh.morphTargetInfluences[index]) * blend : 0;
    }
  }
}
