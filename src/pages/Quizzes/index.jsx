import { useState } from "react";
import { Clock3, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { quizOptions } from "../../data/mockQuizzes";

const questionDots = ["correct", "incorrect", "current", "pending", "pending", "pending", "pending", "pending", "pending", "pending"];
const DOT_TONE = {
  correct: "bg-accent",
  incorrect: "bg-error",
  current: "bg-primary",
  pending: "bg-border-strong"
};

export default function Quizzes() {
  const [selected, setSelected] = useState("ب");
  const [submittedMsg, setSubmittedMsg] = useState("");
  const submit = () => {
    setSubmittedMsg("تم تثبيت إجابتك!");
    setTimeout(() => setSubmittedMsg(""), 1800);
  };

  return (
    <div className="h-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="quizzes" />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar searchPlaceholder="ابحث عن موضوع أو سؤال أو ملاحظة..." showAvatar />

          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <Card padding="lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.08em] text-ink-muted">اختبار تكيّفي · الكيمياء</p>
                  <h1 className="mt-2 font-display text-3xl font-semibold text-ink">السؤال 3 من 10</h1>
                </div>
                <div className="text-end">
                  <span className="inline-flex items-center gap-2 rounded-full bg-warning-tint px-3 py-1 text-sm font-semibold text-warning">
                    <Clock3 size={15} />
                    12:34
                  </span>
                  <div className="mt-3 flex items-center justify-end gap-1.5">
                    {questionDots.map((tone, idx) => (
                      <span key={String(idx)} className={`h-2.5 w-2.5 rounded-full ${DOT_TONE[tone]}`} />
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-md border border-border bg-surface-alt px-3 py-1 text-ink-muted">
                الصعوبة: <b className="text-primary">متوسطة</b>
              </span>
              <span className="rounded-md border border-border bg-surface-alt px-3 py-1 text-ink-muted">الموضوع: الروابط التساهمية</span>
              <span className="rounded-md border border-accent/30 bg-accent-tint px-3 py-1 font-semibold text-accent">متكيّف</span>
            </div>

            <Card padding="lg" className="mt-4">
              <h2 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                السؤال 3: أي من العبارات التالية بيوصف الرابطة التساهمية بشكل أدق؟
              </h2>
              <div className="mt-5 h-48 rounded-lg bg-gradient-to-br from-primary to-ink sm:h-56" />
            </Card>

            <div className="mt-4 space-y-3">
              {quizOptions.map((option) => {
                const selectedState = selected === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelected(option.key)}
                    aria-pressed={selectedState}
                    className={`flex w-full items-center justify-between rounded-lg border bg-surface-raised px-5 py-4 text-start transition-colors duration-base ${
                      selectedState ? "border-primary" : "border-border hover:bg-surface-alt"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-base font-semibold ${
                          selectedState ? "border-primary bg-primary text-white" : "border-border-strong text-ink-muted"
                        }`}
                      >
                        {option.key}
                      </span>
                      <span className="text-base text-ink">{option.text}</span>
                    </div>
                    {selectedState ? <CheckCircle2 size={21} className="shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink">
                <ArrowRight size={16} />
                السابق
              </button>
              <div className="flex items-center gap-4">
                <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink">
                  تخطّي <ArrowLeft size={16} />
                </button>
                <Button onClick={submit}>ثبّت إجابتك</Button>
              </div>
            </div>
            {submittedMsg ? (
              <p role="status" className="mt-3 text-sm font-medium text-accent">
                {submittedMsg}
              </p>
            ) : null}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}
