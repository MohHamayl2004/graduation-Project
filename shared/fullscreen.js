// Safari may lack element fullscreen or reject it outside its supported context.
export async function tryEnterFullscreen(element) {
  const enter = element?.requestFullscreen || element?.webkitRequestFullscreen;
  if (!enter) return false;
  try { await enter.call(element); return true; } catch { return false; }
}
