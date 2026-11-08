import { API_BASE_URL, apiRequest } from "./api.js";

export const getMaterials = async (token, { signal } = {}) => {
  const data = await apiRequest("/materials", {
    signal,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!Array.isArray(data?.materials) || !data.materials.every((material) => material && typeof material._id === "string" && typeof material.title === "string")) {
    throw new Error("تعذّر قراءة قائمة المواد من الخادم");
  }
  return data;
};

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
