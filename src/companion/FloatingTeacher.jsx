import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Mic,
  MicOff,
  MoreHorizontal,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  X,
  BookOpen,
  Grip,
} from "lucide-react";
import CharacterViewport from "../character-engine/CharacterViewport.jsx";
import { mascotConfig } from "../config/mascotConfig.js";
import { useTutorCompanion } from "./TutorCompanionContext.jsx";
import { useCompanionVoice } from "./useCompanionVoice.js";
import {
  clampPosition,
  dragMoved,
  isPushToTalk,
  canStartDrag,
} from "./companionState.js";
import "./companion.css";
import { canTeacherNavigate, TEACHER_LESSONS_ROUTE } from "./teacherPolicy.js";

const positionKey = "nipras.companion.position.v1";
const viewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});
function initialPosition() {
  try {
    const value = JSON.parse(localStorage.getItem(positionKey));
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y))
      return value;
  } catch {}
  return { x: 16, y: 80 };
}
export default function FloatingTeacher() {
  const {
    chat,
    character,
    settings,
    setSettings,
    token,
    eligible,
    menuRequest,
    voiceNavigation,
  } = useTutorCompanion();
  const navigate = useNavigate(),
    host = useRef(null),
    panel = useRef(null),
    drag = useRef(null),
    position = useRef(initialPosition());
  const [menu, setMenu] = useState(false),
    [showSettings, setShowSettings] = useState(false),
    [menuPoint, setMenuPoint] = useState({ x: 8, y: 8 }),
    [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const model = useRef(null);
  const width =
    settings.mode === "compact"
      ? Math.min(settings.size, 165)
      : settings.mode === "focused"
        ? Math.min(320, settings.size * 1.25)
        : settings.size;
  const size = {
    width: Math.min(width, window.innerWidth - 16),
    height: Math.min(width * 1.48 + 42, window.innerHeight - 16),
  };
  const dimensions = useRef(size);
  dimensions.current = size;
  const update = (patch) =>
    setSettings((current) => ({ ...current, ...patch }));
  const place = useCallback((point, persist = false) => {
    const next = clampPosition(point, viewport(), dimensions.current);
    position.current = next;
    if (host.current)
      host.current.style.transform = `translate3d(${next.x}px,${next.y}px,0)`;
    if (persist)
      try {
        localStorage.setItem(positionKey, JSON.stringify(next));
      } catch {}
  }, []);
  useEffect(() => {
    place(position.current);
    const resize = () => {
      place(position.current, true);
      setMenu(false);
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [place, size.width, size.height]);
  const openMenu = useCallback(() => {
    const p = position.current;
    setMenuPoint({
      x: Math.max(
        8,
        Math.min(
          window.innerWidth - 300,
          p.x > 310 ? p.x - 300 : p.x + dimensions.current.width,
        ),
      ),
      y: Math.max(8, Math.min(window.innerHeight - 430, p.y)),
    });
    setMenu(true);
  }, []);
  useEffect(() => {
    if (menuRequest) openMenu();
  }, [menuRequest, openMenu]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event) => {
      if (
        !panel.current?.contains(event.target) &&
        !host.current?.contains(event.target)
      )
        setMenu(false);
    };
    const key = (event) => {
      if (event.key === "Escape") {
        setMenu(false);
        host.current?.querySelector("button")?.focus();
      }
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", key);
    panel.current?.querySelector("button")?.focus();
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);
  useEffect(() => {
    if (!eligible) {
      setMenu(false);
      character.interrupt();
    }
  }, [eligible, character.interrupt]);
  const send = useCallback(
    async (text) => {
      if (!text.trim()) return;
      await chat.send(text);
    },
    [chat.send],
  );
  const voice = useCompanionVoice({
    token,
    enabled: eligible && settings.microphone,
    recognition: settings.recognition,
    onText: voiceNavigation?.handleText || send,
    wakeEnabled: settings.wakeWord === true,
    speechActive: ["playing", "loading"].includes(character.playback),
    interrupt: () => {
      character.interrupt();
      chat.stop();
    },
  });
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  useEffect(() => {
    const down = (event) => {
      if (
        !eligible ||
        !settings.microphone ||
        event.defaultPrevented || event.shiftKey ||
        (event.target?.closest?.('input,textarea,select,math-field,[contenteditable="true"]') &&
          !event.target.closest('.assessment-quiz')) ||
        !isPushToTalk(event) ||
        event.repeat
      )
        return;
      event.preventDefault();
      voiceRef.current.start();
    };
    const up = (event) => {
      if (event.code === "AltRight") voiceRef.current.stop();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [eligible, settings.microphone]);
  const pointerDown = (event) => {
    if (event.target.closest("button") || !canStartDrag(event)) return;
    if (!character.viewport.current?.hitTest(event.clientX, event.clientY))
      return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      position: { ...position.current },
      moved: false,
    };
  };
  const pointerMove = (event) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const point = { x: event.clientX, y: event.clientY };
    current.moved ||= dragMoved(current.start, point);
    if (current.moved) {
      setDragging(true);
      setMenu(false);
      place({
        x: current.position.x + point.x - current.start.x,
        y: current.position.y + point.y - current.start.y,
      });
    }
  };
  const pointerUp = (event) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.moved) place(position.current, true);
    else if (event.pointerType === "mouse" && event.type !== "pointercancel")
      openMenu();
    drag.current = null;
    setDragging(false);
  };
  useEffect(() => {
    // Transparent canvas pixels pass through to the page. Raycast only inside
    // the small avatar rectangle, throttled to 20 Hz while the pointer moves.
    let last = 0;
    const move = (event) => {
      if (
        event.pointerType !== "mouse" ||
        drag.current ||
        !model.current ||
        performance.now() - last < 50
      )
        return;
      last = performance.now();
      const rect = model.current.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      model.current.style.pointerEvents =
        inside &&
        character.viewport.current?.hitTest(event.clientX, event.clientY)
          ? "auto"
          : "none";
    };
    const touch = (event) => {
      if (
        event.pointerType !== "touch" ||
        event.target.closest?.("button") ||
        !model.current ||
        settings.mode === "hidden"
      )
        return;
      if (character.viewport.current?.hitTest(event.clientX, event.clientY)) {
        event.preventDefault();
        event.stopPropagation();
        model.current.setPointerCapture(event.pointerId);
        drag.current = {
          id: event.pointerId,
          start: { x: event.clientX, y: event.clientY },
          position: { ...position.current },
          moved: false,
        };
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", touch, {
      capture: true,
      passive: false,
    });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", touch, true);
    };
  }, [character.viewport, settings.mode]);
  const phase =
    voice.status === "listening" || voice.status === "requesting"
      ? "listening"
      : voice.status === "transcribing" || chat.state.phase === "streaming"
        ? "thinking"
        : character.playback === "playing"
          ? "speaking"
          : "ready";
  const status = {
    ready: "جاهز",
    listening: "يستمع",
    thinking: "يفكر",
    speaking: "يتحدث",
  }[phase];
  const talk = () => {
    if (["listening", "requesting"].includes(voice.status)) voice.stop();
    else voice.start();
  };
  const showArea = () => {
    setMenu(false);
    if (canTeacherNavigate(TEACHER_LESSONS_ROUTE)) {
      character.interrupt();
      navigate(TEACHER_LESSONS_ROUTE);
    }
  };
  const hide = () => {
    update({ mode: "hidden" });
    setMenu(false);
    voice.cancel();
    character.interrupt();
  };
  const frame = useCallback(
    (delta, time) => {
      character.onFrame(delta, time);
    },
    [character.onFrame],
  );
  if (!eligible)
    return (
      <div className="nipras-companion-offscreen" aria-hidden="true">
        <CharacterViewport
          ref={character.viewport}
          avatarId="male"
          state="idle"
          onReady={character.onReady}
          onFrame={frame}
        />
      </div>
    );
  return (
    <>
      <div
        ref={host}
        className={`nipras-companion ${settings.shadow ? "has-shadow" : ""} ${settings.glow ? "has-glow" : ""} ${dragging ? "is-dragging" : ""}`}
        style={{
          width: size.width,
          height: size.height,
          display: settings.mode === "hidden" ? "none" : undefined,
        }}
        dir="rtl"
        data-companion-state={phase}
      >
        <div
          ref={model}
          className="nipras-companion-model"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onContextMenu={(event) => {
            if (
              character.viewport.current?.hitTest(event.clientX, event.clientY)
            ) {
              event.preventDefault();
              openMenu();
            }
          }}
          aria-label="اسحب المعلم بزر الفأرة الأيسر لتحريكه؛ الزر الأيمن لفتح القائمة"
        >
          <CharacterViewport
            ref={character.viewport}
            avatarId="male"
            state="idle"
            outline={settings.glow}
            reducedMotion={settings.motion === 0 ? true : undefined}
            className="nipras-companion-canvas"
            onReady={character.onReady}
            onFrame={frame}
            onError={() => setFailed(true)}
          />
          {failed && (
            <span className="nipras-companion-failed">
              تعذر عرض المعلم ثلاثي الأبعاد
            </span>
          )}
        </div>
        <button
          className="nipras-companion-menu-trigger"
          onClick={openMenu}
          aria-label="فتح قائمة المعلم"
          aria-expanded={menu}
          aria-controls="nipras-companion-menu"
        >
          <MoreHorizontal size={20} />
          <span>{status}</span>
          <Grip size={14} />
        </button>
      </div>
      {settings.mode === "hidden" && (
        <button
          className="nipras-companion-restore"
          onClick={() => update({ mode: "floating" })}
          aria-label="إظهار المعلم"
        >
          <Eye size={19} />
          المعلم
        </button>
      )}
      {menu && (
        <section
          ref={panel}
          id="nipras-companion-menu"
          className="nipras-companion-panel"
          style={{
            left: menuPoint.x,
            top: menuPoint.y,
            maxHeight: `calc(100dvh - ${menuPoint.y + 8}px)`,
          }}
          role="dialog"
          aria-label="قائمة المعلم الذكي"
          dir="rtl"
        >
          <header>
            <img
              className="nipras-companion-avatar"
              src={mascotConfig.image}
              alt=""
            />
            <div>
              <strong>المعلم الذكي</strong>
              <small>NIPRAS Teacher · {status}</small>
            </div>
            <button onClick={() => setMenu(false)} aria-label="إغلاق القائمة">
              <X size={17} />
            </button>
          </header>
          <div className="nipras-companion-actions">
            <button
              onClick={talk}
              disabled={!settings.microphone || voice.status === "transcribing"}
            >
              <Mic size={18} />
              {voice.status === "listening" ? "إنهاء التسجيل" : "تحدث"}
              <kbd>Right Alt</kbd>
            </button>
            <button onClick={showArea}>
              <BookOpen size={18} />
              دروسي
            </button>
            <label>
              وضع العرض
              <select
                value={settings.mode}
                onChange={(event) =>
                  event.target.value === "hidden"
                    ? hide()
                    : update({ mode: event.target.value })
                }
              >
                <option value="floating">عائم</option>
                <option value="compact">مصغر</option>
                <option value="focused">مركز</option>
                <option value="hidden">مخفي</option>
              </select>
            </label>
            <button
              onClick={() => setShowSettings((value) => !value)}
              aria-expanded={showSettings}
            >
              <Settings size={18} />
              الإعدادات
            </button>
          </div>
          {showSettings && (
            <div className="nipras-companion-settings">
              <label>
                حجم المعلم
                <input
                  aria-label="حجم المعلم"
                  type="range"
                  min="150"
                  max="320"
                  value={settings.size}
                  onChange={(event) =>
                    update({ size: Number(event.target.value) })
                  }
                />
              </label>
              {[
                ["voice", "الصوت"],
                ["microphone", "الميكروفون"],
                ["gestures", "إيماءات Qwen التلقائية"],
                ["glow", "الإضاءة البيضاء"],
                ["shadow", "الظل"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(event) =>
                      update({
                        [key]: event.target.checked,
                        ...(key === "microphone" && !event.target.checked
                          ? { wakeWord: false }
                          : {}),
                      })
                    }
                  />
                </label>
              ))}
              <label>
                الحركة
                <select
                  value={settings.motion}
                  onChange={(event) =>
                    update({ motion: Number(event.target.value) })
                  }
                >
                  <option value="1">طبيعية</option>
                  <option value="0">هادئة</option>
                </select>
              </label>
              <label>
                الاستماع لعبارة «يا نبراس» (لهذه الجلسة)
                <input
                  type="checkbox"
                  checked={settings.wakeWord === true}
                  disabled={!settings.microphone}
                  onChange={(event) =>
                    update({ wakeWord: event.target.checked })
                  }
                />
              </label>
              <p>
                اختياري عبر التعرف الصوتي في المتصفح. يمكنك إيقافه فوراً من
                المؤشر الظاهر أعلى الصفحة.
              </p>
              <label>
                التعرف الصوتي
                <select
                  value={settings.recognition}
                  onChange={(event) =>
                    update({ recognition: event.target.value })
                  }
                >
                  <option value="auto">الخادم (كشف العربية والإنجليزية)</option>
                  <option value="browser">المتصفح (بديل)</option>
                </select>
              </label>
              <button
                onClick={() =>
                  place(
                    {
                      x: window.innerWidth - size.width - 24,
                      y: window.innerHeight - size.height - 24,
                    },
                    true,
                  )
                }
              >
                <RotateCcw size={16} />
                إعادة ضبط الموضع
              </button>
            </div>
          )}
          {(voice.error || character.speechError) && (
            <p className="nipras-companion-error" role="alert">
              {voice.error || character.speechError}
            </p>
          )}
          {character.playback === "blocked" && (
            <button
              className="nipras-companion-resume"
              onClick={character.playLatest}
            >
              تشغيل الصوت
            </button>
          )}
          <footer>
            <button
              onClick={() => update({ voice: !settings.voice })}
              aria-label={settings.voice ? "كتم الصوت" : "تفعيل الصوت"}
              aria-pressed={!settings.voice}
            >
              {settings.voice ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <button
              onClick={talk}
              disabled={!settings.microphone || voice.status === "transcribing"}
              aria-label="تسجيل سؤال صوتي"
              aria-pressed={voice.status === "listening"}
            >
              {settings.microphone ? <Mic size={19} /> : <MicOff size={19} />}
            </button>
            <button
              onClick={() =>
                update({
                  mode: settings.mode === "compact" ? "floating" : "compact",
                })
              }
              aria-label="تبديل حجم العرض"
            >
              <Eye size={19} />
            </button>
            <button
              onClick={() => setShowSettings((value) => !value)}
              aria-label="إعدادات المعلم"
            >
              <Settings size={19} />
            </button>
            <button onClick={hide} aria-label="إخفاء المعلم">
              <X size={19} />
            </button>
          </footer>
        </section>
      )}
      {(voiceNavigation?.notice || voice.transcript) && (
        <div className="nipras-voice-notice" role="status">
          {voice.transcript && <span dir="auto">{voice.transcript}</span>}
          {voiceNavigation?.notice && <span> {voiceNavigation.notice}</span>}
        </div>
      )}
      {settings.wakeWord && settings.microphone && (
        <button
          className="nipras-wake-indicator"
          onClick={() => update({ wakeWord: false })}
          aria-label="إيقاف الاستماع دون لمس"
        >
          {voice.wakeState === "armed"
            ? "سمعت يا نبراس، قل طلبك"
            : voice.wakeState === "listening"
              ? "الميكروفون نشط · قل يا نبراس"
              : voice.wakeState === "unsupported" ||
                  voice.wakeState === "blocked"
                ? "الاستماع دون لمس غير متاح"
                : "الاستماع دون لمس متوقف مؤقتاً"}{" "}
          · إيقاف
        </button>
      )}
      <span className="nipras-companion-live" role="status">
        {voice.status === "transcribing"
          ? "جارٍ تحويل الصوت إلى نص"
          : phase === "listening"
            ? "الميكروفون يستمع؛ حرر Right Alt للإنهاء"
            : ""}
      </span>
    </>
  );
}
