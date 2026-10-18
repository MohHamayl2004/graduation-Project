// Pinch zoom must not shrink the application shell or override browser panning.
export function visibleViewportMetrics(viewport, fallbackHeight) {
  if (viewport && Number.isFinite(viewport.scale) && Math.abs(viewport.scale - 1) > .05) return null;
  const height = Number.isFinite(viewport?.height) && viewport.height > 0 ? viewport.height : fallbackHeight;
  return { height: Math.max(1, height), top: Math.max(0, viewport?.offsetTop || 0) };
}
