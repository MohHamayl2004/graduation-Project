import { resolveApiBase } from "../../shared/apiBase.js";
// public/config.js wins over the build-time VITE_API_URL: the API's
// public address changes whenever the GPU server restarts, and editing
// one file on GitHub redeploys the site in a minute without a rebuild.
const RUNTIME_API_URL = typeof window === "undefined" ? undefined : window.NIPRAS_CONFIG?.apiUrl;
const API_BASE_URL = resolveApiBase(RUNTIME_API_URL || import.meta.env?.VITE_API_URL, typeof window === "undefined" ? "" : window.location.hostname);

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
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  }).catch((cause) => {
    if (cause.name === "AbortError") throw cause;
    const error = new Error("تعذر الاتصال بخادم نبراس. تأكد من تشغيل المشروع ثم حاول مرة ثانية.", { cause });
    error.code = "API_UNREACHABLE";
    throw error;
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw apiError(response.status, data);
  }

  return data;
}

export { API_BASE_URL };
