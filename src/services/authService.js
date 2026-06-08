import { apiRequest } from "./api";

export const register = (payload) =>
  apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const login = (payload) =>
  apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getMe = (token) =>
  apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
