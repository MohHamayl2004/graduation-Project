import { apiRequest } from "./api.js";
const request = (token, path, options = {}) =>
  apiRequest(`/math-unit${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}` },
  });
export const getUnitLessons = (token, signal) =>
  request(token, "/lessons", { signal });
export const getUnitLesson = (token, code, signal) =>
  request(token, `/lessons/${encodeURIComponent(code)}`, { signal });
export const getUnitProgress = (token, code, signal) =>
  request(token, `/lessons/${encodeURIComponent(code)}/progress`, { signal });
export const saveUnitStep = (token, code, page) =>
  request(token, `/lessons/${encodeURIComponent(code)}/progress`, {
    method: "PUT",
    body: JSON.stringify({ page }),
  });
export const submitUnitAnswer = (token, code, activityId, answer) =>
  request(token, `/lessons/${encodeURIComponent(code)}/attempts`, {
    method: "POST",
    body: JSON.stringify({ activityId, answer }),
  });
export const getUnitAssessment = (token, signal) =>
  request(token, "/assessment", { signal });
export const submitUnitAssessment = (token, answers) =>
  request(token, "/assessment", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
