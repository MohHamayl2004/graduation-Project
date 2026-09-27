// The AI Tutor chat as plain data: every change is a pure function, so what
// the student sees for each stream event is testable without a browser.
// Contract: docs/contracts/tutor-stream-v1.md

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const toArabicDigits = (value) => String(value ?? "").replace(/[0-9]/g, (d) => ARABIC_DIGITS[d]);

// "الدرس ١-٢ · صفحة ١٦–١٧"  /  "دليل الحلول · صفحة ٨"
export function sourceLabel(source) {
  const pages = [...new Set((source.pages || []).filter((p) => p != null))].sort((a, b) => a - b);
  const pageText = pages.length === 0 ? "" : pages.length === 1 ? `صفحة ${toArabicDigits(pages[0])}` : `صفحة ${toArabicDigits(pages[0])}–${toArabicDigits(pages.at(-1))}`;
  const where = source.document === "solutions" ? "دليل الحلول" : source.lesson ? `الدرس ${toArabicDigits(source.lesson)}` : "الكتاب";
  return pageText ? `${where} · ${pageText}` : where;
}

export const STARTER_PROMPTS = [
  "شو يعني متوسط التغير للاقتران؟",
  "بدي مشتقة ق(س) = (س^٢ + ١)(٣س − ٢) عند س = ١",
  "متى بقدر أستخدم قاعدة لوبيتال؟",
  "كرة ارتفاعها ف(ن) = ٤٠ن − ٥ن^٢، شو أقصى ارتفاع بتوصله؟"
];

export const initialChatState = { chats: [], chatId: null, messages: [], phase: "idle", error: null };

export const fromServerMessage = (m) => ({
  id: m.id,
  role: m.role,
  content: m.content || "",
  status: m.status || "complete",
  sources: m.sources || [],
  calculation: m.calculation?.answer ? { answer: m.calculation.answer, facts: m.calculation.facts || [] } : null,
  errorMessage: null
});

// One stream event applied to the assistant message being written.
export function applyStreamEvent(message, event) {
  switch (event?.type) {
    case "meta":
      return event.messageId ? { ...message, id: event.messageId } : message;
    case "sources":
      return { ...message, sources: event.items || [] };
    case "calculation":
      // The facts are the book's own steps, already verified: they are
      // shown as the worked solution beside the model's explanation.
      return { ...message, calculation: { answer: event.answer, facts: event.facts || [] } };
    case "delta":
      return { ...message, content: message.content + (event.text || "") };
    case "done":
      return { ...message, content: event.answer ?? message.content, status: event.refused ? "refused" : "complete" };
    case "error":
      return { ...message, status: message.content ? "interrupted" : "failed", errorMessage: event.message || "صار خطأ، حاول مرة ثانية" };
    default:
      return message; // v1 readers ignore event types they do not know
  }
}

const updateLast = (messages, change) => messages.map((m, i) => (i === messages.length - 1 ? change(m) : m));

export function chatReducer(state, action) {
  switch (action.type) {
    case "chatsLoaded":
      return { ...state, chats: action.chats };
    case "chatOpened":
      return { ...state, chatId: action.chat.id, messages: (action.chat.messages || []).map(fromServerMessage), phase: "idle", error: null };
    case "chatCreated":
      return { ...state, chatId: action.chat.id, messages: [], chats: [action.chat, ...state.chats.filter((c) => c.id !== action.chat.id)], phase: "idle", error: null };
    case "chatRemoved": {
      const chats = state.chats.filter((c) => c.id !== action.chatId);
      return state.chatId === action.chatId ? { ...state, chats, chatId: null, messages: [] } : { ...state, chats };
    }
    case "questionSent":
      return {
        ...state,
        phase: "streaming",
        error: null,
        messages: [
          ...state.messages,
          { id: action.userId, role: "user", content: action.content, status: "complete", sources: [], calculation: null, errorMessage: null },
          { id: action.assistantId, role: "assistant", content: "", status: "streaming", sources: [], calculation: null, errorMessage: null }
        ],
        chats: state.chats.map((c) => (c.id === state.chatId && (!c.title || c.title === "محادثة جديدة") ? { ...c, title: action.content.slice(0, 60) } : c))
      };
    case "streamEvent": {
      const messages = updateLast(state.messages, (m) => applyStreamEvent(m, action.event));
      const finished = action.event.type === "done" || action.event.type === "error";
      return { ...state, messages, phase: finished ? "idle" : state.phase };
    }
    case "streamFailed":
      // The request itself failed (503 before streaming, network down) or
      // the stream ended without a terminal event.
      return {
        ...state,
        phase: "idle",
        messages: updateLast(state.messages, (m) =>
          m.role === "assistant" && m.status === "streaming"
            ? { ...m, status: m.content ? "interrupted" : "failed", errorMessage: action.message }
            : m
        )
      };
    case "stopped":
      return {
        ...state,
        phase: "idle",
        messages: updateLast(state.messages, (m) => (m.status === "streaming" ? { ...m, status: m.content ? "interrupted" : "failed", errorMessage: "أوقفت الجواب." } : m))
      };
    case "failed":
      return { ...state, phase: "idle", error: action.message };
    default:
      return state;
  }
}

// ============================================================
// Laying an answer out the way the book does
// ============================================================
// The tutor is asked for short numbered lines ("١) ...") ending
// with "الجواب: ...". The first live answers came back as one
// paragraph, so the layout is worked out here, from the text,
// instead of trusting the model to format itself.

const STEP_START = /^\s*(?:[١٢٣٤٥٦٧٨٩0-9]+\s*[).\-]|[-•*])\s*/;
const FINAL_ANSWER = /^\s*(?:الجواب|الإجابة|الناتج)\s*[:：]/;

export function layoutAnswer(text) {
  const blocks = [];
  for (const raw of String(text || "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (FINAL_ANSWER.test(line)) blocks.push({ kind: "final", text: line });
    else if (STEP_START.test(line)) blocks.push({ kind: "step", text: line.replace(STEP_START, "") });
    else blocks.push({ kind: "text", text: line });
  }
  return blocks;
}

// "ق′(س) = ٩س^٢ − ٤س + ٣" -> the exponent as a real superscript.
// ^(٣/٤) keeps its bracketed exponent; ^+ and ^- (one-sided
// derivatives) are left alone, they are not powers.
const POWER = /\^(\([^()]*\)|[٠-٩0-9]+)/g;

export function mathParts(text) {
  const parts = [];
  let last = 0;
  for (const match of String(text || "").matchAll(POWER)) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) });
    parts.push({ type: "sup", value: match[1].replace(/^\(|\)$/g, "") });
    last = match.index + match[0].length;
  }
  if (last < (text || "").length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
