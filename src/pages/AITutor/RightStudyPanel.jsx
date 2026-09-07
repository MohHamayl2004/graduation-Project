import { FlaskConical, Clock3, PlayCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import Card from "../../components/common/Card";
import ProgressBar from "../../components/common/ProgressBar";
import Button from "../../components/common/Button";

const weakAreas = [
  { title: "VSEPR Theory", subtitle: "Last Quiz: 45%", tone: "bg-error" },
  { title: "Metallic Bonding", subtitle: "Low interaction", tone: "bg-warning" }
];

const contextItems = [
  { icon: FlaskConical, label: "Chemistry", detail: "Tawjihi Curriculum" },
  { icon: Clock3, label: "Exam Date", detail: "June 20, 2024" }
];

export default function RightStudyPanel() {
  const [flashcardMsg, setFlashcardMsg] = useState("");

  const createNow = () => {
    setFlashcardMsg("Flashcards generated for Chapter 3.");
    setTimeout(() => setFlashcardMsg(""), 1800);
  };

  return (
    <aside className="hidden w-[300px] shrink-0 overflow-y-auto bg-surface-alt px-6 py-8 xl:block">
      <h3 className="font-display text-xl font-semibold text-ink">Study Insights</h3>

      <Card className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-ink">Chapter 3 Progress</span>
          <span className="font-semibold text-primary">68%</span>
        </div>
        <ProgressBar value={68} />
        <p className="mt-3 text-sm leading-6 text-ink-muted">2 topics remaining to master this chapter.</p>
      </Card>

      <h4 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink-muted">Current Context</h4>
      <div className="mt-4 space-y-3">
        {contextItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
                <Icon size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <p className="text-xs text-ink-muted">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <h4 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink-muted">Weak Areas Identified</h4>
      <div className="mt-3 space-y-3">
        {weakAreas.map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-surface-raised p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`h-9 w-1 shrink-0 rounded-full ${item.tone}`} />
                <div>
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="text-xs text-ink-muted">{item.subtitle}</p>
                </div>
              </div>
              <button type="button" aria-label={`Review ${item.title}`} className="text-primary hover:text-primary-hover">
                <PlayCircle size={21} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 rounded-lg bg-gradient-to-br from-accent to-accent-hover px-5 py-5 text-white shadow-sm">
        <p className="flex items-center gap-2 text-base font-semibold">
          <Sparkles size={16} /> Generate Flashcards
        </p>
        <p className="mt-1 text-sm leading-6 text-white/95">Master Chapter 3 keywords with AI-powered cards.</p>
        <Button
          size="sm"
          onClick={createNow}
          className="mt-4 border-none bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
        >
          Create Now
        </Button>
        {flashcardMsg && (
          <p role="status" className="mt-2 rounded-md bg-white/20 px-2 py-1 text-xs">
            {flashcardMsg}
          </p>
        )}
      </div>
    </aside>
  );
}
