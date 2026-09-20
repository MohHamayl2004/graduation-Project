import { CirclePlay, FlaskConical, Zap, Calculator, ArrowRight, Pencil, CircleCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import ProgressBar from "../../components/common/ProgressBar";
import { userProfile } from "../../data/userProfile";
import { dashboardStats } from "../../data/mockDashboard";

const weeklyActivity = [
  { day: "ن", minutes: 42 },
  { day: "ث", minutes: 68 },
  { day: "ر", minutes: 35 },
  { day: "خ", minutes: 74 },
  { day: "ج", minutes: 50 },
  { day: "س", minutes: 20 },
  { day: "ح", minutes: 58 }
];
const dailyGoalMinutes = 60;
const weeklyMax = Math.max(dailyGoalMinutes, ...weeklyActivity.map((d) => d.minutes));

const studyPlanItems = [
  {
    title: "درس الكيمياء",
    detail: "الفصل الرابع: القواعد العضوية — 45 دقيقة",
    icon: FlaskConical,
    tone: "bg-primary-tint text-primary",
    action: CirclePlay
  },
  {
    title: "اختبار الفيزياء",
    detail: "مراجعة الكهرومغناطيسية — 20 سؤالًا",
    icon: Zap,
    tone: "bg-accent-tint text-accent",
    action: Pencil
  },
  {
    title: "تدريب الرياضيات",
    detail: "أساليب التكامل — 10 مسائل",
    icon: Calculator,
    tone: "bg-warning-tint text-warning",
    action: CircleCheck
  }
];

const TOPIC_TEXT_TONE = {
  error: "text-error",
  warning: "text-warning",
  accent: "text-accent"
};

const focusTopics = [
  { label: "التفاضل والتكامل: التكاملات", mastery: 42, tone: "error" },
  { label: "الكيمياء العضوية", mastery: 58, tone: "warning" },
  { label: "الديناميكا الحرارية", mastery: 65, tone: "accent" }
];

const upcomingAssessments = [
  { date: { month: "تشرين أول", day: "26" }, title: "امتحان الأحياء النصفي", detail: "09:00 صباحًا — القاعة الرئيسية", filled: true },
  { date: { month: "تشرين أول", day: "28" }, title: "اختبار توقّعي ذكي", detail: "عبر الإنترنت — الفيزياء", filled: false }
];

const continueLearning = [
  {
    subject: "الفيزياء",
    title: "الدرس 7: التدفق والحث المغناطيسي",
    progress: 45,
    timeLeft: "باقي 12:45",
    from: "from-primary",
    to: "to-[#2A4C9E]"
  },
  {
    subject: "الكيمياء",
    title: "تركيب الذرة: نموذج بور",
    progress: 60,
    timeLeft: "باقي 08:20",
    from: "from-accent",
    to: "to-[#2E9C52]"
  }
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="dashboard" userName={userProfile.name} userTrack={userProfile.stream} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar searchPlaceholder="ابحث عن درس أو اختبار أو مساعدة..." showNotificationDot />

          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8">
            <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              صباح الخير، {userProfile.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-base text-ink-muted">24 تشرين الأول 2024 — الفرع العلمي</p>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {dashboardStats.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title}>
                    <div className="flex items-center justify-between">
                      <Icon size={19} style={{ color: item.accent }} />
                      <p className="text-sm text-ink-muted">{item.title}</p>
                    </div>
                    <p className="mt-2 text-3xl font-semibold text-ink">{item.value}</p>
                    <p className={`text-sm ${item.title === "متوسط العلامات" ? "text-accent" : "text-ink-muted"}`}>{item.note}</p>
                    {item.bar ? (
                      <div className="mt-3">
                        <ProgressBar value={item.bar} size="sm" />
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-2xl font-semibold text-ink">خطّة دراسة اليوم</h2>
                  <button type="button" className="text-sm font-semibold text-primary hover:underline">
                    عرض التقويم
                  </button>
                </div>

                <div className="space-y-3">
                  {studyPlanItems.map((item) => {
                    const Icon = item.icon;
                    const Action = item.action;
                    return (
                      <div
                        key={item.title}
                        className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${item.tone}`}>
                            <Icon size={19} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-ink">{item.title}</p>
                            <p className="truncate text-sm text-ink-muted">{item.detail}</p>
                          </div>
                        </div>
                        <Action size={19} className="shrink-0 text-ink-muted" />
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div className="space-y-4">
                <div className="rounded-lg bg-primary p-5 text-white shadow-md">
                  <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
                    <Sparkles size={18} /> مساعدة المعلّم الذكي
                  </h3>
                  <p className="mt-2 text-sm text-white/80">واقف معك سؤال؟ اسأل نبراس وخذ تلميح أو شرح خطوة خطوة.</p>
                  <textarea
                    placeholder="اكتب سؤالك هون..."
                    aria-label="اسأل المعلّم الذكي"
                    className="mt-4 h-24 w-full resize-none rounded-md border border-white/20 bg-white/10 p-3 text-sm text-white outline-none placeholder:text-white/60 focus:border-white/40"
                  />
                  <Button
                    variant="secondary"
                    fullWidth
                    className="mt-4 border-none bg-white text-primary hover:bg-white/90"
                    onClick={() => navigate("/ai-tutor")}
                  >
                    اسأل نبراس <ArrowRight size={17} className="rtl:-scale-x-100" />
                  </Button>
                </div>

                <Card>
                  <h3 className="font-display text-xl font-semibold text-ink">مواضيع بدها تركيز</h3>
                  <div className="mt-3 space-y-3 text-sm">
                    {focusTopics.map((topic) => (
                      <div key={topic.label}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-ink">{topic.label}</span>
                          <span className={`font-semibold ${TOPIC_TEXT_TONE[topic.tone]}`}>إتقان {topic.mastery}%</span>
                        </div>
                        <ProgressBar value={topic.mastery} tone={topic.tone} size="sm" />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <h3 className="font-display text-xl font-semibold text-ink">الاختبارات القادمة</h3>
                  <div className="mt-3 space-y-3">
                    {upcomingAssessments.map((item) => (
                      <div
                        key={item.title}
                        className={`flex items-center gap-3 rounded-md p-3 ${
                          item.filled ? "bg-surface-alt" : "border border-border"
                        }`}
                      >
                        <div
                          className={`rounded-md px-3 py-2 text-center ${item.filled ? "bg-surface-raised" : "border border-border bg-surface-raised"}`}
                        >
                          <p className="text-xs text-ink-muted">{item.date.month}</p>
                          <p className="text-2xl font-semibold text-ink">{item.date.day}</p>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-ink">{item.title}</p>
                          <p className="text-sm text-ink-muted">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">كمّل تعلّمك</h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {continueLearning.map((item) => (
                    <article key={item.title} className="overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm">
                      <div className={`relative h-36 bg-gradient-to-br ${item.from} ${item.to}`}>
                        <span className="absolute bottom-2 end-2 rounded bg-ink/60 px-2 py-1 text-xs text-white">
                          {item.timeLeft}
                        </span>
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-semibold text-primary">{item.subject}</p>
                        <p className="text-base text-ink">{item.title}</p>
                        <div className="mt-3">
                          <ProgressBar value={item.progress} size="sm" />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div />
            </section>

            <Card className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">نشاطك الدراسي الأسبوعي</h2>
                  <p className="text-sm text-ink-muted">متابعة وقت تركيزك خلال الأسبوع</p>
                </div>
                <div className="flex items-center gap-4 rounded-full bg-surface-alt px-4 py-2 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    وقت الدراسة
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
                    هدف اليوم ({dailyGoalMinutes} دقيقة)
                  </span>
                </div>
              </div>

              <div className="mt-6 flex h-52 items-end gap-3 sm:gap-5">
                {weeklyActivity.map((item) => (
                  <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative flex h-full w-full max-w-10 items-end justify-center rounded-t-sm bg-surface-alt">
                      <span
                        className="w-full rounded-t-sm bg-primary transition-[height] duration-slow ease-out"
                        style={{ height: `${(item.minutes / weeklyMax) * 100}%` }}
                      />
                      <span
                        className="absolute left-1/2 w-full max-w-10 -translate-x-1/2 border-t-2 border-dashed border-border-strong"
                        style={{ bottom: `${(dailyGoalMinutes / weeklyMax) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-muted">{item.day}</span>
                  </div>
                ))}
              </div>
            </Card>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}
