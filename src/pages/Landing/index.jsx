import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  FileUp,
  PlayCircle,
  Target,
  TrendingUp,
  CheckCircle2,
  Globe,
  AtSign,
  Menu,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/common/Logo";
import Button from "../../components/common/Button";

const features = [
  {
    title: "Upload Materials",
    desc: "Instantly turn PDFs, notes, and photos of textbooks into interactive study modules.",
    icon: FileUp,
    tone: "bg-primary-tint text-primary"
  },
  {
    title: "AI Tutor Chat",
    desc: "Ask questions any time of the day. Our AI understands the curriculum context and guides you to answers.",
    icon: Bot,
    tone: "bg-accent-tint text-accent"
  },
  {
    title: "Generated Lectures",
    desc: "AI-generated audio and text summaries that break down complex Palestinian curriculum concepts.",
    icon: PlayCircle,
    tone: "bg-primary-tint text-primary"
  },
  {
    title: "Adaptive Quizzes",
    desc: "Practice tests that get harder as you improve, mirroring real Tawjihi exam formats.",
    icon: BookOpen,
    tone: "bg-accent-tint text-accent"
  },
  {
    title: "Progress Tracking",
    desc: "Visual insights into your weak points and strengths across all your subjects.",
    icon: TrendingUp,
    tone: "bg-primary-tint text-primary"
  },
  {
    title: "Study Plans",
    desc: "Dynamic schedules that adapt based on your exam dates and learning speed.",
    icon: Target,
    tone: "bg-accent-tint text-accent"
  }
];

const navLinks = ["Features", "How It Works", "For Students", "Pricing"];

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-30 border-b border-border bg-surface-raised/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Logo height={28} />

          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-muted lg:flex">
            {navLinks.map((link) => (
              <button key={link} type="button" className="hover:text-ink">
                {link}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Button variant="outline" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button onClick={() => navigate("/signup")}>
              Get Started Free <ArrowRight size={16} />
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="grid h-11 w-11 place-items-center rounded-md text-ink lg:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-border px-5 py-4 lg:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-ink-muted">
              {navLinks.map((link) => (
                <button key={link} type="button" className="rounded-md px-2 py-2.5 text-left hover:bg-surface-alt hover:text-ink">
                  {link}
                </button>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="outline" fullWidth onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button fullWidth onClick={() => navigate("/signup")}>
                Get Started Free <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute -left-24 top-20 h-[420px] w-[420px] rounded-full bg-primary-tint blur-3xl" />
          <div className="absolute right-6 top-16 h-[440px] w-[440px] rounded-full bg-accent-tint blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-[1280px] gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
            <div>
              <span className="inline-flex items-center rounded-full bg-accent-tint px-3 py-1 text-sm font-semibold text-accent">
                AI-Powered Learning
              </span>
              <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.08] text-ink sm:text-6xl">
                Your Personal AI Tutor for <span className="text-primary">Tawjihi Success</span>
              </h1>
              <p className="mt-5 max-w-[600px] text-lg leading-8 text-ink-muted">
                Upload your study materials. NIPRAS turns them into lectures, quizzes, and personalized study
                plans — powered by advanced AI for Palestinian students.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => navigate("/signup")}>
                  Start Learning Free <ArrowRight size={16} />
                </Button>
                <Button size="lg" variant="secondary">
                  <PlayCircle size={16} /> Watch Demo
                </Button>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[420px] rounded-xl border border-border bg-surface-raised p-5 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-xl font-semibold text-ink">Daily Progress</h3>
                  <span className="text-ink-faint">···</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md bg-primary-tint p-2">
                    <p className="text-2xl font-semibold text-primary">12</p>
                    <p className="text-ink-muted">Modules</p>
                  </div>
                  <div className="rounded-md bg-accent-tint p-2">
                    <p className="text-2xl font-semibold text-accent">85%</p>
                    <p className="text-ink-muted">Score</p>
                  </div>
                  <div className="rounded-md bg-warning-tint p-2">
                    <p className="text-2xl font-semibold text-warning">4.2h</p>
                    <p className="text-ink-muted">Time</p>
                  </div>
                </div>
                <div className="my-5 flex justify-center">
                  <div className="grid h-32 w-32 place-items-center rounded-full border-[7px] border-primary">
                    <div className="text-center">
                      <p className="text-3xl font-semibold text-ink">72%</p>
                      <p className="text-xs text-ink-muted">Daily Goal</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-md bg-accent-tint p-3 text-sm text-accent">
                  <p className="font-semibold">NIPRAS AI</p>
                  <p>&ldquo;Great progress today! Want to review the Calculus quiz results now?&rdquo;</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1280px] px-5 py-14 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-4xl font-semibold text-ink sm:text-5xl">
            Everything you need to ace Tawjihi
          </h2>
          <p className="mx-auto mt-3 max-w-[680px] text-center text-lg text-ink-muted">
            Our comprehensive toolkit is designed to streamline your study process and boost academic performance.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-lg border border-border bg-surface-raised p-5 shadow-sm">
                  <div className={`grid h-11 w-11 place-items-center rounded-md ${feature.tone}`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-ink-muted">{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-surface-alt py-14">
          <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-8">
            <h2 className="text-center font-display text-4xl font-semibold text-ink sm:text-5xl">
              From file to full learning experience in 4 steps
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["01", "Upload"],
                ["02", "AI Analyzes"],
                ["03", "Learn"],
                ["04", "Track"]
              ].map(([n, t]) => (
                <div key={n} className="text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-primary bg-surface-raised text-xl font-semibold text-primary">
                    {n}
                  </div>
                  <p className="mt-4 text-xl font-semibold text-ink">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1280px] gap-8 px-5 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-xl bg-gradient-to-br from-[#ece2d2] to-[#d7c4a4] p-6">
            <div className="h-[300px] rounded-lg bg-gradient-to-br from-primary via-[#3f5a99] to-accent sm:h-[360px]" />
          </div>
          <div>
            <h2 className="font-display text-4xl font-semibold text-ink sm:text-5xl">Built for Palestinian Tawjihi Students</h2>
            <ul className="mt-6 space-y-3 text-lg text-ink">
              {[
                "Study from home, even with limited internet",
                "Full Arabic & English language support",
                "Tawjihi official curriculum alignment",
                "Accessibility for students in remote villages",
                "Free core features to start immediately"
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1280px] px-5 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-primary p-8 text-center text-white shadow-lg sm:p-10">
            <h2 className="font-display text-4xl font-semibold sm:text-5xl">
              Start your AI-powered Tawjihi journey today
            </h2>
            <p className="mx-auto mt-4 max-w-[680px] text-lg text-white/85">
              Join thousands of students who are changing the way they study. Your brighter future begins with
              NIPRAS.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8 border-none bg-white text-primary hover:bg-white/90"
              onClick={() => navigate("/signup")}
            >
              Create Free Account <ArrowRight size={16} />
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-primary text-white">
        <div className="mx-auto w-full max-w-[1280px] px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo variant="white" height={26} />
              <p className="mt-4 max-w-[360px] text-sm leading-7 text-white/75">
                The leading AI companion for Palestinian students. Making high-quality education accessible and
                adaptive for everyone.
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" aria-label="Website" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/15">
                  <Globe size={15} />
                </button>
                <button type="button" aria-label="Contact" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/15">
                  <AtSign size={15} />
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">PRODUCT</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>AI Tutor</li>
                <li>Quiz Builder</li>
                <li>Study Plans</li>
                <li>Lectures</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">RESOURCES</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>Documentation</li>
                <li>Help Center</li>
                <li>Student Blog</li>
                <li>Curriculum Info</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold tracking-wide">LEGAL</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Cookie Policy</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/75">
            <p>&copy; 2024 NIPRAS AI Learning. All rights reserved.</p>
            <p>Palestine / Arabic</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
