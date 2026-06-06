import { useMemo, useState } from "react";
import {
  Bell,
  CircleHelp,
  Search,
  ChevronRight,
  Sparkles,
  PlayCircle,
  Download,
  Brain,
  Circle,
  CircleDot,
  FileQuestion
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import { userProfile } from "../../data/userProfile";
import { lectureContent, lectureTopics } from "../../data/mockLectures";

export default function Lectures() {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState("Introduction");

  const section = useMemo(() => lectureContent[selectedTopic], [selectedTopic]);

  return (
    <div className="h-screen bg-[#f1f2f7] text-[#1d2436]">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="Lectures" />

        <div className="flex min-w-0 flex-1 flex-col border-r border-[#d7dbe8]">
          <header className="border-b border-[#d7dbe8] bg-[#f8f8fc] px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-full max-w-[520px] items-center gap-3 rounded-full border border-[#c9cfde] bg-[#edeff7] px-4 text-[#5e6578]">
                <Search size={21} />
                <input
                  type="text"
                  placeholder="Search in Chemistry..."
                  className="w-full bg-transparent text-[18px] outline-none placeholder:text-[#6f7588]"
                />
              </div>

              <div className="flex items-center gap-4 text-[#343b50]">
                <button type="button" className="relative rounded-full p-2 hover:bg-[#eaedf6]"><Bell size={20} /><span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#d62828]" /></button>
                <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]"><CircleHelp size={20} /></button>
                <img src={userProfile.avatar} alt={userProfile.name} className="h-11 w-11 rounded-full object-cover" />
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <div className="rounded-2xl border border-[#cfd4e2] bg-white p-6">
              <div className="flex items-center gap-2 text-[15px] text-[#5e6578]">
                <span>My Materials</span><ChevronRight size={15} /><span>Chemistry</span><ChevronRight size={15} /><span>Chapter 3</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#e8ddff] px-3 py-1 text-xs font-semibold tracking-wide text-[#5d2dd1]"><Sparkles size={12} />AI GENERATED</div>
              <h1 className="mt-3 text-[52px] font-semibold leading-tight text-[#1b2338]">{selectedTopic === "Introduction" ? "Chemical Bonds and Molecular Structure" : selectedTopic}</h1>
              <div className="mt-5 flex items-center gap-4">
                <div className="h-3 flex-1 rounded-full bg-[#dbe1ef]"><div className="h-full w-[35%] rounded-full bg-[#1657cb]" /></div>
                <span className="text-[32px] font-semibold text-[#1455c8]">35% complete</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#cfd4e2] bg-white p-6">
              <h2 className="text-[42px] font-semibold">Table of Contents</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {lectureTopics.map((topic) => {
                  const selected = selectedTopic === topic;
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setSelectedTopic(topic)}
                      className={`flex min-h-16 items-center gap-2 rounded-xl border px-4 py-3 text-left text-[17px] ${
                        selected
                          ? "border-[#1b59cb] bg-[#eef3ff] text-[#1253c7]"
                          : "border-[#cfd4e2] bg-[#fbfbfe] text-[#262d41] hover:bg-[#f3f5fb]"
                      }`}
                    >
                      {selected ? <CircleDot size={16} /> : <Circle size={14} />}
                      <span>{topic}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#cfd4e2] bg-white p-8">
              <h3 className="text-[48px] font-semibold text-[#1455c8]">{section.title}</h3>
              <div className="mt-5 max-h-[340px] space-y-5 overflow-y-auto pr-3 text-[20px] leading-10 text-[#353d52]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
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

        <aside className="hidden w-[320px] shrink-0 bg-[#eceef6] px-6 py-6 xl:block">
          <h4 className="text-[14px] font-semibold tracking-[0.14em] text-[#697086]">ACTIONS</h4>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => navigate("/ai-tutor")}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#7f4af0] bg-[#f8f4ff] text-[20px] text-[#6f42f3]"
            >
              <Brain size={18} /> Ask AI Tutor
            </button>
            <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#1d5cd1] bg-white text-[20px] text-[#1d5cd1]"><FileQuestion size={18} /> Generate Quiz</button>
            <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#c3c9d8] bg-[#f7f8fc] text-[20px] text-[#61687b]"><Download size={18} /> Download Lecture</button>
          </div>

          <div className="mt-6 rounded-2xl border border-[#eccb7f] bg-[#fff8e8] p-4">
            <p className="text-[30px] font-semibold text-[#b15a0d]">Weak Areas</p>
            <p className="mt-2 text-[17px] text-[#495166]">AI detected difficulty with:</p>
            <p className="mt-1 text-[18px] font-semibold text-[#8e4207]">Covalent bonds & Electron Sharing</p>
            <button type="button" className="mt-3 h-10 w-full rounded-lg bg-[#f3a311] text-[16px] font-semibold text-white">Quick Remedial Exercise</button>
          </div>

          <div className="mt-6">
            <p className="text-[14px] font-semibold tracking-[0.14em] text-[#697086]">RELATED TOPICS</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                "Periodic Trends",
                "Atomic Structure",
                "Organic Bases"
              ].map((item) => (
                <button key={item} type="button" className="rounded-full border border-[#c3c9d8] bg-[#f9faff] px-4 py-2 text-[16px] text-[#2f374a]">{item}</button>
              ))}
            </div>
          </div>

          <div className="mt-40 rounded-3xl bg-gradient-to-br from-[#6a3fe8] to-[#1f56ca] p-5 text-white">
            <p className="text-[34px] font-semibold">Next Up</p>
            <p className="mt-2 text-[16px] leading-7 text-white/90">
              Based on your progress, I recommend the "VSEPR Lab Simulation" next.
            </p>
            <button type="button" className="mt-4 h-10 w-full rounded-lg bg-white text-[16px] font-semibold text-[#1750c1]">Start Simulation</button>
          </div>
        </aside>
      </div>
    </div>
  );
}



