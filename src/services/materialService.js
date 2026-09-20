import { API_BASE_URL, apiRequest } from "./api";

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

export const uploadMaterial = async (formData, token) => {
  const response = await fetch(`${API_BASE_URL}/materials/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "تعذّر رفع المادة، حاول مرة ثانية");
  }

  return data;
};
