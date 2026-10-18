import { Send, Square } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { STARTER_PROMPTS } from "../chatState";

const MAX_LENGTH = 2000;

// Enter sends, Shift+Enter starts a new line. While an answer is being
// written the button becomes "stop".
export default function Composer({ busy, disabled, onSend, onStop, showStarters }) {
  const [text, setText] = useState("");
  const sent = useRef(false);
  const input = useRef(null);
  useLayoutEffect(() => {
    const resize = () => {
      if (!input.current) return;
      input.current.style.height = "auto";
      input.current.style.height = `${Math.min(input.current.scrollHeight, Math.max(44, Math.min(180, (window.visualViewport?.height || window.innerHeight) * .3)))}px`;
    };
    resize(); window.addEventListener("resize", resize); window.visualViewport?.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("resize", resize); };
  }, [text]);
  const canSend = !busy && !disabled && text.trim().length > 0;

  const submit = () => {
    if (!canSend || sent.current) return;
    sent.current = true;
    onSend(text);
    setText("");
    queueMicrotask(() => { sent.current = false; });
  };

  return (
    <div className="chat-composer mx-auto mt-3 w-full max-w-[900px] shrink-0">
      {showStarters && (
        <details className="chat-starters mb-3 text-sm text-ink-muted"><summary className="min-h-11 cursor-pointer py-2">اقتراحات لبدء السؤال</summary><div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setText(prompt)}
              className="rounded-full border border-border bg-surface-alt px-4 py-2 text-sm text-ink-muted transition-colors duration-base hover:bg-primary-tint hover:text-primary"
            >
              {prompt}
            </button>
          ))}
        </div></details>
      )}

      <div className="rounded-2xl border border-border bg-surface-alt p-2 shadow-sm">
        <div className="flex items-end gap-3 rounded-xl bg-surface-raised/60 px-3 py-1.5 sm:px-4 sm:py-2">
          <textarea
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder="اسأل عن أي شيء بالوحدة الأولى: متوسط التغير، قواعد الاشتقاق، لوبيتال، المماس…"
            aria-label="سؤالك للمعلّم الذكي"
            enterKeyHint="send"
            dir="auto"
            className="min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2 text-base leading-7 text-ink outline-none placeholder:text-ink-faint"
          />
          {busy ? (
            <button type="button" onClick={onStop} aria-label="إيقاف الجواب" className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white sm:px-5">
              <span className="hidden sm:inline">إيقاف</span> <Square size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="إرسال السؤال"
              className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors duration-base sm:px-5 ${canSend ? "bg-primary hover:bg-primary-hover" : "bg-border-strong"}`}
            >
              <span className="hidden sm:inline">إرسال</span> <Send size={17} className="rtl:-scale-x-100" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-ink-faint">
        معلّم نبراس الذكي يجيب من كتاب الوحدة الأولى ويذكر الصفحة. ممكن يخطئ في الشرح، فارجع للكتاب في المهم.
      </p>
    </div>
  );
}
