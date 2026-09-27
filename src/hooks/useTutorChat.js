import { useCallback, useEffect, useReducer, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { createChat, deleteChat, getChat, listChats, streamMessage } from "../services/tutorService";
import { chatReducer, initialChatState } from "../pages/AITutor/chatState";

const CUT_OFF = "انقطع الاتصال قبل أن يكتمل الجواب. حاول مرة ثانية.";

export function useTutorChat() {
  const { auth } = useAuth();
  const token = auth?.token;
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const controller = useRef(null);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    listChats(token)
      .then(async ({ chats }) => {
        if (cancelled) return;
        dispatch({ type: "chatsLoaded", chats });
        if (chats[0]) {
          const { chat } = await getChat(token, chats[0].id);
          if (!cancelled) dispatch({ type: "chatOpened", chat });
        }
      })
      .catch((error) => !cancelled && dispatch({ type: "failed", message: error.message }));
    return () => { cancelled = true; };
  }, [token]);

  // Leaving the page stops the answer (and, through the API, the model).
  useEffect(() => () => controller.current?.abort(), []);

  const openChat = useCallback(async (chatId) => {
    if (state.phase === "streaming") return;
    try {
      const { chat } = await getChat(token, chatId);
      dispatch({ type: "chatOpened", chat });
    } catch (error) {
      dispatch({ type: "failed", message: error.message });
    }
  }, [token, state.phase]);

  const newChat = useCallback(async () => {
    if (state.phase === "streaming") return null;
    try {
      const { chat } = await createChat(token);
      dispatch({ type: "chatCreated", chat });
      return chat.id;
    } catch (error) {
      dispatch({ type: "failed", message: error.message });
      return null;
    }
  }, [token, state.phase]);

  const removeChat = useCallback(async (chatId) => {
    try {
      await deleteChat(token, chatId);
      dispatch({ type: "chatRemoved", chatId });
    } catch (error) {
      dispatch({ type: "failed", message: error.message });
    }
  }, [token]);

  const send = useCallback(async (text) => {
    const content = text.trim();
    if (!content || state.phase === "streaming" || !token) return;

    let chatId = state.chatId;
    if (!chatId) {
      chatId = await newChat();
      if (!chatId) return;
    }

    const stamp = Date.now();
    dispatch({ type: "questionSent", content, userId: `local-user-${stamp}`, assistantId: `local-assistant-${stamp}` });

    controller.current = new AbortController();
    try {
      const { terminal } = await streamMessage(token, chatId, content, {
        signal: controller.current.signal,
        onEvent: (event) => dispatch({ type: "streamEvent", event })
      });
      if (!terminal) dispatch({ type: "streamFailed", message: CUT_OFF });
    } catch (error) {
      if (error.name === "AbortError") dispatch({ type: "stopped" });
      else dispatch({ type: "streamFailed", message: error.message || CUT_OFF });
    } finally {
      controller.current = null;
    }
  }, [token, state.chatId, state.phase, newChat]);

  const stop = useCallback(() => controller.current?.abort(), []);

  return { state, signedIn: Boolean(token), send, stop, openChat, newChat, removeChat };
}
