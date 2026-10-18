import { ApiError } from "../errors/ApiError.js";
import { varkQuestions, VARK_VERSION, scoreVark } from "../../shared/varkQuestionnaire.js";
export function validateAssessment(payload = {}) {
  const { answers, cursor, complete } = payload;
  const invalid = () => { throw new ApiError(400, "VALIDATION_ERROR", "راجع إجابات الاستبيان وحاول مرة ثانية"); };
  if (payload.version !== VARK_VERSION || !Array.isArray(answers) || answers.length !== varkQuestions.length) invalid();
  if (!Number.isInteger(cursor) || cursor < 0 || cursor >= varkQuestions.length || typeof complete !== "boolean") invalid();
  for (const choices of answers) {
    if (!Array.isArray(choices) || choices.length > 4 || new Set(choices).size !== choices.length || choices.some((c) => !["a", "b", "c", "d"].includes(c))) invalid();
  }
  if (complete && !answers.some((choices) => choices.length)) throw new ApiError(400, "EMPTY_ASSESSMENT", "اختر إجابة واحدة على الأقل قبل إنهاء الاستبيان");
  return { version: VARK_VERSION, answers, cursor, scores: scoreVark(answers), completedAt: complete ? new Date() : null };
}
