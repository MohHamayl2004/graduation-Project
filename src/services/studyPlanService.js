import { apiRequest } from "./api.js";

export const listStudyPlans = (token, { signal } = {}) => apiRequest("/study-plan/plans", {
  signal, headers: { Authorization: `Bearer ${token}` }
});

export const studyPlanService = { list: listStudyPlans };
