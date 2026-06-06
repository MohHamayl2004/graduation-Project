import {
  ArrowRight,
  BookOpen,
  Bot,
  FileUp,
  GraduationCap,
  PlayCircle,
  Target,
  TrendingUp,
  CheckCircle2,
  Globe,
  AtSign
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    title: "Upload Materials",
    desc: "Instantly turn PDFs, notes, and photos of textbooks into interactive study modules.",
    icon: FileUp,
    color: "text-[#2b66de] bg-[#e8eeff]"
  },
  {
    title: "AI Tutor Chat",
    desc: "Ask questions any time of the day. Our AI understands the curriculum context and guides you to answers.",
    icon: Bot,
    color: "text-[#7a3ff2] bg-[#efe7ff]"
  },
  {
    title: "Generated Lectures",
    desc: "AI-generated audio and text summaries that break down complex Palestinian curriculum concepts.",
    icon: PlayCircle,
    color: "text-[#0a8f66] bg-[#e4f7f0]"
  },
  {
    title: "Adaptive Quizzes",
    desc: "Practice tests that get harder as you improve, mirroring real Tawjihi exam formats.",
    icon: BookOpen,
    color: "text-[#5c77d4] bg-[#ebeffb]"
  },
  {
    title: "Progress Tracking",
    desc: "Visual insights into your weak points and strengths across all your subjects.",
    icon: TrendingUp,
    color: "text-[#7a57d8] bg-[#f1eaff]"
  },
  {
    title: "Study Plans",
    desc: "Dynamic schedules that adapt based on your exam dates and learning speed.",
    icon: Target,
    color: "text-[#0f9d6d] bg-[#e3f8ef]"
  }
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-[#1d2436]">
      <header className="sticky top-0 z-30 border-b border-[#d9dcea] bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#1858ca] to-[#3f7bf0] text-white font-bold">N</div>
            <span className="text-3xl font-bold text-[#1456c8]">NIPRAS</span>
          </div>

          <nav className="hidden items-center gap-8 text-[17px] text-[#3f465b] md:flex">
            <button type="button">Features</button>
            <button type="button">How It Works</button>
            <button type="button">For Students</button>
            <button type="button">Pricing</button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="h-11 rounded-xl border border-[#1a57cc] px-6 text-[18px] font-medium text-[#1a57cc]"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="flex h-11 items-center gap-2 rounded-xl bg-[#2b66de] px-6 text-[18px] font-medium text-white shadow-[0_8px_20px_rgba(43,102,222,0.25)]"
            >
              Get Started Free <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute -left-24 top-20 h-[520px] w-[520px] rounded-full bg-[#dff3ff] blur-2xl" />
          <div className="absolute right-6 top-16 h-[540px] w-[540px] rounded-full bg-[#e8e2ff] blur-2xl" />

          <div className="relative mx-auto grid w-full max-w-[1280px] gap-8 px-6 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16">
            <div>
              <span className="inline-flex items-center rounded-full bg-[#efe5ff] px-3 py-1 text-sm font-semibold text-[#6f42f3]">AI-Powered Learning</span>
              <h1 className="mt-5 text-6xl font-semibold leading-tight text-[#1a2237]">
                Your Personal AI Tutor for <span className="text-[#1e5dcf]">Tawjihi Success</span>
              </h1>
              <p className="mt-5 max-w-[640px] text-[22px] leading-9 text-[#4d556c]">
                Upload your study materials. NIPRAS turns them into lectures, quizzes, and personalized study plans — powered by advanced AI for Palestinian students.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="flex h-12 items-center gap-2 rounded-xl bg-[#2b66de] px-6 text-[18px] font-medium text-white shadow-[0_8px_20px_rgba(43,102,222,0.25)]"
                >
                  Start Learning Free <ArrowRight size={16} />
                </button>
                <button type="button" className="flex h-12 items-center gap-2 rounded-xl border border-[#cad0e2] bg-white px-6 text-[18px] text-[#2f364a]"><PlayCircle size={16} /> Watch Demo</button>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[430px] rounded-3xl border border-[#d6d9e5] bg-white p-5 shadow-[0_20px_60px_rgba(31,42,74,0.18)]">
                <div className="mb-3 flex items-center justify-between"><h3 className="text-[34px] font-semibold">Daily Progress</h3><span className="text-[#7f8699]">...</span></div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl bg-[#eef1fb] p-2"><p className="text-[30px] font-semibold text-[#2d66de]">12</p><p className="text-[#5b6277]">Modules</p></div>
                  <div className="rounded-xl bg-[#eef1fb] p-2"><p className="text-[30px] font-semibold text-[#7a3ff2]">85%</p><p className="text-[#5b6277]">Score</p></div>
                  <div className="rounded-xl bg-[#eef1fb] p-2"><p className="text-[30px] font-semibold text-[#0e8a62]">4.2h</p><p className="text-[#5b6277]">Time</p></div>
                </div>
                <div className="my-5 flex justify-center">
                  <div className="grid h-36 w-36 place-items-center rounded-full border-[8px] border-[#2b66de]">
                    <div className="text-center"><p className="text-[40px] font-semibold">72%</p><p className="text-xs text-[#5f677c]">Daily Goal</p></div>
                  </div>
                </div>
                <div className="rounded-xl bg-[#f1eafe] p-3 text-sm text-[#5a3da3]"><p className="font-semibold">NIPRAS AI</p><p>"Great progress today! Want to review the Calculus quiz results now?"</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1280px] px-6 py-12 lg:px-8">
          <h2 className="text-center text-5xl font-semibold">Everything you need to ace Tawjihi</h2>
          <p className="mx-auto mt-3 max-w-[700px] text-center text-[18px] text-[#60677c]">Our comprehensive toolkit is designed to streamline your study process and boost academic performance.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-2xl border border-[#d4d8e6] bg-[#f7f8fd] p-5">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${feature.color}`}><Icon size={20} /></div>
                  <h3 className="mt-4 text-[30px] font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-[16px] leading-7 text-[#5b6276]">{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-[#f1f2f7] py-12">
          <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-8">
            <h2 className="text-center text-5xl font-semibold">From file to full learning experience in 4 steps</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-4">
              {[
                ["01", "Upload"],
                ["02", "AI Analyzes"],
                ["03", "Learn"],
                ["04", "Track"]
              ].map(([n, t]) => (
                <div key={n} className="text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-[#2b66de] bg-white text-[28px] font-semibold text-[#2b66de]">{n}</div>
                  <p className="mt-4 text-[28px] font-semibold">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1280px] gap-8 px-6 py-12 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-[#ece2d2] to-[#d7c4a4] p-6">
            <div className="h-[360px] rounded-2xl bg-gradient-to-br from-[#81b7c0] via-[#ead9bb] to-[#9db17b]" />
          </div>
          <div>
            <h2 className="text-5xl font-semibold">Built for Palestinian Tawjihi Students</h2>
            <ul className="mt-6 space-y-3 text-[18px] text-[#3e4559]">
              {[
                "Study from home, even with limited internet",
                "Full Arabic & English language support",
                "Tawjihi official curriculum alignment",
                "Accessibility for students in remote villages",
                "Free core features to start immediately"
              ].map((item) => (
                <li key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#0d8a62]" />{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1280px] px-6 pb-14 lg:px-8">
          <div className="rounded-[36px] bg-[#2b66de] p-10 text-center text-white shadow-[0_30px_80px_rgba(16,36,84,0.35)]">
            <h2 className="text-6xl font-semibold">Start your AI-powered Tawjihi journey today</h2>
            <p className="mx-auto mt-4 max-w-[760px] text-[20px] text-white/90">Join thousands of students who are changing the way they study. Your brighter future begins with NIPRAS.</p>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-[18px] font-semibold text-[#1e5dce]"
            >
              Create Free Account <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-[#101e3d] text-white">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-12 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#1d57c8] font-bold">N</div>
                <span className="text-4xl font-semibold">NIPRAS</span>
              </div>
              <p className="mt-4 max-w-[360px] text-[17px] leading-8 text-white/80">The leading AI companion for Palestinian students. Making high-quality education accessible and adaptive for everyone.</p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><Globe size={15} /></button>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><AtSign size={15} /></button>
              </div>
            </div>
            <div>
              <h4 className="text-[16px] font-semibold tracking-wide">PRODUCT</h4>
              <ul className="mt-4 space-y-2 text-[16px] text-white/80"><li>AI Tutor</li><li>Quiz Builder</li><li>Study Plans</li><li>Lectures</li></ul>
            </div>
            <div>
              <h4 className="text-[16px] font-semibold tracking-wide">RESOURCES</h4>
              <ul className="mt-4 space-y-2 text-[16px] text-white/80"><li>Documentation</li><li>Help Center</li><li>Student Blog</li><li>Curriculum Info</li></ul>
            </div>
            <div>
              <h4 className="text-[16px] font-semibold tracking-wide">LEGAL</h4>
              <ul className="mt-4 space-y-2 text-[16px] text-white/80"><li>Privacy Policy</li><li>Terms of Service</li><li>Cookie Policy</li></ul>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[16px] text-white/80">
            <p>© 2024 NIPRAS AI Learning. All rights reserved.</p>
            <p>Palestine / Arabic</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
