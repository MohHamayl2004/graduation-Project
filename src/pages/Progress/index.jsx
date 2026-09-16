import { useState } from "react";
import { Download, Plus, BookOpen, BarChart3, Clock3, Flame, ChevronDown, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import ProgressBar from "../../components/common/ProgressBar";
import { userProfile } from "../../data/userProfile";
import { completedLectures, masteryOverview } from "../../data/mockProgress";

const weeklyHours = [45, 60, 52, 70, 66, 40, 30];
const streakIntensity = [
  0, 1, 3, 0, 2, 3, 1, 3, 2, 3, 3, 0, 3, 3, 2, 3, 0, 3, 2, 3, 3, 3, 1, 3, 3, 2, 0, 0
];
const STREAK_TONE = ["bg-surface-alt", "bg-accent/30", "bg-accent/60", "bg-accent"];

export default function Progress() {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const [showGoal, setShowGoal] = useState(false);
  const [goalText, setGoalText] = useState("Complete 3 lectures this week");
  const exportReport = () => {
    setToast("Report exported successfully!");
    setTimeout(() => setToast(""), 1800);
  };

  return (
    <div className="h-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="progress" userName={userProfile.name} userTrack={userProfile.stream} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar searchPlaceholder="Search analytics..." showNotificationDot />

          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">Your Learning Journey</h1>
                <p className="mt-1 text-base text-ink-muted">Real-time insights into your Tawjihi preparation</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={exportReport}>
                  <Download size={17} /> Export Report
                </Button>
                <Button onClick={() => setShowGoal((v) => !v)}>
                  <Plus size={17} /> Set New Goal
                </Button>
              </div>
            </div>

            {toast ? (
              <p role="status" className="mt-3 text-sm font-medium text-accent">
                {toast}
              </p>
            ) : null}

            {showGoal ? (
              <Card padding="sm" className="mt-3">
                <label htmlFor="goalText" className="text-sm font-medium text-ink-muted">
                  New Goal
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="goalText"
                    value={goalText}
                    onChange={(e) => setGoalText(e.target.value)}
                    className="h-10 flex-1 rounded-md border border-border-strong px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  <Button size="sm" onClick={() => setShowGoal(false)}>
                    Save
                  </Button>
                </div>
              </Card>
            ) : null}

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <div className="flex items-center justify-between">
                  <BookOpen size={18} className="text-primary" />
                  <p className="text-sm text-accent">+2 this week</p>
                </div>
                <p className="mt-3 text-sm text-ink-muted">Lectures Completed</p>
                <p className="text-3xl font-semibold text-ink">
                  14<span className="text-lg text-ink-faint">/20</span>
                </p>
                <div className="mt-2">
                  <ProgressBar value={70} size="sm" />
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <BarChart3 size={18} className="text-accent" />
                  <p className="text-sm text-accent">+5% increase</p>
                </div>
                <p className="mt-3 text-sm text-ink-muted">Average Quiz Score</p>
                <p className="text-3xl font-semibold text-ink">78%</p>
              </Card>
              <Card>
                <Clock3 size={18} className="text-primary" />
                <p className="mt-3 text-sm text-ink-muted">Total Study Time</p>
                <p className="text-3xl font-semibold text-ink">
                  42h <span className="text-lg text-ink-faint">15m</span>
                </p>
              </Card>
              <Card>
                <Flame size={18} className="text-warning" />
                <p className="mt-3 text-sm text-ink-muted">Study Streak</p>
                <p className="text-3xl font-semibold text-ink">9 Days</p>
              </Card>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <Card padding="lg">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-2xl font-semibold text-ink">Topic Mastery Overview</h2>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-alt"
                  >
                    All Subjects <ChevronDown size={14} />
                  </button>
                </div>
                <div className="space-y-5">
                  {masteryOverview.map((m) => (
                    <div key={m.subject}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-ink">{m.subject}</span>
                        <span className="font-semibold text-primary">{m.value}%</span>
                      </div>
                      <ProgressBar value={m.value} />
                    </div>
                  ))}
                </div>
              </Card>

              <div className="space-y-4">
                <Card padding="lg">
                  <h3 className="text-xs font-semibold tracking-[0.14em] text-ink-muted">WEEKLY ACTIVITY (HOURS)</h3>
                  <div className="mt-8 flex h-28 items-end gap-2">
                    {weeklyHours.map((h, i) => (
                      <div
                        key={String(h) + String(i)}
                        className="flex-1 rounded-t bg-primary"
                        style={{ height: `${h}%`, opacity: 0.5 + i * 0.05 }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-ink-muted">
                    <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                  </div>
                </Card>

                <Card padding="lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold tracking-[0.14em] text-ink-muted">LEARNING STREAK</h3>
                    <p className="text-sm font-medium text-accent">Great consistency!</p>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-1.5">
                    {streakIntensity.map((v, i) => (
                      <div key={String(v) + String(i)} className={`h-9 rounded ${STREAK_TONE[v]}`} />
                    ))}
                  </div>
                </Card>
              </div>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-2">
              <Card padding="lg">
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="font-display text-2xl font-semibold text-ink">Quiz Performance History</h2>
                  <TrendingUp size={18} className="text-primary" />
                </div>
                <p className="text-sm text-ink-muted">Last 10 sessions</p>
                <div className="mt-6 h-48 rounded-md border border-dashed border-border bg-gradient-to-t from-primary-tint to-surface-raised p-3 sm:h-56">
                  <svg viewBox="0 0 400 170" className="h-full w-full text-primary">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points="0,150 40,142 80,158 120,118 160,126 200,90 240,98 280,62 320,70 360,45 400,28"
                    />
                  </svg>
                </div>
                <div className="mt-2 grid grid-cols-10 text-center text-xs text-ink-muted">
                  <span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span><span>Q5</span><span>Q6</span><span>Q7</span><span>Q8</span><span>Q9</span><span>Q10</span>
                </div>
              </Card>

              <Card padding="lg">
                <h2 className="font-display text-2xl font-semibold text-ink">Recent Completed Lectures</h2>
                <div className="mt-4 overflow-hidden rounded-md border border-border">
                  <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr] bg-surface-alt px-4 py-3 text-xs font-semibold tracking-wide text-ink-muted">
                    <span>TOPIC</span><span>DURATION</span><span>DATE</span>
                  </div>
                  {completedLectures.map(([topic, duration, date, color]) => (
                    <div key={topic} className="grid grid-cols-[1.5fr_0.8fr_0.8fr] items-center border-t border-border px-4 py-4 text-sm">
                      <span className="flex items-center gap-2 text-ink">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        {topic}
                      </span>
                      <span className="text-ink-muted">{duration}</span>
                      <span className="text-ink-muted">{date}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="mt-5 rounded-lg bg-primary p-6 text-white">
              <p className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold">AI POWERED</p>
              <div className="mt-3 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                <div className="flex gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold">Study Strategy Update</h3>
                    <p className="mt-1 text-sm leading-7 text-white/80">
                      Based on your recent Physics performance, I recommend focusing on &ldquo;Electromagnetic
                      Induction&rdquo; for 30 minutes tomorrow. Your mastery in Organic Chemistry is exceptional,
                      perhaps you can take a mock exam?
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                  <Button variant="accent" onClick={() => navigate("/lectures")} className="rounded-full">
                    Start Suggested Lesson <ArrowRight size={16} />
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-full border-white/25 bg-transparent text-white hover:bg-white/10"
                  >
                    Take Physics Quiz
                  </Button>
                </div>
              </div>
            </section>
          </main>

          <Footer brand />
        </div>
      </div>
    </div>
  );
}
