import { layoutAnswer } from "../chatState";
import MathText from "./MathText";

// Numbered steps as steps, the final answer as the line a student
// copies into the exam, everything else as a short paragraph.
export default function AnswerBody({ text }) {
  const blocks = layoutAnswer(text);
  const out = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];

    if (block.kind === "step") {
      const steps = [];
      while (i < blocks.length && blocks[i].kind === "step") steps.push(blocks[i++].text);
      i -= 1;
      out.push(
        <ol key={`steps-${i}`} className="my-2 space-y-2">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-base leading-8 text-ink">
              <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-surface-alt text-xs text-ink-muted">
                {index + 1}
              </span>
              <MathText text={step} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (block.kind === "final") {
      out.push(
        <p key={`final-${i}`} className="mt-3 rounded-lg border border-primary/20 bg-primary-tint px-3 py-2 text-base font-semibold text-primary">
          <MathText text={block.text} />
        </p>
      );
      continue;
    }

    out.push(
      <p key={`text-${i}`} className="my-1 text-base leading-8 text-ink">
        <MathText text={block.text} />
      </p>
    );
  }

  return <div className="min-w-0">{out}</div>;
}
