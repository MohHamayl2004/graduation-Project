import { RotateCcw } from "lucide-react";
import MathText from "../../AITutor/components/MathText";
import { summarise } from "../lessonState";

export default function LessonSummary({ checkpoints, answers, onRestart }) {
  const result = summarise(checkpoints, answers);

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-sm">
      <h3 className="font-display text-xl font-semibold text-ink">خلصت الدرس</h3>
      <p className="mt-2 text-base text-ink">
        جاوبت صح على {result.correct} من {result.total} أسئلة تركيز.
      </p>

      {result.missed.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-ink-muted">راجع هدول:</p>
          <ul className="space-y-3">
            {result.missed.map(({ checkpoint }) => (
              <li key={checkpoint.id} className="rounded-lg border border-border bg-surface-alt p-3">
                <p className="text-base text-ink"><MathText text={checkpoint.question} /></p>
                {checkpoint.source?.lesson && (
                  <p className="mt-1 text-sm text-ink-muted">
                    الدرس {checkpoint.source.lesson}
                    {checkpoint.source.pages?.length ? ` · صفحة ${checkpoint.source.pages.join("، ")}` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={onRestart} className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm font-semibold text-ink hover:bg-primary-tint">
        <RotateCcw size={16} /> أعد الدرس
      </button>
    </div>
  );
}
