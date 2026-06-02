import { Bell, CircleHelp, Search, Clock3, CirclePlay, Star, Flame, FlaskConical, Zap, Calculator, ArrowRight, Pencil, CircleCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { userProfile } from "../data/userProfile";

const stats = [
  { title: "Daily Goal", value: "1h 45m", note: "60% complete", icon: Clock3, accent: "#1656cb", bar: 60 },
  { title: "Lectures", value: "14 / 20", note: "6 more to reach weekly goal", icon: CirclePlay, accent: "#168056" },
  { title: "Avg. Score", value: "78%", note: "6% trend this week", icon: Star, accent: "#6b42ef" },
  { title: "Streak", value: "9 Days", note: "Personal record: 12 days", icon: Flame, accent: "#f37021" }
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-[#f1f2f7] text-[#1d2436]">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="Dashboard" userName={userProfile.name} userTrack={userProfile.stream} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#d7dbe8] bg-[#f8f8fc] px-8 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-full max-w-[520px] items-center gap-3 rounded-full border border-[#c9cfde] bg-[#edeff7] px-4 text-[#5e6578]">
                <Search size={21} />
                <input
                  type="text"
                  placeholder="Search lessons, quizzes, or AI help..."
                  className="w-full bg-transparent text-[18px] outline-none placeholder:text-[#6f7588]"
                />
              </div>

              <div className="flex items-center gap-4 text-[#343b50]">
                <button type="button" className="relative rounded-full p-2 hover:bg-[#eaedf6]">
                  <Bell size={20} />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#d62828]" />
                </button>
                <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]"><CircleHelp size={20} /></button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
            <h1 className="text-[54px] font-semibold leading-tight text-[#0f1730]">Good morning, Mohammad ??</h1>
            <p className="mt-1 text-[18px] text-[#4f556b]">October 24, 2024 • Tawjihi Scientific Stream</p>

            <section className="mt-6 grid gap-4 xl:grid-cols-4">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-2xl border border-[#cfd4e2] bg-white p-4 shadow-[0_8px_18px_rgba(22,31,60,0.06)]">
                    <div className="flex items-center justify-between">
                      <Icon size={20} style={{ color: item.accent }} />
                      <p className="text-[16px] text-[#4d5468]">{item.title}</p>
                    </div>
                    <p className="mt-2 text-[40px] font-semibold text-[#1e2537]">{item.value}</p>
                    <p className={`text-[16px] ${item.title === "Avg. Score" ? "text-[#14805a]" : "text-[#4f556b]"}`}>{item.note}</p>
                    {item.bar ? (
                      <div className="mt-3 h-2 rounded-full bg-[#d9deee]">
                        <div className="h-full rounded-full bg-[#1e58ca]" style={{ width: `${item.bar}%` }} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-[#cfd4e2] bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[42px] font-semibold text-[#1e2537]">Today&apos;s Study Plan</h2>
                  <button type="button" className="text-[16px] font-semibold text-[#1a57cb]">View Calendar</button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-[#cfd4e2] px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#e8ecfa] text-[#1b58cb]"><FlaskConical size={20} /></div>
                      <div>
                        <p className="text-[18px] font-semibold">Chemistry Lecture</p>
                        <p className="text-[16px] text-[#4f566b]">Chapter 4: Organic Bases • 45 min</p>
                      </div>
                    </div>
                    <CirclePlay size={20} className="text-[#4f566b]" />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#cfd4e2] px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#ede7ff] text-[#6c42ef]"><Zap size={20} /></div>
                      <div>
                        <p className="text-[18px] font-semibold">Physics Quiz</p>
                        <p className="text-[16px] text-[#4f566b]">Electromagnetism Review • 20 Questions</p>
                      </div>
                    </div>
                    <Pencil size={20} className="text-[#4f566b]" />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#cfd4e2] px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#e8edf8] text-[#0f8a69]"><Calculator size={20} /></div>
                      <div>
                        <p className="text-[18px] font-semibold">Math Practice</p>
                        <p className="text-[16px] text-[#4f566b]">Integration Techniques • 10 Problems</p>
                      </div>
                    </div>
                    <CircleCheck size={20} className="text-[#4f566b]" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl bg-gradient-to-br from-[#6f42f3] to-[#8b4df8] p-5 text-white shadow-[0_10px_24px_rgba(96,55,214,0.35)]">
                  <h3 className="flex items-center gap-2 text-[40px] font-semibold"><Sparkles size={18} /> AI Tutor Support</h3>
                  <p className="mt-2 text-[16px] text-white/90">Stuck on a problem? Ask NIPRAS for a hint or a breakdown.</p>
                  <textarea
                    placeholder="Paste your question here..."
                    className="mt-4 h-28 w-full resize-none rounded-xl border border-white/25 bg-white/10 p-3 text-[16px] text-white placeholder:text-white/70 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => navigate("/ai-tutor")}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[19px] font-semibold text-[#6a3de9]"
                  >
                    Ask AI <ArrowRight size={18} />
                  </button>
                </div>

                <div className="rounded-2xl border border-[#cfd4e2] bg-white p-5">
                  <h3 className="text-[34px] font-semibold">Topics to Focus On</h3>
                  <div className="mt-3 space-y-3 text-[16px]">
                    <div>
                      <div className="mb-1 flex items-center justify-between"><span>Calculus: Integrals</span><span className="font-semibold text-[#c72727]">42% Mastery</span></div>
                      <div className="h-2 rounded-full bg-[#dfe3f1]"><div className="h-full w-[42%] rounded-full bg-[#cf2929]" /></div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between"><span>Organic Chemistry</span><span className="font-semibold text-[#ea6c1d]">58% Mastery</span></div>
                      <div className="h-2 rounded-full bg-[#dfe3f1]"><div className="h-full w-[58%] rounded-full bg-[#ea6c1d]" /></div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between"><span>Thermodynamics</span><span className="font-semibold text-[#15845b]">65% Mastery</span></div>
                      <div className="h-2 rounded-full bg-[#dfe3f1]"><div className="h-full w-[65%] rounded-full bg-[#15845b]" /></div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#cfd4e2] bg-white p-5">
                  <h3 className="text-[34px] font-semibold">Upcoming Assessments</h3>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-3 rounded-xl bg-[#eceff8] p-3">
                      <div className="rounded-lg bg-white px-3 py-2 text-center"><p className="text-xs text-[#666e85]">OCT</p><p className="text-3xl font-semibold">26</p></div>
                      <div><p className="text-[18px] font-semibold">Biology Midterm</p><p className="text-[15px] text-[#596077]">09:00 AM • Main Hall</p></div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-[#d7dbe8] p-3">
                      <div className="rounded-lg bg-white px-3 py-2 text-center border border-[#cfd4e2]"><p className="text-xs text-[#666e85]">OCT</p><p className="text-3xl font-semibold">28</p></div>
                      <div><p className="text-[18px] font-semibold">AI Prediction Quiz</p><p className="text-[15px] text-[#596077]">Online • Physics</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div>
                <h2 className="text-[42px] font-semibold text-[#0f1730]">Continue Learning</h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <article className="overflow-hidden rounded-2xl border border-[#cfd4e2] bg-white">
                    <div className="relative h-40 bg-gradient-to-br from-[#0a0f2a] via-[#3a1666] to-[#102f75]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,89,182,0.35),_transparent_55%)]" />
                      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-sm text-white">12:45 Left</span>
                    </div>
                    <div className="p-4">
                      <p className="text-[16px] font-semibold text-[#1656cb]">Physics</p>
                      <p className="text-[19px]">Lesson 7: Magnetic Flux & Induction</p>
                      <div className="mt-3 h-1.5 rounded-full bg-[#dbe0ef]"><div className="h-full w-[45%] rounded-full bg-[#1656cb]" /></div>
                    </div>
                  </article>
                  <article className="overflow-hidden rounded-2xl border border-[#cfd4e2] bg-white">
                    <div className="relative h-40 bg-gradient-to-br from-[#08162e] via-[#0b3d63] to-[#1a2b53]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,200,85,0.30),_transparent_58%)]" />
                      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-sm text-white">08:20 Left</span>
                    </div>
                    <div className="p-4">
                      <p className="text-[16px] font-semibold text-[#15845b]">Chemistry</p>
                      <p className="text-[19px]">Atomic Structure: Bohr&apos;s Model</p>
                      <div className="mt-3 h-1.5 rounded-full bg-[#dbe0ef]"><div className="h-full w-[60%] rounded-full bg-[#15845b]" /></div>
                    </div>
                  </article>
                </div>
              </div>

              <div />
            </section>

            <section className="mt-6 rounded-2xl border border-[#cfd4e2] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[42px] font-semibold">Weekly Study Activity</h2>
                  <p className="text-[16px] text-[#5e6479]">Tracking your focus time across the week</p>
                </div>
                <div className="rounded-full bg-[#eff1f8] px-4 py-2 text-[14px] text-[#4d5469]">
                  <span className="mr-4 inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#1857cb]" />Study Time</span>
                  <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#b7bccd]" />Daily Goal (1h)</span>
                </div>
              </div>

              <div className="mt-6 h-64 rounded-xl border border-dashed border-[#cfd4e2] bg-[linear-gradient(to_top,_#f5f6fb,_#ffffff)]" />
              <div className="mt-3 flex justify-between px-3 text-[14px] text-[#586077]">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </section>
          </main>

          <footer className="border-t border-[#d7dbe8] bg-[#f8f8fc] px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[#4f556b]">
              <p className="text-[16px]">© 2024 NIPRAS AI Learning. All rights reserved.</p>
              <div className="flex flex-wrap items-center gap-8 text-[16px]">
                <button type="button">About Us</button>
                <button type="button">Privacy Policy</button>
                <button type="button">Terms of Service</button>
                <button type="button">Support</button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}


