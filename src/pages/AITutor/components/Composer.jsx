import { Square } from "lucide-react";
import { useRef, useState } from "react";
import { STARTER_PROMPTS } from "../chatState";
import MathMenu from "./MathMenu";
import RichMathInput from "./RichMathInput";

export const MAX_LENGTH = 2000;

// Enter sends, Shift+Enter starts a new line. While an answer is being
// written the button becomes "stop".
export default function Composer({ busy, disabled, onSend, onStop, showStarters, text, onTextChange, inputRef }) {
  const setText = onTextChange;
  const sent = useRef(false);
  const localInput = useRef(null);
  const input = inputRef || localInput;
  const [tooLong, setTooLong] = useState(false);
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

      <div className="tutor-composer-shell">
          <MathMenu disabled={disabled} onInsert={(template) => setTooLong(input.current.insertTemplate(template) === false)} />
          <RichMathInput
            ref={input}
            value={text}
            onChange={setText}
            onSubmit={submit}
            maxLength={MAX_LENGTH}
            disabled={disabled}
          />
          {busy ? (
            <button type="button" onClick={onStop} aria-label="إيقاف الجواب" className="tutor-composer-stop">
              إيقاف <Square size={15} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="إرسال السؤال"
              className="tutor-composer-send"
            >
              إرسال
            </button>
          )}
      </div>
      {tooLong && <p role="alert" className="math-toolbar-error">السؤال طويل؛ اختصره قليلًا قبل إضافة الرمز.</p>}
    </div>
  );
}
