import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, HelpCircle, BookOpen, LineChart, Volume2, MousePointerClick,
  CheckCircle2, XCircle, Activity, PartyPopper
} from "lucide-react";
import CurveChart from "./CurveChart";
import TutorHelper from "./TutorHelper";
import PlayerBar from "./PlayerBar";
import Reveal from "./Reveal";
import StudentBadge from "../../components/common/StudentBadge";
import { buildSlides, lesson } from "./slides";

const MODE_ICONS = { BookOpen, LineChart, Volume2, MousePointerClick };
const EVENT_LABELS = {
  mode_changed: "تغيير نمط العرض",
  help_requested: "طلب مساعدة",
  checkpoint_correct: "إجابة صحيحة",
  checkpoint_wrong: "الإجابة مش صحيحة",
  gap_selected: "تحديد نقطة التعثّر",
  gap_freeform: "سؤال إضافي",
  resolved: "تم توضيح الفكرة",
  escalated: "طلب شرح بديل"
};

export default function Lesson() {
  const navigate = useNavigate();
  const slides = useMemo(() => buildSlides(), []);

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState("next");
  const [mode, setMode] = useState("read");
  const [playing, setPlaying] = useState(false);
  const [helpStep, setHelpStep] = useState(null);
  const [answered, setAnswered] = useState(null);
  const [events, setEvents] = useState([]);
  const [showLog, setShowLog] = useState(false);
  const [usingTts, setUsingTts] = useState(false);

  const slide = slides[index];
  const playingRef = useRef(false);
  const audioRef = useRef(null);
  playingRef.current = playing;

  const record = useCallback((e) => {
    setEvents((prev) => [{ ...e, at: Date.now() }, ...prev].slice(0, 8));
  }, []);

  const stopSpeech = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  };

  const go = useCallback((next) => {
    setIndex((current) => {
      if (next < 0 || next >= slides.length || next === current) return current;
      setDir(next > current ? "next" : "prev");
      stopSpeech();
      setHelpStep(null);
      return next;
    });
  }, [slides.length]);

  // Narrate the slide, then move on — this is what makes it feel
  // like a video rather than a deck the student clicks through.
  //
  // A recorded file wins over speech synthesis whenever one exists.
  // If the file is missing (404, or simply not recorded yet) we fall
  // back to TTS rather than leaving the student in silence.
  useEffect(() => {
    if (!playing) { stopSpeech(); return; }

    const advance = () => {
      if (!playingRef.current) return;
      if (index < slides.length - 1) { setDir("next"); setIndex((i) => i + 1); }
      else setPlaying(false);
    };

    const speakFallback = () => {
      if (!("speechSynthesis" in window)) { setPlaying(false); return; }
      const u = new SpeechSynthesisUtterance(slide.speech || "");
      u.lang = "ar-SA";
      u.rate = 0.94;
      u.onend = advance;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    };

    let audio;

    if (slide.audio) {
      audio = new Audio(slide.audio);
      audioRef.current = audio;
      audio.onended = advance;
      audio.onerror = () => { audioRef.current = null; setUsingTts(true); speakFallback(); };
      audio.play().then(() => setUsingTts(false)).catch(() => {
        audioRef.current = null;
        setUsingTts(true);
        speakFallback();
      });
    } else {
      setUsingTts(true);
      speakFallback();
    }

    return () => {
      if (audio) { audio.pause(); audio.onended = null; audio.onerror = null; }
      audioRef.current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [playing, index, slide, slides.length]);

  useEffect(() => () => stopSpeech(), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") go(index + 1);
      if (e.key === "ArrowRight") go(index - 1);
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "Escape") setHelpStep(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  const touchX = useRef(0);

  // Tapping the stage flips the slide — the left half moves forward,
  // because in an RTL layout that is the direction the lesson runs.
  // Clicks on anything the student can actually operate are ignored.
  const onStageClick = (e) => {
    if (e.target.closest("button, a, input, label, aside, svg")) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    go(index + (e.clientX - left < width / 2 ? 1 : -1));
  };

  const answer = (opt) => {
    setAnswered(opt);
    record({ type: opt.correct ? "checkpoint_correct" : "checkpoint_wrong", option: opt.id });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-ink" dir="rtl">

      {/* ---------- thin header ---------- */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface-raised px-4 py-2.5 sm:px-6">
        <StudentBadge />
        <button type="button" onClick={() => navigate("/lectures")}
          className="grid h-9 w-9 place-items-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-surface-alt hover:text-ink"
          aria-label="خروج">
          <X size={18} />
        </button>

        <span className="rounded-md bg-primary-tint px-2 py-1 text-xs font-semibold text-primary">
          {lesson.code}
        </span>
        {playing && (
          <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${
            usingTts ? "bg-warning-tint text-warning" : "bg-accent-tint text-accent"
          }`}>
            {usingTts ? "صوت آلي" : "تسجيل"}
          </span>
        )}
        <h1 className="font-display text-lg font-semibold text-ink">{lesson.title}</h1>

        <div className="ms-auto flex items-center gap-1.5">
          {lesson.modes.map((m) => {
            const Icon = MODE_ICONS[m.icon];
            const on = mode === m.id;
            return (
              <button key={m.id} type="button" aria-pressed={on}
                onClick={() => { setMode(m.id); record({ type: "mode_changed", mode: m.id }); }}
                title={m.label}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-fast ${
                  on ? "border-primary bg-primary text-white"
                     : "border-border text-ink-muted hover:border-primary hover:text-primary"
                }`}>
                <Icon size={14} />
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => setShowLog((v) => !v)}
            aria-pressed={showLog} title="سجل النظام"
            className={`grid h-8 w-8 place-items-center rounded-md border transition-colors duration-fast ${
              showLog ? "border-accent bg-accent text-white" : "border-border text-ink-faint hover:text-ink"
            }`}>
            <Activity size={14} />
          </button>
        </div>
      </header>

      {/* ---------- stage ---------- */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full">
          <div
            className="flex min-w-0 flex-1 cursor-pointer select-none items-center justify-center overflow-y-auto px-5 py-8 sm:px-10"
            onClick={onStageClick}
            onTouchStart={(e) => { touchX.current = e.changedTouches[0].clientX; }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 50) go(index + (dx > 0 ? 1 : -1));
            }}
          >
            <div
              key={slide.id}
              className={`w-full max-w-3xl ${dir === "next" ? "animate-slide-next" : "animate-slide-prev"}`}
            >

              {slide.eyebrow && (
                <Reveal as="p" step={0}
                  className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent">
                  {slide.eyebrow}
                </Reveal>
              )}

              {slide.kind === "title" && (
                <div className="text-center">
                  <Reveal as="p" step={1} className="text-sm text-ink-muted">{lesson.subject} · الوحدة {lesson.unit}</Reveal>
                  <Reveal as="h2" step={2} className="mt-3 font-display text-5xl font-semibold text-ink">{lesson.title}</Reveal>
                  <Reveal as="p" step={4} className="mt-8 text-sm text-ink-muted">
                    استعمل <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">←</kbd> و
                    <kbd className="ms-1 rounded border border-border px-1.5 py-0.5 text-xs">→</kbd> للتنقل،
                    و<kbd className="mx-1 rounded border border-border px-1.5 py-0.5 text-xs">مسافة</kbd> للتشغيل
                  </Reveal>
                </div>
              )}

              {slide.kind === "definition" && (
                <div>
                  <div className="flex flex-col gap-3">
                    {slide.definition.body.map((line, i) => (
                      <Reveal as="p" key={line} step={i + 1}
                        className="font-arabic text-2xl leading-relaxed text-ink">{line}</Reveal>
                    ))}
                  </div>
                  <Reveal step={slide.definition.body.length + 1}
                    className="mt-6 overflow-x-auto rounded-lg bg-surface-alt px-6 py-6 text-center">
                    <p className="font-arabic text-2xl leading-loose text-ink" dir="ltr">
                      {slide.definition.formula}
                    </p>
                  </Reveal>
                </div>
              )}

              {slide.kind === "graph" && (
                <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
                  <Reveal step={1} className="rounded-lg border border-border bg-surface-raised p-4">
                    <CurveChart curve={slide.curve} />
                  </Reveal>
                  <div className="flex flex-col gap-3">
                    <Reveal as="p" step={2}
                      className="rounded-md bg-surface-alt px-4 py-3 font-arabic text-lg leading-relaxed text-ink">
                      {slide.curve.activity.worked}
                    </Reveal>
                    <Reveal as="p" step={3} className="font-arabic text-xl leading-relaxed text-ink">
                      {slide.curve.activity.prompt}
                    </Reveal>
                    <Reveal as="p" step={4}
                      className="rounded-md border border-dashed border-border px-4 py-3 text-sm leading-relaxed text-ink-muted">
                      {slide.curve.activity.hint}
                    </Reveal>
                  </div>
                </div>
              )}

              {slide.kind === "example" && (
                <div>
                  <Reveal as="p" step={1} className="font-arabic text-2xl leading-relaxed text-ink">
                    {slide.example.statement}
                  </Reveal>

                  <Reveal as="p" step={2}
                    className="mt-6 mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                    الحل
                  </Reveal>

                  <div className="flex flex-col">
                    {slide.example.steps.map((step, i) => (
                      <Reveal key={step.id} step={i + 3}
                        className="flex gap-3 border-t border-border py-3.5">
                        <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-alt text-xs font-semibold text-ink-muted">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="overflow-x-auto font-arabic text-xl leading-loose text-ink" dir="ltr">
                            {step.math}
                          </p>
                          {step.gaps?.length > 0 && helpStep !== step.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setHelpStep(step.id);
                                setPlaying(false);
                                record({ type: "help_requested", step: step.id });
                              }}
                              className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors duration-fast hover:border-accent hover:text-accent"
                            >
                              <HelpCircle size={13} />
                              ما فهمت هالخطوة
                            </button>
                          )}
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              )}

              {slide.kind === "checkpoint" && (
                <div>
                  <Reveal as="p" step={1} className="font-arabic text-2xl leading-relaxed text-ink">{slide.checkpoint.prompt}</Reveal>
                  <div className="mt-6 flex flex-col gap-2.5">
                    {slide.checkpoint.options.map((opt, oi) => {
                      const picked = answered?.id === opt.id;
                      const reveal = Boolean(answered);
                      return (
                        <Reveal as="button" key={opt.id} step={oi + 2} type="button" disabled={reveal} onClick={() => answer(opt)}
                          className={`flex items-center gap-3 rounded-md border px-5 py-4 text-start font-arabic text-2xl transition-colors duration-fast disabled:cursor-default ${
                            reveal && opt.correct ? "border-success bg-success-tint"
                            : picked ? "border-error bg-error-tint"
                            : "border-border bg-surface-raised hover:border-primary"
                          }`}>
                          {reveal && (opt.correct
                            ? <CheckCircle2 size={20} className="shrink-0 text-success" />
                            : picked ? <XCircle size={20} className="shrink-0 text-error" />
                            : <span className="w-5" />)}
                          {opt.text}
                        </Reveal>
                      );
                    })}
                  </div>
                  {answered && (
                    <p className="mt-4 rounded-md bg-surface-alt px-5 py-3.5 text-base leading-relaxed text-ink">
                      {answered.why}
                      {!answered.correct && (
                        <button type="button" onClick={() => setAnswered(null)}
                          className="ms-2 font-semibold text-primary hover:underline">جرّب مرة ثانية</button>
                      )}
                    </p>
                  )}
                </div>
              )}

              {slide.kind === "done" && (
                <div className="text-center">
                  <Reveal step={1}><PartyPopper size={44} className="mx-auto text-accent" /></Reveal>
                  <Reveal as="h2" step={2} className="mt-4 font-display text-4xl font-semibold text-ink">أنهيت الدرس</Reveal>
                  <Reveal as="p" step={3} className="mt-3 text-lg text-ink-muted">
                    {events.filter((e) => e.type === "help_requested").length > 0
                      ? "سجّلنا النقاط اللي وقفت عندها، ورح تظهر بخطتك للمراجعة."
                      : "ما وقفت عند أي خطوة — ممتاز."}
                  </Reveal>
                  <Reveal as="button" step={4} type="button" onClick={() => navigate("/lectures")}
                    className="mt-8 rounded-md bg-primary px-6 py-3 font-medium text-white transition-colors duration-fast hover:bg-primary-hover">
                    الدرس التالي
                  </Reveal>
                </div>
              )}
            </div>
          </div>

          {/* ---------- helper: overlays, never pushes the slide ---------- */}
          {helpStep && (() => {
            const step = slide.example?.steps.find((x) => x.id === helpStep);
            if (!step) return null;
            return (
              <aside className="w-full max-w-md shrink-0 overflow-y-auto border-s border-border bg-surface-raised p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">مساعدة على هالخطوة</span>
                  <button type="button" onClick={() => setHelpStep(null)} aria-label="إغلاق"
                    className="grid h-8 w-8 place-items-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-ink">
                    <X size={16} />
                  </button>
                </div>
                <p className="mb-3 overflow-x-auto rounded-md bg-surface-alt px-3 py-2 font-arabic text-base text-ink" dir="ltr">
                  {step.math}
                </p>
                <TutorHelper step={step} onEvent={record} onClose={() => setHelpStep(null)} />
              </aside>
            );
          })()}

          {/* ---------- dev log ---------- */}
          {showLog && (
            <aside className="w-full max-w-xs shrink-0 overflow-y-auto border-s border-border bg-surface-alt p-4">
              <p className="text-xs font-semibold text-ink">ما يسجّله النظام</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">للفريق — لا تظهر للطالب.</p>
              <div className="mt-3 flex flex-col gap-1.5">
                {events.length === 0
                  ? <p className="rounded-md bg-surface-raised px-3 py-3 text-center text-xs text-ink-faint">لا أحداث بعد</p>
                  : events.map((e, i) => (
                      <div key={i} className="rounded-md bg-surface-raised px-3 py-2 text-xs text-ink-muted">
                        <span className="font-semibold text-ink">{EVENT_LABELS[e.type] || e.type}</span>
                        {e.step && <> · <code>{e.step}</code></>}
                        {e.gap && <> · <code>{e.gap}</code></>}
                        {e.mode && <> · <code>{e.mode}</code></>}
                      </div>
                    ))}
              </div>
            </aside>
          )}
        </div>
      </main>

      <PlayerBar
        slides={slides}
        index={index}
        playing={playing}
        onPlay={() => setPlaying((p) => !p)}
        onPrev={() => go(index - 1)}
        onNext={() => go(index + 1)}
        onSeek={go}
        onRestart={() => { go(0); setAnswered(null); }}
      />
    </div>
  );
}
