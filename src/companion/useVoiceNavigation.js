import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { effectiveSubscription } from "../../shared/subscriptions.js";
import { canTeacherNavigate } from "./teacherPolicy.js";
import { planVoiceAction, currentVoiceQuestion } from "./voiceActions.js";

// Only allowlisted actions reach the router; model output never executes code.
export function useVoiceNavigation({
  matchCommand,
  auth,
  settings,
  chat,
  character,
  assessmentAnswer,
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    [notice, setNotice] = useState(""),
    latest = useRef();
  latest.current = {
    auth,
    settings,
    chat,
    character,
    pathname: location.pathname,
  };
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const handleText = useCallback(
    async (text) => {
      if (typeof text !== "string" || !text.trim() || text.length > 2000)
        return;
      const current = latest.current,
        command = matchCommand(text);
      if (!command) {
        if (
          /^(?:يا\s+نبراس[،,\s]*)?(?:افتح|انتقل|خذني|وديني|open\b|navigate\b)/i.test(
            text.trim(),
          )
        ) {
          setNotice("يمكن للمعلم فتح دروسي فقط. جرّب: افتح دروسي.");
          return;
        }
        if (assessmentAnswer.current) assessmentAnswer.current(text);
        else await current.chat.send(text);
        return;
      }
      const action = planVoiceAction(command, {
        allowed:
          Boolean(current.auth?.user) &&
          effectiveSubscription(current.auth.user).canAccess,
        pathname: current.pathname,
        question: currentVoiceQuestion(document),
      });
      if (action.type === "unavailable") {
        setNotice(action.message);
        return;
      }
      current.character.interrupt();
      if (action.type === "stop") {
        setNotice("توقف الصوت.");
        return;
      }
      if (action.type === "repeat") {
        current.character.playLatest();
        setNotice("أعيد الشرح السابق.");
        return;
      }
      if (action.type === "speak") {
        setNotice("أقرأ السؤال الحالي.");
        await current.character.speakText(action.text, "read aloud");
        return;
      }
      if (action.type === "ask") {
        await current.chat.send(action.question);
        return;
      }
      if (action.type === "navigate" && canTeacherNavigate(action.to)) {
        navigate(action.to);
        setNotice(action.confirmation);
      }
    },
    [matchCommand, navigate, assessmentAnswer],
  );
  return { handleText, notice };
}
