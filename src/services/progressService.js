import { apiRequest } from "./api.js";

export const getProgressOverview = (token, days, { signal } = {}) => apiRequest(`/progress/overview?days=${encodeURIComponent(days)}`, {
  headers: { Authorization: `Bearer ${token}` }, signal
});
export const progressService = { overview: getProgressOverview };
