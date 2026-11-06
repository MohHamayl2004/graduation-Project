import { Send, Square, Sigma, Pencil, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { STARTER_PROMPTS } from "../chatState";
import { emptyMathDraft, insertDraftMath, removeDraftMath, trimMathMessage, updateDraftText } from "../../../../shared/mathEditor.js";
import MathSymbolsPanel from "./MathSymbolsPanel";
import MathText from "./MathText";

const MAX_LENGTH = 2000;

// Enter sends, Shift+Enter starts a new line. While an answer is being
// written the button becomes "stop".
export default function Composer({ busy, disabled, onSend, onStop, showStarters }) {
  const [draft, setDraft] = useState(emptyMathDraft);
  const text = draft.text;
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selection = useRef({ start: 0, end: 0 });
  const sequence = useRef(0);
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
  const canSend = !busy && !disabled && !submitting && text.trim().length > 0;
  const rememberSelection = () => { if (input.current) selection.current = { start: input.current.selectionStart, end: input.current.selectionEnd }; };
  const focusAt = cursor => requestAnimationFrame(() => { input.current?.focus({ preventScroll: true }); input.current?.setSelectionRange(cursor, cursor); selection.current = { start: cursor, end: cursor }; });
  const insert = formatted => {
    const editing = panel?.equation;
    const range = editing ? { start: editing.start, end: editing.end } : selection.current;
    const source = editing ? { ...draft, equations: draft.equations.filter(e => e.key !== editing.key) } : draft;
    const result = insertDraftMath(source, range, formatted, `math-${++sequence.current}`);
    if (result.draft.text.length > MAX_LENGTH || result.draft.equations.length > 40) { setError("المسودة تتجاوز الحد المسموح: 2000 حرف و40 معادلة."); setPanel(null); return; }
    setDraft(result.draft); setError(""); setPanel(null); focusAt(result.cursor);
  };

  const submit = async () => {
    if (!canSend || sent.current) return;
    sent.current = true;
    setSubmitting(true); setError("");
    try {
      const message = trimMathMessage(draft);
      if (await onSend(message.content, message.equations) !== false) { setDraft(emptyMathDraft()); selection.current = { start: 0, end: 0 }; }
    } catch (failure) { setError(failure.message || "تعذّر إرسال السؤال، مسودتك محفوظة."); }
    finally { sent.current = false; setSubmitting(false); }
  };

  return (
    <div className="chat-composer mx-auto mt-3 w-full max-w-[900px] shrink-0">
      {showStarters && (
        <details className="chat-starters mb-3 text-sm text-ink-muted"><summary className="min-h-11 cursor-pointer py-2">اقتراحات لبدء السؤال</summary><div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => { setDraft({ text: prompt, equations: [] }); focusAt(prompt.length); }}
              disabled={busy || submitting}
              className="rounded-full border border-border bg-surface-alt px-4 py-2 text-sm text-ink-muted transition-colors duration-base hover:bg-primary-tint hover:text-primary"
            >
              {prompt}
            </button>
          ))}
        </div></details>
      )}

      <div className="rounded-2xl border border-border bg-surface-alt p-2 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1">
          <button type="button" disabled={disabled || submitting || busy} onClick={() => { rememberSelection(); setPanel({}); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary-tint px-3 text-sm font-semibold text-primary"><Sigma size={20} />رموز الرياضيات</button>
          <span className="text-xs text-ink-muted">{text.length} / {MAX_LENGTH}</span>
        </div>
        <div className="flex items-end gap-3 rounded-xl bg-surface-raised/60 px-3 py-1.5 sm:px-4 sm:py-2">
          <textarea
            ref={input}
            value={text}
            onChange={(e) => { if (e.target.value.length > MAX_LENGTH) { setError("السؤال أطول من 2000 حرف."); return; } setDraft(old => updateDraftText(old, e.target.value)); setError(""); }}
            onSelect={rememberSelection}
            onBlur={rememberSelection}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            disabled={disabled || submitting}
            placeholder="اسأل عن أي شيء بالوحدة الأولى: متوسط التغير، قواعد الاشتقاق، لوبيتال، المماس…"
            aria-label="سؤالك للمعلّم الذكي"
            enterKeyHint="send"
            dir="rtl"
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
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
      {text.trim() && !submitting && <details className="math-draft-preview mt-2 rounded-xl border border-border bg-surface-raised" open={draft.equations.length > 0 || undefined}>
        <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-semibold text-primary">معاينة السؤال قبل الإرسال{draft.equations.length ? ` — ${draft.equations.length} معادلة` : ""}</summary>
        <div className="max-h-40 overflow-y-auto px-3 pb-3">
          <div className="whitespace-pre-wrap text-base leading-8"><MathText text={text} equations={draft.equations} /></div>
          {draft.equations.map((eq, index) => <div key={eq.key} className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
            <span className="text-sm">المعادلة {index + 1}</span>
            <button type="button" disabled={busy || submitting} onClick={() => setPanel({ equation: eq })} aria-label={`تعديل المعادلة ${index + 1}`} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-sm"><Pencil size={16} />تعديل</button>
            <button type="button" disabled={busy || submitting} onClick={() => { setDraft(old => removeDraftMath(old, eq.key)); focusAt(eq.start); }} aria-label={`حذف المعادلة ${index + 1}`} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-sm text-error"><Trash2 size={16} />حذف</button>
          </div>)}
        </div>
      </details>}
      {panel && <MathSymbolsPanel initialEquation={panel.equation} onInsert={insert} onClose={() => { setPanel(null); focusAt(selection.current.start); }} />}

      <p className="mt-2 text-center text-xs text-ink-faint">
        معلّم نبراس الذكي يجيب من كتاب الوحدة الأولى ويذكر الصفحة. ممكن يخطئ في الشرح، فارجع للكتاب في المهم.
      </p>
    </div>
  );
}
