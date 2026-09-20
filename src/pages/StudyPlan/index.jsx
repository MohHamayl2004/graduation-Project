import { useMemo, useState } from "react";
import { Sparkles, RotateCcw, CheckSquare, Square, FlaskConical, Clock3, Trophy, CheckCircle2, ArrowRight } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { userProfile } from "../../data/userProfile";
import { initialStudyTasks, weeklyScheduleBlocks } from "../../data/mockStudyPlan";

const DAY_BLOCK_TONE = ["border-accent/30 bg-accent-tint text-accent", "border-primary/25 bg-primary-tint text-primary", "border-warning/30 bg-warning-tint text-warning"];

const recommendations = [
  { title: "ركّز على الأحياء", desc: "اختبارك الأخير ببيّن إن الوراثة بدها مراجعة. خصّص 20 دقيقة لمربعات بانيت." },
  { title: "الفيزياء متأخرة", desc: "وحدة الكهرباء متأخرة 3 أيام عن الجدول. عدّلنا الخطّة عشان تلحقها." },
  { title: "متقدّم بالرياضيات", desc: "أتقنت التفاضل الأول بكير! جاهز تبلّش التفاضل المتقدّم اليوم؟" }
];

export default function StudyPlan() {
  const [tasks, setTasks] = useState(initialStudyTasks);
  const [appliedMsg, setAppliedMsg] = useState("");
  const toggleTask = (id) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  };

  const applySuggestions = () => {
    setAppliedMsg("تم تطبيق الاقتراحات بنجاح!");
    setTimeout(() => setAppliedMsg(""), 1800);
  };

  const completedCount = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);

  return (
    <div className="h-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="studyPlan" userName={userProfile.name} userTrack={userProfile.stream} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar searchPlaceholder="ابحث في موادك..." showNotificationDot />

          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">الخطة الدراسية</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1 text-sm font-semibold text-accent">
                    <Sparkles size={14} />
                    مخصّصة بالذكاء الاصطناعي
                  </span>
                </div>
                <p className="mt-1 text-base text-ink-muted">خارطة تعلّم مخصّصة إلك لامتحانات التوجيهي.</p>
                <p className="mt-1 text-sm text-ink-faint">
                  أنجزت اليوم: {completedCount} من {tasks.length} مهام
                </p>
              </div>
              <Button>
                إعادة تجهيز الخطّة <RotateCcw size={16} />
              </Button>
            </div>

            <section className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <Card padding="none">
                  <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="font-display text-2xl font-semibold text-ink">مهام اليوم</h2>
                    <p className="text-sm text-ink-muted">الاثنين، 24 تشرين الأول</p>
                  </div>

                  <div className="space-y-3 p-4">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between rounded-md border px-4 py-4 ${
                          task.done ? "border-border bg-surface-alt" : "border-border bg-surface-raised"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleTask(task.id)}
                            aria-label={task.done ? `اعتبر مهمة ${task.title} غير منجزة` : `اعتبر مهمة ${task.title} منجزة`}
                            className="text-primary"
                          >
                            {task.done ? <CheckSquare size={21} /> : <Square size={21} />}
                          </button>
                          <div>
                            <p className={`text-base ${task.done ? "text-ink-faint line-through" : "text-ink"}`}>{task.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                              {!task.done && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    task.priority === "عالية" ? "bg-error-tint text-error" : "bg-warning-tint text-warning"
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              )}
                              {!task.done && (
                                <>
                                  <span className="inline-flex items-center gap-1">
                                    <FlaskConical size={13} /> {task.subject}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3 size={13} /> {task.duration}
                                  </span>
                                </>
                              )}
                              {task.done && (
                                <span className="inline-flex items-center gap-1 text-accent">
                                  <CheckCircle2 size={14} /> مكتملة
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-medium text-ink-muted">
                          {task.done ? task.duration : <span className="inline-flex items-center gap-1 text-primary">ابدأ <ArrowRight size={14} className="rtl:-scale-x-100" /></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card padding="none">
                  <div className="border-b border-border px-6 py-4">
                    <h2 className="font-display text-2xl font-semibold text-ink">الجدول الأسبوعي</h2>
                  </div>
                  <div className="overflow-x-auto p-4">
                    <div className="grid min-w-[560px] grid-cols-7 gap-2 text-center text-sm text-ink-muted">
                      {Object.keys(weeklyScheduleBlocks).map((day) => (
                        <div key={day}>
                          <p className="mb-2">{day}</p>
                          <div className="space-y-1">
                            {weeklyScheduleBlocks[day].length ? (
                              weeklyScheduleBlocks[day].map((block, idx) => (
                                <div
                                  key={block}
                                  className={`rounded-md border px-2 py-2 text-start text-xs ${DAY_BLOCK_TONE[idx % 3]}`}
                                >
                                  {block}
                                </div>
                              ))
                            ) : (
                              <div className="grid h-24 place-items-center rounded-md border border-dashed border-border bg-surface text-ink-faint">
                                <Trophy size={16} />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <Card padding="lg">
                  <h2 className="font-display text-2xl font-semibold text-ink">أهداف التعلّم</h2>
                  <div className="mt-4 flex justify-center">
                    <div className="relative grid h-32 w-32 place-items-center rounded-full border-[7px] border-primary">
                      <div className="text-center">
                        <p className="text-3xl font-semibold text-ink">53%</p>
                        <p className="text-[10px] font-semibold tracking-wide text-ink-muted">هدف اليوم</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-2xl font-semibold text-ink" dir="ltr">1 س 20 د / 2 س 30 د</p>

                  <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-ink-muted">الالتزام الأسبوعي</p>
                  <div className="mt-3">
                    <div className="flex h-24 items-end gap-1">
                      {[68, 84, 52, 34, 63, 16, 4].map((h, i) => (
                        <div key={String(h) + String(i)} className="flex-1 rounded-t bg-primary" style={{ height: `${h}%`, opacity: 0.5 + i * 0.06 }} />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-ink-muted">
                      <span>ن</span><span>ث</span><span>ر</span><span>خ</span><span>ج</span><span>س</span><span>ح</span>
                    </div>
                  </div>
                </Card>

                <Card padding="lg" className="border-accent/25 bg-accent-tint">
                  <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-accent">
                    <Sparkles size={18} />
                    توصيات ذكية
                  </h2>
                  <div className="mt-4 space-y-3">
                    {recommendations.map((rec) => (
                      <div key={rec.title} className="rounded-md border border-accent/20 bg-surface-raised p-3">
                        <p className="text-sm font-semibold text-ink">{rec.title}</p>
                        <p className="text-sm text-ink-muted">{rec.desc}</p>
                      </div>
                    ))}
                  </div>
                  <Button variant="accent" fullWidth className="mt-4" onClick={applySuggestions}>
                    تطبيق كل الاقتراحات
                  </Button>
                  {appliedMsg ? (
                    <p role="status" className="mt-2 text-center text-sm font-medium text-accent">
                      {appliedMsg}
                    </p>
                  ) : null}
                </Card>
              </div>
            </section>
          </main>

          <Footer brand />
        </div>
      </div>
    </div>
  );
}
