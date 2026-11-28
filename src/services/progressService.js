import { apiRequest } from "./api.js";

export const getProgressOverview = (token, days, { signal } = {}) => apiRequest(`/progress/overview?days=${encodeURIComponent(days)}`, {
  headers: { Authorization: `Bearer ${token}` }, signal
});
// The API grades the answer itself; only the first answer to each question counts.
export const recordCheckpoint = (token, { interactiveId, checkpointId, choiceId, atSeconds }) => apiRequest("/progress/checkpoints", {
  method: "POST", headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ interactiveId, checkpointId, choiceId, atSeconds })
});
export const getMastery = (token, { signal } = {}) => apiRequest("/progress/mastery", { headers: { Authorization: `Bearer ${token}` }, signal });
// A finished quiz: the API grades it from the quiz file and keeps the result.
export const saveQuizResult = (token, quizId, answers) => apiRequest("/progress/quiz-results", {
  method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ quizId, answers })
});
export const progressService = { overview: getProgressOverview, recordCheckpoint, mastery: getMastery, saveQuizResult };
