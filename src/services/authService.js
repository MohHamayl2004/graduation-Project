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

export const getMe = (token) =>
  apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
