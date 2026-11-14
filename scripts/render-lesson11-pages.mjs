// Lossless page content: rasterize the supplied PDF at high resolution and trim outer blank printer margins while preserving the exact PDF aspect ratio and all page content.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const { createCanvas } = await import('../.tmp-pdf-deps/node_modules/@napi-rs/canvas/index.js').catch(() => import('@napi-rs/canvas'));
const pdf = await getDocument({ data: new Uint8Array(await readFile('public/books/NIPRAS_math_lesson_1-1.pdf')) }).promise;
await mkdir('public/books/lesson-1-1', { recursive: true });
const cropLeft = 0.074, cropTop = 0.108, cropSpan = 0.846;
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const original = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: 2100 / original.width });
  const fullCanvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: fullCanvas.getContext('2d'), viewport }).promise;
  const sx = Math.floor(viewport.width * cropLeft);
  const sy = Math.floor(viewport.height * cropTop);
  const sw = Math.round(viewport.width * cropSpan);
  const sh = Math.round(viewport.height * cropSpan);
  const canvas = createCanvas(sw, sh);
  canvas.getContext('2d').drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  await writeFile(`public/books/lesson-1-1/page-${i + 3}.webp`, await canvas.encode('webp', 95));
}
await pdf.destroy();
console.log('Rendered the five original textbook pages (4–8).');
