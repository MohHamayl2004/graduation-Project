import { API_BASE_URL, apiError, apiRequest } from "./api";
import { readNdjson } from "../utils/ndjson";

const auth = (token) => ({ Authorization: `Bearer ${token}` });

export const listChats = (token) => apiRequest("/tutor/chats", { headers: auth(token) });

export const getChat = (token, chatId) => apiRequest(`/tutor/chats/${encodeURIComponent(chatId)}`, { headers: auth(token) });

export const createChat = (token, title) => apiRequest("/tutor/chats", { method: "POST", headers: auth(token), body: JSON.stringify(title ? { title } : {}) });

export const deleteChat = async (token, chatId) => {
  const response = await fetch(`${API_BASE_URL}/tutor/chats/${encodeURIComponent(chatId)}`, { method: "DELETE", headers: auth(token) });
  if (!response.ok) throw apiError(response.status, await response.json().catch(() => null));
};

// Sends one question and calls onEvent for every contract-v1 event
// (meta, sources, calculation, delta, done | error) as it arrives.
// Resolves when the stream ends; rejects with { status, code } when the API
// refuses before streaming (401, 404, 409 TUTOR_BUSY, 503 AI_UNAVAILABLE).
export async function streamMessage(token, chatId, content, { signal, onEvent }) {
  const response = await fetch(`${API_BASE_URL}/tutor/chats/${encodeURIComponent(chatId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth(token) },
    body: JSON.stringify({ content }),
    signal
  });

  if (!response.ok || !response.body) throw apiError(response.status, await response.json().catch(() => null));

  let terminal = false;
  for await (const event of readNdjson(response.body)) {
    if (event.type === "done" || event.type === "error") terminal = true;
    onEvent(event);
  }
  return { terminal };
}
