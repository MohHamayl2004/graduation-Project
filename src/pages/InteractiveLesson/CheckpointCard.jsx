import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import MathText from "../../AITutor/components/MathText";
import { feedbackFor, isCorrect } from "../lessonState";

// The question the video stops at. The student picks, reads why, and only
// then the video continues - a wrong option explains the mistake by name.
export default function CheckpointCard({ checkpoint, onAnswer, onResume }) {
  const [picked, setPicked] = useState(null);
  const answered = picked !== null;
  const right = answered && isCorrect(checkpoint, picked);

  const choose = (choiceId) => {
    if (answered) return;
    setPicked(choiceId);
    onAnswer(checkpoint, choiceId);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg sm:p-6" role="dialog" aria-label="سؤال أثناء الدرس">
      <p className="mb-4 text-lg font-semibold text-ink">
        <MathText text={checkpoint.question} />
      </p>

      <div className="flex flex-col gap-2">
        {(checkpoint.choices || []).map((choice) => {
          const chosen = picked === choice.id;
          const tone = !answered
            ? "border-border bg-surface-alt hover:bg-primary-tint"
            : choice.correct
              ? "border-success/40 bg-success-tint"
              : chosen
                ? "border-error/40 bg-error-tint"
                : "border-border bg-surface-alt opacity-60";
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => choose(choice.id)}
              disabled={answered}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start text-base text-ink transition-colors duration-base ${tone}`}
            >
              <MathText text={choice.text} />
              {answered && choice.correct && <CheckCircle2 size={18} className="shrink-0 text-success" />}
              {answered && chosen && !choice.correct && <XCircle size={18} className="shrink-0 text-error" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          <p className={`mt-4 text-base leading-7 ${right ? "text-success" : "text-ink"}`}>
            <MathText text={feedbackFor(checkpoint, picked)} />
          </p>
          {checkpoint.source?.lesson && (
            <p className="mt-2 text-sm text-ink-muted">
              من كتابك: الدرس {checkpoint.source.lesson}
              {checkpoint.source.pages?.length ? ` · صفحة ${checkpoint.source.pages.join("، ")}` : ""}
            </p>
          )}
          <button type="button" onClick={onResume} className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            كمّل الدرس
          </button>
        </>
      )}
    </div>
  );
}
