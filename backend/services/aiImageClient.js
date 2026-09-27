const IMAGE_SERVICE_URL = process.env.IMAGE_SERVICE_URL || "http://127.0.0.1:8001";
const IMAGE_SERVICE_TIMEOUT_MS = Number(process.env.IMAGE_SERVICE_TIMEOUT_MS || 600000);

export async function generateImage(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${IMAGE_SERVICE_URL}/v1/images/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body?.detail?.message || "Image service request failed");
      error.status = response.status;
      error.detail = body.detail;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

