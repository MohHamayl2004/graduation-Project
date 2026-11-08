// Visual simulation only. This mouth controller can later accept real viseme timing.
export function teacherState(chat, submitting = false) {
  const last = chat.messages.at(-1);
  if (chat.error || last?.errorMessage) return "error";
  if (chat.phase === "streaming") return last?.role === "assistant" && last.content.trim() ? "speaking" : "processing";
  return submitting ? "processing" : "idle";
}

export function teacherDestination(workspace, size, composerTop = workspace.top + workspace.height) {
  const height = Math.max(1, Math.min(size.height, composerTop - workspace.top - 32, workspace.height - 32));
  const ratio = Math.min(height / size.height, Math.max(1, workspace.width - 32) / size.width);
  return { x: workspace.left + 16, y: workspace.top + 16, width: size.width * ratio, height: size.height * ratio };
}

export function teacherSidebarHome(origin, sidebar, viewport, bottomInset) {
  const left = Math.max(sidebar.left, viewport.left), top = Math.max(sidebar.top, viewport.top);
  const right = Math.min(sidebar.right, viewport.right), bottom = Math.min(sidebar.bottom - bottomInset, viewport.bottom);
  const ratio = Math.max(0, Math.min(1, (right - left) / origin.width, (bottom - top) / origin.height));
  const width = origin.width * ratio, height = origin.height * ratio;
  return { x: Math.max(left, Math.min(origin.left, right - width)), y: Math.max(top, Math.min(origin.top, bottom - height)), width, height };
}

export function teacherTravelPoint(start, end, progress) {
  const arc = Math.min(64, Math.hypot(end.x - start.x, end.y - start.y) * 0.12);
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress - 4 * arc * progress * (1 - progress) + Math.sin(progress * Math.PI * 4) * Math.sin(progress * Math.PI) * 2
  };
}

// Deliberately visual-only playback for responses delivered without rendered stream chunks.
export const visualSpeechDuration = (text) => Math.min(5000, Math.max(1200, text.length * 35));

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
