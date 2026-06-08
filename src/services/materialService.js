import { apiRequest } from "./api";

export const getMaterials = (token) =>
  apiRequest("/materials", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getMaterialById = (id, token) =>
  apiRequest(`/materials/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const uploadMaterial = (formData, token) =>
  apiRequest("/materials/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

export const deleteMaterial = (id, token) =>
  apiRequest(`/materials/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
