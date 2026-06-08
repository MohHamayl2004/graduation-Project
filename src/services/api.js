const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (networkError) {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export { API_BASE_URL };
