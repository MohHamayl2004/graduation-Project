export function scrollbarMetrics(viewport, content, scrollTop) {
  const maxScroll = Math.max(0, content - viewport);
  const height = Math.min(viewport, Math.max(32, content > 0 ? viewport * viewport / content : viewport));
  const progress = maxScroll ? Math.max(0, Math.min(1, scrollTop / maxScroll)) : 0;
  return { height, top: progress * (viewport - height), maxScroll };
}

export function scrollbarOffset(top, height, trackTop, trackLeft, obstacle) {
  if (!obstacle) return 0;
  const bottom = trackTop + top + height;
  const distance = Math.max(0, obstacle.top - bottom, trackTop + top - obstacle.bottom);
  const approach = Math.max(48, Math.min(100, height * 0.75));
  const t = Math.max(0, 1 - distance / approach);
  return Math.max(0, obstacle.right - trackLeft + 6) * t * t * (3 - 2 * t);
}
