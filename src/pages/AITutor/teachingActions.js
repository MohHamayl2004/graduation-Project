// These short follow-ups use the existing tutor history and retrieval path.
export const explanationActions = [
  { id: 'simplify', label: 'اشرح بطريقة أبسط', prompt: 'اشرح بطريقة أبسط' },
  { id: 'solve', label: 'حل معي', prompt: 'حل معي خطوة بخطوة' },
  { id: 'example', label: 'أعطني مثالًا', prompt: 'أعطني مثالًا آخر من الدرس' },
  { id: 'practice', label: 'اختبرني', prompt: 'اختبرني بسؤال واحد ولا تذكر الحل', pending: true },
];

export function canOfferExplanationActions(message, isLatest) {
  return Boolean(isLatest && message?.role === 'assistant' && message.status === 'complete' && message.content?.trim() && Array.isArray(message.sources) && message.sources.length);
}
