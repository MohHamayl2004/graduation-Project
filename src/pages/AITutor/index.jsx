import Sidebar from "../../components/layout/Sidebar";
import { useTutorCompanion } from '../../companion/TutorCompanionContext.jsx';
import ChatHistoryPanel from "./components/ChatHistoryPanel";
import MainChat from "./MainChat";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./tutor.css";
import "./left-panel.css";

export default function AITutor() {
  const { chat, character } = useTutorCompanion();
  const { state, signedIn, openChat, newChat, removeChat } = chat;
  const [historyOpen, setHistoryOpen] = useState(() => window.matchMedia("(min-width:1280px)").matches);
  const [draft, setDraft] = useState("");
  const location = useLocation();
  useEffect(() => { if (typeof location.state?.lessonQuestion === "string") setDraft(location.state.lessonQuestion); }, [location.state?.lessonQuestion]);
  const [submitting, setSubmitting] = useState(false);
  const send = async (text) => {
    if (!text.trim() || submitting || state.phase === "streaming") return;
    setSubmitting(true);
    try { await chat.send(text); } finally { setSubmitting(false); }
  };
  const root = useRef(null);
  const composer = useRef(null);
  const closePanel = useCallback(() => { if (!window.matchMedia("(min-width:1280px)").matches) setHistoryOpen(false); }, []);

  useEffect(() => {
    const element = composer.current?.closest(".chat-composer");
    if (!element) return;
    const measure = () => root.current?.style.setProperty("--tutor-composer-space", `${Math.max(0, window.innerHeight - element.getBoundingClientRect().top) + 8}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); window.visualViewport?.removeEventListener("resize", measure); };
  }, [signedIn]);

  return (
    <div ref={root} className="app-screen tutor-screen bg-surface text-ink" data-left-sidebar-open={historyOpen} dir="rtl">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="aiTutor" />
        <MainChat speech={character} chat={{ ...chat, send, stop: () => { character.interrupt(); chat.stop(); } }} onHistory={() => setHistoryOpen(true)} historyOpen={historyOpen} draft={draft} onDraftChange={setDraft} composerRef={composer} />
        {signedIn && (
          <ChatHistoryPanel
            chats={state.chats}
            activeId={state.chatId}
            busy={state.phase === "streaming"}
            isOpen={historyOpen}
            onToggle={() => setHistoryOpen((open) => !open)}
            onModeChange={setHistoryOpen}
            onClose={closePanel}
            onOpen={(id) => { openChat(id); closePanel(); }}
            onNew={() => { newChat(); closePanel(); }}
            onDelete={removeChat}
          />
        )}
      </div>
    </div>
  );
}
