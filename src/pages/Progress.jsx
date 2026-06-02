import { useState } from "react";
import {
  Bell,
  CircleHelp,
  Search,
  Download,
  Plus,
  BookOpen,
  BarChart3,
  Clock3,
  Flame,
  ChevronDown,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { userProfile } from "../data/userProfile";

const mastery = [
  { subject: "Chemistry", value: 92 },
  { subject: "Physics", value: 68 },
  { subject: "Math", value: 85 },
  { subject: "Biology", value: 74 },
  { subject: "Arabic Language", value: 90 }
];

const lectures = [
  ["Atomic Structures", "45m", "Oct 12, 2023", "#1656cb"],
  ["Integration Basics", "1h 12m", "Oct 11, 2023", "#7a3fe9"],
  ["Cell Division", "52m", "Oct 10, 2023", "#0e7a52"],
  ["Chemical Equilibrium", "38m", "Oct 09, 2023", "#1656cb"]
];

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
    <div className="h-screen bg-[#f1f2f7] text-[#1d2436]">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="Progress" userName={userProfile.name} userTrack={userProfile.stream} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#d7dbe8] bg-[#f8f8fc] px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-full max-w-[520px] items-center gap-3 rounded-full border border-[#c9cfde] bg-[#edeff7] px-4 text-[#5e6578]">
                <Search size={21} />
                <input
                  type="text"
                  placeholder="Search analytics..."
                  className="w-full bg-transparent text-[18px] outline-none placeholder:text-[#6f7588]"
                />
              </div>

              <div className="flex items-center gap-4 text-[#343b50]">
                <button type="button" className="relative rounded-full p-2 hover:bg-[#eaedf6]"><Bell size={20} /><span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#d62828]" /></button>
                <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]"><CircleHelp size={20} /></button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-[54px] font-semibold leading-tight text-[#0f1730]">Your Learning Journey</h1>
                <p className="mt-1 text-[20px] text-[#4f566b]">Real-time insights into your Tawjihi preparation</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={exportReport} type="button" className="flex h-12 items-center gap-2 rounded-xl border border-[#c9cfde] bg-white px-5 text-[18px] text-[#1656cb]">
                  <Download size={17} /> Export Report
                </button>
                <button onClick={() => setShowGoal((v) => !v)} type="button" className="flex h-12 items-center gap-2 rounded-xl bg-[#1656cb] px-5 text-[18px] text-white">
                  <Plus size={17} /> Set New Goal
                </button>
              </div>
            </div>

            {toast ? <p className="mt-3 text-sm text-[#1f8b5b]">{toast}</p> : null}

            {showGoal ? (
              <div className="mt-3 rounded-xl border border-[#ccd2e2] bg-white p-3">
                <p className="text-sm font-medium text-[#4f566b]">New Goal</p>
                <div className="mt-2 flex gap-2">
                  <input value={goalText} onChange={(e) => setGoalText(e.target.value)} className="h-10 flex-1 rounded-lg border border-[#ccd2e2] px-3" />
                  <button type="button" onClick={() => setShowGoal(false)} className="rounded-lg bg-[#1656cb] px-4 text-white">Save</button>
                </div>
              </div>
            ) : null}

            <section className="mt-5 grid gap-4 xl:grid-cols-4">
              <article className="rounded-2xl border border-[#cfd4e2] bg-white p-5">
                <div className="flex items-center justify-between"><BookOpen size={18} className="text-[#1656cb]" /><p className="text-[15px] text-[#18875e]">+2 this week</p></div>
                <p className="mt-3 text-[18px] text-[#4f566b]">Lectures Completed</p>
                <p className="text-[50px] font-semibold">14<span className="text-3xl text-[#5f667a]">/20</span></p>
                <div className="mt-2 h-2 rounded-full bg-[#dbe1ef]"><div className="h-full w-[70%] rounded-full bg-[#1656cb]" /></div>
              </article>
              <article className="rounded-2xl border border-[#cfd4e2] bg-white p-5">
                <div className="flex items-center justify-between"><BarChart3 size={18} className="text-[#0f8a66]" /><p className="text-[15px] text-[#18875e]">+5% increase</p></div>
                <p className="mt-3 text-[18px] text-[#4f566b]">Average Quiz Score</p>
                <p className="text-[50px] font-semibold">78%</p>
              </article>
              <article className="rounded-2xl border border-[#cfd4e2] bg-white p-5">
                <div className="flex items-center justify-between"><Clock3 size={18} className="text-[#6c42ef]" /></div>
                <p className="mt-3 text-[18px] text-[#4f566b]">Total Study Time</p>
                <p className="text-[50px] font-semibold">42h <span className="text-3xl text-[#5f667a]">15m</span></p>
              </article>
              <article className="rounded-2xl border border-[#cfd4e2] bg-white p-5">
                <div className="flex items-center justify-between"><Flame size={18} className="text-[#d84436]" /></div>
                <p className="mt-3 text-[18px] text-[#4f566b]">Study Streak</p>
                <p className="text-[50px] font-semibold">9 Days</p>
              </article>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <article className="rounded-2xl border border-[#cfd4e2] bg-white p-6">
                <div className="mb-5 flex items-center justify-between"><h2 className="text-[42px] font-semibold">Topic Mastery Overview</h2><button type="button" className="flex items-center gap-2 rounded-lg border border-[#cfd4e2] px-3 py-2 text-sm">All Subjects <ChevronDown size={14} /></button></div>
                <div className="space-y-6">
                  {mastery.map((m) => (
                    <div key={m.subject}>
                      <div className="mb-1 flex justify-between text-[18px]"><span>{m.subject}</span><span className="text-[#1656cb]">{m.value}%</span></div>
                      <div className="h-3 rounded-full bg-[#e1e5f1]"><div className="h-full rounded-full bg-[#1656cb]" style={{ width: `${m.value}%` }} /></div>
                    </div>
                  ))}
                </div>
              </article>

              <div className="space-y-4">
                <article className="rounded-2xl border border-[#cfd4e2] bg-white p-6">
                  <h3 className="text-sm font-semibold tracking-[0.14em] text-[#5d6478]">WEEKLY ACTIVITY (HOURS)</h3>
                  <div className="mt-10 flex h-32 items-end gap-2">
                    {[45, 60, 52, 70, 66, 40, 30].map((h, i) => (
                      <div key={String(h)+String(i)} className="flex-1 rounded-t bg-[#1656cb]" style={{ height: `${h}%`, opacity: 0.5 + i * 0.05 }} />
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-[#646b80]"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
                </article>

                <article className="rounded-2xl border border-[#cfd4e2] bg-white p-6">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold tracking-[0.14em] text-[#5d6478]">LEARNING STREAK</h3><p className="text-[18px] text-[#0f7f59]">Great consistency!</p></div>
                  <div className="mt-4 grid grid-cols-7 gap-1.5">
                    {[0,1,3,0,2,3,1,3,2,3,3,0,3,3,2,3,0,3,2,3,3,3,1,3,3,2,0,0].map((v, i) => (
                      <div key={String(v)+String(i)} className={`h-10 rounded ${v===0?"bg-[#d8dbea]":v===1?"bg-[#9ec2b8]":v===2?"bg-[#5f9f8c]":"bg-[#0c6b49]"}`} />
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-2">
              <article className="rounded-2xl border border-[#cfd4e2] bg-white p-6">
                <div className="mb-1 flex items-center justify-between"><h2 className="text-[42px] font-semibold">Quiz Performance History</h2><TrendingUp size={18} className="text-[#1656cb]" /></div>
                <p className="text-[16px] text-[#5b6377]">Last 10 sessions</p>
                <div className="mt-6 h-56 rounded-xl border border-dashed border-[#cfd4e2] bg-[linear-gradient(to_top,_#eaf0ff_0%,_#ffffff_60%)] p-3">
                  <svg viewBox="0 0 400 170" className="h-full w-full">
                    <polyline fill="none" stroke="#1656cb" strokeWidth="3" points="0,150 40,142 80,158 120,118 160,126 200,90 240,98 280,62 320,70 360,45 400,28" />
                  </svg>
                </div>
                <div className="mt-2 grid grid-cols-10 text-center text-xs text-[#676f84]"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span><span>Q5</span><span>Q6</span><span>Q7</span><span>Q8</span><span>Q9</span><span>Q10</span></div>
              </article>

              <article className="rounded-2xl border border-[#cfd4e2] bg-white p-6">
                <h2 className="text-[42px] font-semibold">Recent Completed Lectures</h2>
                <div className="mt-4 overflow-hidden rounded-xl border border-[#d8dcea]">
                  <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr] bg-[#f6f7fb] px-4 py-3 text-sm font-semibold tracking-wide text-[#5f667b]"><span>TOPIC</span><span>DURATION</span><span>DATE</span></div>
                  {lectures.map(([topic, duration, date, color]) => (
                    <div key={topic} className="grid grid-cols-[1.5fr_0.8fr_0.8fr] items-center border-t border-[#e1e5f1] px-4 py-4 text-[18px]">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{topic}</span>
                      <span className="text-[#4f566b]">{duration}</span>
                      <span className="text-[#4f566b]">{date}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="mt-5 rounded-2xl border border-[#d4c6f2] bg-[#efe8ff] p-6">
              <p className="inline-flex items-center rounded-full bg-[#6f42f3] px-3 py-1 text-xs font-semibold text-white">AI POWERED</p>
              <div className="mt-2 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                <div className="flex gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-[#6f42f3]"><Sparkles size={22} /></div>
                  <div>
                    <h3 className="text-[42px] font-semibold text-[#43258f]">Study Strategy Update</h3>
                    <p className="mt-1 text-[18px] leading-8 text-[#4d3f7d]">Based on your recent Physics performance, I recommend focusing on "Electromagnetic Induction" for 30 minutes tomorrow. Your mastery in Organic Chemistry is exceptional, perhaps you can take a mock exam?</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                  <button type="button" onClick={() => navigate("/lectures")} className="rounded-full bg-[#6f42f3] px-6 py-3 text-[18px] text-white">Start Suggested Lesson ?</button>
                  <button type="button" className="rounded-full border border-[#c2b4ea] bg-white px-6 py-3 text-[18px] text-[#6f42f3]">Take Physics Quiz</button>
                </div>
              </div>
            </section>
          </main>

          <footer className="border-t border-[#d7dbe8] bg-[#f8f8fc] px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[#4f556b]">
              <p className="text-[16px]"><span className="font-semibold text-[#1456c8]">NIPRAS</span> © 2024 NIPRAS AI Learning. All rights reserved.</p>
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






