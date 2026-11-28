import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTutorChat } from "../hooks/useTutorChat.js";
import { useTutorCharacter } from "../hooks/useTutorCharacter.js";
import { readSettings } from "./companionState.js";
import { matchVoiceCommand } from "./voiceNavigation.js";
import { useVoiceNavigation } from "./useVoiceNavigation.js";
const FloatingTeacher = lazy(() => import("./FloatingTeacher.jsx"));
const Context = createContext(null);
const storageKey = "nipras.companion.settings.v1";
// Pages that play a lesson video, where the floating teacher hides itself.
export const onVideoPage = (pathname = "") => /^\/(interactive|lectures\/videos)(\/|$)/.test(pathname);

export const useTutorCompanion = () => useContext(Context);
export function TutorCompanionProvider({ children }) {
  const { auth } = useAuth(),
    location = useLocation(),
    chat = useTutorChat();
  const [settings, setSettings] = useState(() => {
    try {
      return readSettings(localStorage.getItem(storageKey));
    } catch {
      return readSettings(null);
    }
  });
  const character = useTutorCharacter(chat.state, auth?.token, settings);
  const assessmentAnswer = useRef(null);
  const voiceNavigation = useVoiceNavigation({
    matchCommand: matchVoiceCommand,
    auth,
    settings,
    chat,
    character,
    assessmentAnswer,
  });
  const [menuRequest, setMenuRequest] = useState(0);
  const eligible =
    Boolean(auth?.user) &&
    /^\/(ai-tutor|dashboard|lectures|lesson|interactive|math-unit|study-plan|progress|quizzes|analysis)(\/|$)/.test(
      location.pathname,
    );
  const loaded = useRef(false);
  if (eligible) loaded.current = true;
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      /* Private mode may deny storage. */
    }
  }, [settings]);
  useEffect(() => {
    if (!auth?.token) character.interrupt();
  }, [auth?.token, character.interrupt]);
  useEffect(() => {
    const focus = () => {
      setSettings((s) => ({
        ...s,
        mode: s.mode === "hidden" ? "floating" : s.mode,
      }));
      setMenuRequest((n) => n + 1);
    };
    window.addEventListener("nipras:companion-menu", focus);
    return () => window.removeEventListener("nipras:companion-menu", focus);
  }, []);
  useEffect(() => {
    window.dispatchEvent(new Event("nipras:speech-stop"));
    assessmentAnswer.current = null;
  }, [location.key, location.pathname, location.search, character.interrupt]);
  const value = {
    assessmentAnswer,
    chat,
    character,
    settings,
    setSettings,
    token: auth?.token,
    eligible,
    menuRequest,
    voiceNavigation,
  };
  return (
    <Context.Provider value={value}>
      {children}
      {/* On a lesson video the companion beside the video takes over: the floating teacher steps aside. */}
      {auth?.user && loaded.current && !onVideoPage(location.pathname) && (
        <Suspense fallback={null}>
          <FloatingTeacher />
        </Suspense>
      )}
    </Context.Provider>
  );
}
