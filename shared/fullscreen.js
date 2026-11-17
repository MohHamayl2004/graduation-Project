// Safari may lack element fullscreen or reject it outside its supported context.
export async function tryEnterFullscreen(element) {
  const enter = element?.requestFullscreen || element?.webkitRequestFullscreen;
  if (!enter) return false;
  // Some browsers and embedded views never settle the request; after a short
  // wait the caller falls back to enlarging the player inside the page.
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), 700));
  try { return await Promise.race([Promise.resolve(enter.call(element)).then(() => true), timeout]); } catch { return false; }
}
