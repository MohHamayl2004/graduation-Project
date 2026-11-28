import { apiRequest } from "./api";


export const signup = (payload) =>
  apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const login = (payload) =>
  apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getMe = (token, options = {}) =>
  apiRequest("/auth/me", {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const updateAvatar = (avatarUrl,token) => apiRequest('/auth/me/avatar',{
  method:'PATCH',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({avatarUrl})
});

export const getWorkspaces = (token) => apiRequest("/workspaces", { headers: { Authorization: `Bearer ${token}` } });

export const joinSchool = (schoolCode, token) => apiRequest("/schools/join", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ schoolCode })
});
