// Reading order. Original PDF coordinates stay independent of inserted leaves.
export const lesson11Leaves = [
  { id: 'text-4', kind: 'original', pdfPage: 1, label: 'الكتاب · ص ٤' },
  { id: 'meaning', kind: 'meaning', pdfPage: 1, label: 'نفهم متوسط التغير' },
  { id: 'text-5', kind: 'original', pdfPage: 2, label: 'الكتاب · ص ٥' },
  { id: 'secant', kind: 'graph', pdfPage: 2, label: 'مختبر القاطع' },
  { id: 'text-6', kind: 'original', pdfPage: 3, label: 'الكتاب · ص ٦' },
  { id: 'practice', kind: 'exercise', pdfPage: 1, label: 'نحل مثال ١ خطوة خطوة' },
  { id: 'text-7', kind: 'original', pdfPage: 4, label: 'الكتاب · ص ٧' },
  { id: 'connection', kind: 'connection', pdfPage: 1, label: 'من الفترة إلى هـ' },
  { id: 'text-8', kind: 'original', pdfPage: 5, label: 'الكتاب · ص ٨' },
  { id: 'review', kind: 'review', pdfPage: 1, label: 'مراجعة الفكرة' },
];
export const leafIndex = id => lesson11Leaves.findIndex(page => page.id === id);
export const enginePage = logical => lesson11Leaves.length - 1 - logical;
export function logicalPage(engine, portrait) {
  return Math.max(0, lesson11Leaves.length - 1 - engine - (portrait ? 0 : 1));
}
export function restoredLeaf(progress) {
  const index = leafIndex(progress?.bookLeaf);
  return index >= 0 ? index : Math.max(0, lesson11Leaves.findIndex(page => page.kind === 'original' && page.pdfPage === progress?.lastPage));
}

// Keep the two-page book proportions while using available stage width and height.
export function fitBookStage(width, height) {
  const safeWidth = Math.max(1, width), safeHeight = Math.max(1, height);
  const portrait = safeWidth < 680;
  if (portrait) {
    const pageWidth = Math.min(safeWidth, safeHeight * 480 / 690);
    return { width: pageWidth, height: pageWidth * 690 / 480, portrait: true };
  }
  const minRatio = 480 / 690, maxRatio = 0.88;
  const bookHeight = Math.min(safeHeight, (safeWidth / 2) / minRatio);
  const pageWidth = Math.min(safeWidth / 2, bookHeight * maxRatio);
  return { width: pageWidth * 2, height: bookHeight, portrait: false };
}
