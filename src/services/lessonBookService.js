import { apiRequest } from './api.js';

const headers = token => ({ Authorization: `Bearer ${token}` });
const url = id => `/lesson-books/${encodeURIComponent(id)}`;
export const getBookProgress = (token, id, signal) => apiRequest(`${url(id)}/progress`, { headers: headers(token), signal });
export const saveBookPage = (token, id, page) => apiRequest(`${url(id)}/progress`, { method: 'PUT', headers: headers(token), body: JSON.stringify({ page }) });
export const saveBookLeaf = (token, bookLeaf) => apiRequest(`${url('1-1')}/progress`, { method: 'PUT', headers: headers(token), body: JSON.stringify({ bookLeaf }) });
export const saveBookAttempt = (token, id, activityId, answer) => apiRequest(`${url(id)}/attempts`, { method: 'POST', headers: headers(token), body: JSON.stringify({ activityId, answer }) });
