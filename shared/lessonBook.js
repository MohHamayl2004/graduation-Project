export const lessonBooks = [
  { id: '1-1', title: 'متوسط التغير', pageCount: 5, printedStart: 4, pdf: 'books/NIPRAS_math_lesson_1-1.pdf' },
  { id: '1-2', title: 'قواعد الاشتقاق', pageCount: 10, printedStart: 9, pdf: 'books/NIPRAS_math_lesson_1-2.pdf' },
  { id: '1-3', title: 'مشتقات الاقترانات المثلثية', pageCount: 3, printedStart: 19, pdf: 'books/NIPRAS_math_lesson_1-3.pdf' },
];

// Manual check against lesson 1-1 PDF, local page 1 / printed page 4.
// Extracted JSON incorrectly states x²−3x+3; the PDF and reviewed page 008
// give x³−5x+3. Both agree on the two endpoints, so endpoints alone are insufficient.
export const exampleOne = {
  lessonId: '1-1', activityId: 'example-1-rate', printedPage: 4,
  originalPdfPage: 8, localPdfPage: 1,
  sourceJsonPath: 'data/processed/math_page008.json',
  extractedJsonPath: 'data/extracted/lesson_1_1_rate_of_change_verified.json',
  sourceRevision: 'c2e87bb',
  correction: 'PDF: س³ − ٥س + ٣؛ الاستخراج الخام: س² − ٣س + ٣',
  verifiedFrom: 'NIPRAS_math_lesson_1-1.pdf, page 1, example 1',
};

export function lessonPage(id, localPdfPage) {
  const book = lessonBooks.find(item => item.id === id);
  if (!book || !Number.isInteger(localPdfPage) || localPdfPage < 1 || localPdfPage > book.pageCount) return null;
  const printedPage = book.printedStart + localPdfPage - 1;
  const originalPdfPage = printedPage + 4;
  return { lessonId: id, localPdfPage, printedPage, originalPdfPage,
    sourceJsonPath: `data/processed/math_page${String(originalPdfPage).padStart(3, '0')}.json`,
    activityId: id === '1-1' ? ({ 1: 'example-1-rate', 2: 'secant-geometry' }[localPdfPage] || null) : null,
    interactionType: id === '1-1' ? ({ 1: 'secant-and-answer', 2: 'secant-graph' }[localPdfPage] || null) : null };
}

export const exampleFunction = x => x ** 3 - 5 * x + 3;
export function bookTutorQuestion(lessonId, localPage) {
  if (lessonId !== '1-1') return null;
  if (localPage === 1) return 'اشرح مثال ١ من الدرس 1-1، الصفحة المطبوعة ٤ (صفحة PDF الأصلية ٨): ق(س) = س³ − ٥س + ٣، أوجد متوسط التغير عندما تتغير س من −١ إلى ٢.';
  if (localPage === 2) return 'اشرح المعنى الهندسي لمتوسط التغير في الدرس 1-1، الصفحة المطبوعة ٥ (صفحة PDF الأصلية ٩)، باستخدام ق(س) = س³ − ٥س + ٣ من مثال الصفحة المطبوعة ٤.';
  return null;
}
export function rateOfChange(x1, x2) {
  const y1 = exampleFunction(x1), y2 = exampleFunction(x2);
  const dx = x2 - x1, dy = y2 - y1;
  return { x1, x2, y1, y2, dx, dy, rate: dx === 0 ? null : dy / dx };
}

export function evaluateBookAnswer(lessonId, activityId, input) {
  if (lessonId !== '1-1' || activityId !== 'example-1-rate' || typeof input !== 'string' || input.length > 40) return null;
  const digits = '٠١٢٣٤٥٦٧٨٩';
  const normalized = input.trim().replace(/[٠-٩]/g, char => String(digits.indexOf(char))).replace(/[−–]/g, '-').replace('٫', '.');
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  return Number(normalized) === -2;
}
