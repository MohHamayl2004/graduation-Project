import { ApiError } from "../errors/ApiError.js";
import { TutorResponseDecoder, GESTURES, EMOTIONS } from "./tutorGestures.js";

// The tutor on Google Gemini, behind the same contract-v1 stream as the other
// providers, so the chat, the saved messages and the 3D teacher work unchanged.
//
//   AI_SERVICE_PROVIDER=gemini
//   GEMINI_API_KEY=...            (never in the code; set it on the server)
//   GEMINI_MODEL=gemini-flash-lite-latest
//
// The rules are the main tutor's (Nipras_Ai_Models/rag/tutor.py BASE_RULES and
// STEPS_HINT). Gemini is not connected to the book index, so it is told not to
// claim pages or verified calculations, and every answer is marked NO_BOOK_RETRIEVAL.

const unavailable = () => new ApiError(503, "AI_UNAVAILABLE", "المعلم الذكي غير متاح الآن. حاول بعد قليل.");
const REFUSAL = "ما بقدر أجاوب على هاد السؤال. جرّب تسأله بطريقة ثانية أو عن موضوع من دروسك.";

export const GEMINI_RULES = `أنت معلّم نبراس لطلبة التوجيهي في فلسطين، وأغلب أسئلتهم من الرياضيات (الوحدة الأولى: حساب التفاضل) ومن باقي مواد التوجيهي.

قواعد ملزمة:
- أجب بالعربية، بوضوح وباختصار (نحو ١٥٠ كلمة أو أقل).
- اكتب جوابك سطوراً قصيرة مرقّمة (١، ٢، ٣ ...)، كل سطر خطوة أو فكرة واحدة، وابدأ كل خطوة بسطر جديد. إن كان للسؤال جواب نهائي، اختم بسطر يبدأ بـ«الجواب:».
- اكتب الرموز كما في المنهاج الفلسطيني: ق(س)، س، ص، ق′(س)، Δس، Δص، جا، جتا، هـ^س، لوهـ. لا تستعمل f(x) ولا x ولا LaTeX ولا علامة $.
- حلّ التمارين بطريقة الكتاب المدرسي، وتحقّق من كل حساب قبل كتابته. لا تكتب رقماً لا يأتي من سؤال الطالب أو من خطوات الحل.
- أنت غير متصل بفهرس الكتاب في هذه الجلسة: لا تدّعِ الرجوع إلى صفحة أو مثال محدد من الكتاب، ولا تقل إن الحساب «متحقق منه بالحاسوب».
- إذا كان السؤال خارج الدراسة أو لا تعرف جوابه، قل ذلك بوضوح ولا تخمّن.
- لا تعرض تفكيرك الداخلي.`;

// The answer comes back as JSON with the text first, so the chat can stream the
// text while the 3D teacher gets a gesture and an emotion at the end.
export const geminiResponseSchema = {
  type: "OBJECT",
  properties: { text: { type: "STRING" }, gesture: { type: "STRING", enum: [...GESTURES] }, emotion: { type: "STRING", enum: [...EMOTIONS] } },
  required: ["text", "gesture", "emotion"],
  propertyOrdering: ["text", "gesture", "emotion"]
};

export function contentsFor(question, history = []) {
  const recent = []; let remaining = 5000;
  for (const turn of history.slice(-10).reverse()) {
    if (!["user", "assistant"].includes(turn.role) || typeof turn.content !== "string") continue;
    if (turn.content.length > remaining) break; // whole recent turns, never half an answer
    recent.unshift({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] }); remaining -= turn.content.length;
  }
  return [...recent, { role: "user", parts: [{ text: question }] }];
}

async function* sseData(body) {
  const reader = body.getReader(), decoder = new TextDecoder(); let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 256 * 1024) throw new Error("Gemini stream frame exceeds limit");
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end).trimEnd(); buffer = buffer.slice(end + 1);
        if (line.startsWith("data:")) yield line.slice(5).trimStart();
      }
      if (done) { if (buffer.startsWith("data:")) yield buffer.slice(5).trim(); return; }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function openGeminiTutorStream({ question, history = [], signal, config, fetchImpl = globalThis.fetch }) {
  if (!config?.geminiKey) throw new ApiError(503, "AI_MISCONFIGURED", "المعلم الذكي غير معد على الخادم.");
  const model = config.geminiModel || "gemini-flash-lite-latest", started = Date.now();
  let response;
  try {
    response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: GEMINI_RULES }] },
        contents: contentsFor(question, history),
        generationConfig: { responseMimeType: "application/json", responseSchema: geminiResponseSchema, temperature: 0.4, maxOutputTokens: 1024 }
      })
    });
  } catch (error) { if (signal?.aborted) throw error; throw unavailable(); }
  if (!response.ok || !response.body) { await response.body?.cancel().catch(() => {}); throw unavailable(); }
  return (async function* () {
    yield { type: "meta", model };
    const decoder = new TutorResponseDecoder();
    let answer = "", reason = null, blocked = false;
    for await (const line of sseData(response.body)) {
      if (!line) continue;
      const data = JSON.parse(line);
      if (data.error) throw new Error("Gemini generation failed");
      if (data.promptFeedback?.blockReason) { blocked = true; break; }
      const candidate = data.candidates?.[0];
      for (const part of candidate?.content?.parts || []) {
        if (typeof part.text !== "string" || part.thought) continue;
        const visible = decoder.push(part.text);
        answer += visible;
        if (visible) yield { type: "delta", text: visible };
      }
      if (candidate?.finishReason) reason = candidate.finishReason;
    }
    if (blocked || ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"].includes(reason)) {
      if (!answer) yield { type: "delta", text: REFUSAL };
      yield { type: "done", answer: answer || REFUSAL, gesture: "NEUTRAL", emotion: "supportive", found: false, refused: true, warnings: ["NO_BOOK_RETRIEVAL"], checks: null, seconds: (Date.now() - started) / 1000 };
      return;
    }
    if (!reason || !answer.trim()) throw new Error("Gemini stream incomplete");
    yield { type: "done", answer, ...decoder.metadata(), found: false, refused: false, warnings: ["NO_BOOK_RETRIEVAL", ...(reason === "MAX_TOKENS" ? ["OUTPUT_LIMIT"] : [])], checks: null, seconds: (Date.now() - started) / 1000 };
  })();
}
