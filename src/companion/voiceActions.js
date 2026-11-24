import { canTeacherNavigate } from "./teacherPolicy.js";
const unavailable = (message) => ({
  type: "unavailable",
  message:
    message ||
    "يمكن للمعلم فتح دروسي فقط. جرّب: افتح دروسي.",
});
export function planVoiceAction(
  command,
  { allowed = false, pathname = "", question = "" } = {},
) {
  if (!command || typeof command !== "object") return unavailable();
  if (command.type === "stop") return { type: "stop" };
  if (!allowed)
    return unavailable(
      "سجّل دخولك وتحقق من صلاحية اشتراكك لاستخدام هذا الأمر.",
    );
  if (command.type === "navigate")
    return canTeacherNavigate(command.to)
      ? { type: "navigate", to: command.to, confirmation: "سأفتح دروسي." }
      : unavailable();
  if (["back", "firstLesson", "nextLesson"].includes(command.type)) return unavailable();
  if (command.type === "repeat") return { type: "repeat" };
  if (command.type === "readQuestion" || command.type === "explainQuestion") {
    if (typeof question !== "string" || !question.trim())
      return unavailable(
        "اختر السؤال أو افتح المثال الذي تريد قراءته أو شرحه أولاً.",
      );
    const clean = question.trim().slice(0, 1600);
    return command.type === "readQuestion"
      ? { type: "speak", text: clean }
      : {
          type: "ask",
          question: `اشرح السؤال التالي من الصفحة الحالية ${pathname}:\n${clean}\nاستخدم مراجع الكتاب المتاحة ووضّح الخطوات دون اختراع معلومات ناقصة.`,
        };
  }
  return unavailable();
}

export function currentVoiceQuestion(document) {
  const focused = document.activeElement?.closest?.("[data-voice-question]");
  const candidates = focused
    ? [focused]
    : [...document.querySelectorAll("[data-voice-question]")];
  return (
    candidates
      .find(
        (el) =>
          !el.closest('[inert],[aria-hidden="true"]') &&
          el.getClientRects().length,
      )
      ?.getAttribute("data-voice-question") || ""
  );
}

export function extractWakeCommand(text, armedUntil = 0, now = Date.now()) {
  if (typeof text !== "string" || text.length > 2000)
    return { command: null, armedUntil: 0, heardWake: false };
  const normalized = text.replace(/[\u064b-\u065f\u0670ـ]/g, "").trim();
  const match = normalized.match(
    /^(?:يا\s+نبراس|(?:hey|hi)\s+(?:nebras|nibras|nipras))[\s،,:.!؟?-]*(.*)$/iu,
  );
  if (match) {
    const command = match[1].trim();
    return {
      command: command || null,
      armedUntil: command ? 0 : now + 15000,
      heardWake: true,
    };
  }
  return {
    command: armedUntil > now ? normalized || null : null,
    armedUntil: 0,
    heardWake: false,
  };
}
