// Forward seeks must not silently bypass unanswered checkpoints.
export function dueCheckpoint(plan, time, duration = Infinity) {
  if (!plan || !Number.isFinite(time)) return null;
  return plan.questions.filter(q => q.at >= 0 && q.at <= time && q.at < duration &&
    !plan.results.some(r => r.questionId === q.id)).sort((a, b) => a.at - b.at)[0] || null;
}
export function persistAssessmentResult(plan, result) {
  return { ...plan, results: [...plan.results.filter(r => r.questionId !== result.questionId), result] };
}
