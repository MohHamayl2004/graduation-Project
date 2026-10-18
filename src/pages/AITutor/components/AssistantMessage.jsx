import { AlertTriangle, BookOpen, CheckCircle2, ListOrdered, Sparkles } from "lucide-react";
import { sourceLabel } from "../chatState";
import AnswerBody from "./AnswerBody";
import MathText from "./MathText";

// One tutor answer. The text is rendered as text - never as HTML - with its
// line breaks kept. While it streams, the sources and the verified result
// appear first, then the explanation is written in.
export default function AssistantMessage({ message }) {
  const { content, status, sources, calculation, errorMessage } = message;
  const streaming = status === "streaming";
  const refused = status === "refused";
  const broken = status === "failed" || status === "interrupted";

  return (
    <div className="chat-message flex min-w-0 gap-2 sm:gap-4">
      <div className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-ink text-white shadow-md">
        <Sparkles size={19} />
      </div>

      <div className={`w-full min-w-0 rounded-2xl border p-3 shadow-sm sm:p-6 ${refused ? "border-border bg-surface-alt" : "border-border bg-surface-raised"}`}>
        {sources.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <BookOpen size={16} className="text-ink-muted" aria-hidden="true" />
            <span className="font-semibold text-ink-muted">من كتابك:</span>
            {sources.map((source) => (
              <span key={`${source.document}-${source.lesson}-${(source.pages || []).join("-")}-${source.order}`} className="rounded-md border border-border bg-primary-tint px-2 py-1 text-primary">
                {sourceLabel(source)}
              </span>
            ))}
          </div>
        )}

        {calculation?.answer && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success-tint px-3 py-1.5 text-sm font-semibold text-success">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>الجواب محسوب ومتحقق منه: <MathText text={calculation.answer} /></span>
          </div>
        )}

        {calculation?.facts?.length > 0 && (
          <div className="mb-4 rounded-lg border border-border bg-surface-alt p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-base font-semibold text-primary">
              <ListOrdered size={19} aria-hidden="true" />
              <span>خطوات الحل بالحاسوب</span>
            </div>
            <ol className="space-y-2">
              {calculation.facts.map((fact, index) => (
                <li key={fact} className="flex gap-3 text-sm leading-7 text-ink">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-xs text-ink-muted">
                    {index + 1}
                  </span>
                  <MathText text={fact} />
                </li>
              ))}
            </ol>
          </div>
        )}

        {content ? (
          <div className="break-words">
            <AnswerBody text={content} />
            {streaming && <span className="ms-1 inline-block h-5 w-2 animate-pulse rounded-sm bg-primary align-middle" aria-hidden="true" />}
          </div>
        ) : streaming ? (
          <p className="flex items-center gap-2 text-base text-ink-muted" role="status">
            <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" />
            {sources.length ? "بكتبلك الشرح…" : "بدوّر بكتابك…"}
          </p>
        ) : null}

        {broken && (
          <p className="mt-3 flex items-center gap-2 text-sm text-warning" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            {errorMessage || "ما اكتمل الجواب. حاول مرة ثانية."}
          </p>
        )}
      </div>
    </div>
  );
}
