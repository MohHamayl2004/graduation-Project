import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Clock3, LogIn, MessageSquarePlus } from "lucide-react";
import { useTutorChat } from "../../hooks/useTutorChat";
import AssistantMessage from "../AITutor/components/AssistantMessage";
import Composer from "../AITutor/components/Composer";
import MathText from "../AITutor/components/MathText";
import { toArabicDigits } from "../AITutor/chatState";
import "../AITutor/tutor.css";
import "./lessonTutor.css";

const clock = (seconds) => toArabicDigits(`${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`);

// Questions a student watching this lesson is likely to have.
const SUGGESTIONS = {
  "1-1": ["ليش متوسط التغير بيعتمد على البداية والنهاية بس؟", "شو يعني Δس و Δص؟", "اشرحلي مثال الفيديو خطوة خطوة", "شو معنى إنه متوسط التغير طلع سالب؟"]
};

// The AI tutor beside a lesson video. A question can carry the minute of the
// video the student is at, so the tutor knows which part they mean; typing
// pauses the video so nothing is missed while they ask.
export default function LessonTutor({ lesson, videoRef }) {
  const chat = useTutorChat({ autoOpen: false, title: `فيديو: ${lesson.title}` });
  const { state, signedIn, stop, newChat } = chat;
  const [draft, setDraft] = useState("");
  const [atMinute, setAtMinute] = useState(true);
  const [now, setNow] = useState(0);
  const list = useRef(null);
  const busy = state.phase === "streaming";

  // Follow the video's time for the "at this minute" chip.
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return undefined;
    const tick = () => setNow(video.currentTime || 0);
    video.addEventListener("timeupdate", tick);
    return () => video.removeEventListener("timeupdate", tick);
  }, [videoRef]);

  useEffect(() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight; }, [state.messages]);

  const pauseVideo = () => { const video = videoRef?.current; if (video && !video.paused) video.pause(); };
  const send = async (text) => {
    if (!text.trim() || busy) return;
    const where = atMinute && videoRef?.current ? `عند الدقيقة ${clock(videoRef.current.currentTime)} من فيديو «${lesson.title}»: ` : `عن فيديو «${lesson.title}»: `;
    await chat.send(where + text.trim());
  };

  return <aside className="tutor-screen lesson-tutor" aria-label="المعلّم الذكي">
    <header className="lesson-tutor-head">
      <span className="lesson-tutor-icon"><Bot size={18} /></span>
      <div className="min-w-0 flex-1"><h2>اسأل المعلّم الذكي</h2><p>عن أي إشي بالفيديو، وبجاوبك من كتابك</p></div>
      {signedIn && state.messages.length > 0 && <button type="button" onClick={newChat} disabled={busy} className="lesson-tutor-new" aria-label="محادثة جديدة" title="محادثة جديدة"><MessageSquarePlus size={17} /></button>}
    </header>
    {!signedIn ? <div className="lesson-tutor-empty">
      <p>سجّل دخولك عشان تسأل المعلّم الذكي.</p>
      <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold"><LogIn size={16} className="rtl:-scale-x-100" />تسجيل الدخول</Link>
    </div> : <>
      <div ref={list} className="lesson-tutor-messages" aria-live="polite" tabIndex={0} aria-label="محادثة المعلّم الذكي">
        {state.messages.length === 0 ? <div className="lesson-tutor-empty">
          <p>وقّف عند أي فكرة مش واضحة واسأل.</p>
          <div className="lesson-tutor-suggestions">{(SUGGESTIONS[lesson.code] || []).map((q) => <button key={q} type="button" disabled={busy} onClick={() => { pauseVideo(); send(q); }}>{q}</button>)}</div>
        </div> : state.messages.map((m) => m.role === "user"
          ? <div key={m.id} dir="auto" className="tutor-user-message lesson-tutor-user"><MathText text={m.content} /></div>
          : <AssistantMessage key={m.id} message={m} />)}
      </div>
      {state.error && <p className="lesson-tutor-error" role="alert">{state.error}</p>}
      {videoRef && <label className="lesson-tutor-minute"><input type="checkbox" checked={atMinute} onChange={(e) => setAtMinute(e.target.checked)} /><Clock3 size={14} />اربط سؤالي باللحظة الحالية ({clock(now)})</label>}
      <div onFocusCapture={pauseVideo} className="lesson-tutor-composer">
        <Composer text={draft} onTextChange={setDraft} busy={busy} onSend={send} onStop={stop} showStarters={false} />
      </div>
    </>}
  </aside>;
}
