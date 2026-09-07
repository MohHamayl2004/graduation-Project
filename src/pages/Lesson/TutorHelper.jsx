import { useState } from "react";
import { Sparkles, Volume2, Square, CheckCircle2, RotateCcw } from "lucide-react";
import Button from "../../components/common/Button";

// What a student sees when they get stuck on one step.
//
// The order matters: ask before explaining. "ما فهمت" is vague, and
// re-explaining the whole step means 200 words of which the student
// already knew 190. Narrowing first makes the answer shorter, more
// accurate, and cheaper to serve.
export default function TutorHelper({ step, onEvent, onClose }) {
  const [gap, setGap] = useState(null);
  const [showAlternate, setShowAlternate] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA";
    u.rate = 0.92;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  const choose = (g) => {
    setGap(g);
    setShowAlternate(false);
    onEvent?.({ type: "gap_selected", step: step.id, gap: g.id });
  };

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-accent bg-accent-tint">
      <div className="flex items-center gap-2 border-b border-accent/25 px-4 py-3">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-semibold text-white">
          ن
        </span>
        <span className="text-sm font-semibold text-accent">مساعد نبراس</span>
        {gap && (
          <button
            type="button"
            onClick={() => speak(gap.speech)}
            className="ms-auto inline-flex items-center gap-1.5 rounded-md border border-accent px-2.5 py-1 text-xs font-medium text-accent transition-colors duration-fast hover:bg-accent hover:text-white"
          >
            {speaking ? <Square size={12} /> : <Volume2 size={12} />}
            {speaking ? "إيقاف" : "اسمع"}
          </button>
        )}
      </div>

      <div className="px-4 py-4">
        {!gap ? (
          <>
            <p className="text-sm text-ink-muted">شو تحديداً مش واضح؟</p>
            <div className="mt-3 flex flex-col gap-2">
              {(step.gaps || []).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => choose(g)}
                  className="rounded-md border border-border bg-surface-raised px-3.5 py-2.5 text-start text-sm text-ink transition-colors duration-fast hover:border-accent"
                >
                  {g.question}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onEvent?.({ type: "gap_freeform", step: step.id })}
                className="rounded-md border border-dashed border-border px-3.5 py-2.5 text-start text-sm text-ink-muted transition-colors duration-fast hover:border-accent hover:text-ink"
              >
                شي تاني…
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-ink">{gap.lead}</p>

            <div className="rounded-md bg-surface-raised px-4 py-3">
              <p className="font-arabic text-base text-ink">{gap.subject}</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {gap.work.map(([math, why]) => (
                  <div key={math} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-arabic text-base text-ink">{math}</span>
                    <span className="text-xs text-ink-faint">{why}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 font-arabic text-base font-semibold text-ink">{gap.result}</p>
            </div>

            <div className="rounded-md bg-warning-tint px-4 py-3 text-sm leading-relaxed text-ink">
              {gap.pitfall}
            </div>

            {showAlternate && (
              <div className="rounded-md border border-primary bg-primary-tint px-4 py-3">
                <p className="mb-1 text-xs font-semibold text-primary">بطريقة ثانية</p>
                <p className="text-sm leading-relaxed text-ink">{gap.alternate}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="accent"
                onClick={() => {
                  onEvent?.({ type: "resolved", step: step.id, gap: gap.id, attempts: showAlternate ? 2 : 1 });
                  onClose?.();
                }}
              >
                <CheckCircle2 size={15} />
                وضحت، كمّل
              </Button>
              {!showAlternate && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowAlternate(true);
                    onEvent?.({ type: "escalated", step: step.id, gap: gap.id });
                  }}
                >
                  <RotateCcw size={15} />
                  لسا مش واضح
                </Button>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-ink-faint">
              <Sparkles size={13} className="mt-0.5 shrink-0" />
              هذا الشرح مبني على محتوى الدرس نفسه ومراجَع من الأستاذ — لا أرقام جديدة فيه.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
