const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// An Error that keeps the API's stable `code` (e.g. TUTOR_BUSY) beside the
// Arabic message, so a caller can react to the case, not parse the text.
export function apiError(status, data) {
  const error = new Error(data?.message || "تعذّر إكمال الطلب، حاول مرة ثانية");
  error.status = status;
  error.code = data?.code;
  return error;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw apiError(response.status, data);
  }

  return data;
}

export { API_BASE_URL };
