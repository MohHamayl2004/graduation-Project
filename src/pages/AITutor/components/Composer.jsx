import { Send, Square } from "lucide-react";
import { useState } from "react";
import { STARTER_PROMPTS } from "../chatState";

const MAX_LENGTH = 2000;

// Enter sends, Shift+Enter starts a new line. While an answer is being
// written the button becomes "stop".
export default function Composer({ busy, disabled, onSend, onStop, showStarters }) {
  const [text, setText] = useState("");
  const canSend = !busy && !disabled && text.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-[900px]">
      {showStarters && (
        <div className="mb-4 flex flex-wrap gap-2">
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
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface-alt p-2 shadow-sm">
        <div className="flex items-end gap-3 rounded-xl bg-surface-raised/60 px-3 py-1.5 sm:px-4 sm:py-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={Math.min(6, Math.max(1, text.split("\n").length))}
            disabled={disabled}
            placeholder="اسأل عن أي شيء بالوحدة الأولى: متوسط التغير، قواعد الاشتقاق، لوبيتال، المماس…"
            aria-label="سؤالك للمعلّم الذكي"
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
