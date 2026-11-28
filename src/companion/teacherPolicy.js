import { normalizeVoiceInput } from "./voiceNavigation.js";

export const TEACHER_LESSONS_ROUTE = "/lectures?subject=math";
export const canTeacherNavigate = (to) => to === TEACHER_LESSONS_ROUTE;

// Voice settings are capability switches, never authorization for an utterance.
export function isSpeechRequest(text) {
  if (typeof text !== "string" || text.length > 2000) return false;
  if (/[«»"“”]/.test(text)) return false;
  const core = normalizeVoiceInput(text).replace(/^(?:(?:يا )?(?:نبراس|معلم|استاذ|المعلم) |(?:hey )?(?:nebras|nipras|teacher) |please |(?:can|could|would) you |من فضلك |لو سمحت |ممكن )+/g, "");
  return /^(?:explain(?:\s|$)|read (?:(?:this|that|it|the answer) )?(?:aloud|out loud)|read (?:the |this )?question$|repeat(?:\s|$)|say that again$|(?:اشرح|تشرح)(?:لي| لي)?(?:\s|$)|وضح(?:لي| لي)?(?:\s|$)|فهمني(?:\s|$)|اقرا(?:لي| لي)?(?:\s|$)|عيد(?:\s|$)|اعد(?:\s|$)|كرر(?:\s|$))/.test(core);
}

export class SpeechAuthorization {
  constructor(messages = []) { this.revoke(messages); }
  revoke(messages = []) {
    this.userId = [...messages].reverse().find(m => m.role === "user")?.id;
    this.authorized = false;
    this.pending = null;
  }
  observe(messages) {
    const userIndex = messages.findLastIndex(m => m.role === "user");
    const user = messages[userIndex];
    if (!user) return null;
    if (user.id !== this.userId) {
      this.userId = user.id;
      this.authorized = isSpeechRequest(user.content);
      this.pending = null;
    }
    const message = messages.at(-1);
    if (messages.length - 1 <= userIndex || message?.role !== "assistant") return null;
    // The streaming API replaces a local assistant ID with its server ID.
    if (message.status === "streaming" && this.authorized) this.pending = user.id;
    if (message.status !== "complete" || !message.content || this.pending !== user.id || !this.authorized) return null;
    this.authorized = false;
    this.pending = null;
    return message;
  }
}
