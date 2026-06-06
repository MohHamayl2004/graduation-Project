import { useState } from "react";
import { Bell, CircleHelp, Search, Clock3, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import { userProfile } from "../../data/userProfile";
import { quizOptions } from "../../data/mockQuizzes";

export default function Quizzes() {
  const [selected, setSelected] = useState("B");
  const [submittedMsg, setSubmittedMsg] = useState("");
  const submit = () => {
    setSubmittedMsg("Answer submitted successfully!");
    setTimeout(() => setSubmittedMsg(""), 1800);
  };

  return (
    <div className="h-screen bg-[#f1f2f7] text-[#1d2436]">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="Quizzes" />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#d7dbe8] bg-[#f8f8fc] px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-full max-w-[520px] items-center gap-3 rounded-full border border-[#c9cfde] bg-[#edeff7] px-4 text-[#5e6578]">
                <Search size={21} />
                <input
                  type="text"
                  placeholder="Search for topics, questions, or notes..."
                  className="w-full bg-transparent text-[18px] outline-none placeholder:text-[#6f7588]"
                />
              </div>

              <div className="flex items-center gap-4 text-[#343b50]">
                <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]"><Bell size={20} /></button>
                <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]"><CircleHelp size={20} /></button>
                <img src={userProfile.avatar} alt={userProfile.name} className="h-11 w-11 rounded-full object-cover" />
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <section className="rounded-3xl border border-[#cfd4e2] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[16px] font-semibold tracking-[0.08em] text-[#4c5368]">ADAPTIVE QUIZ · CHEMISTRY</p>
                  <h1 className="mt-2 text-[46px] font-semibold">Question 3 of 10</h1>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#fdf2dc] px-3 py-1 text-[16px] font-semibold text-[#d48200]"><Clock3 size={15} />12:34</span>
                  <div className="mt-3 flex items-center gap-1.5 justify-end">
                    {[
                      "bg-[#0e8a62]",
                      "bg-[#cc2f2f]",
                      "bg-[#1656cb]",
                      "bg-[#b7bdd0]",
                      "bg-[#b7bdd0]",
                      "bg-[#b7bdd0]",
                      "bg-[#b7bdd0]",
                      "bg-[#b7bdd0]",
                      "bg-[#b7bdd0]",
                      "bg-[#b7bdd0]"
                    ].map((cls, idx) => <span key={String(idx)} className={`h-2.5 w-2.5 rounded-full ${cls}`} />)}
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg border border-[#cfd4e2] bg-[#f4f6fd] px-3 py-1">Difficulty: <b className="text-[#1656cb]">Medium</b></span>
              <span className="rounded-lg border border-[#cfd4e2] bg-[#f4f6fd] px-3 py-1">Topic: Covalent Bonds</span>
              <span className="rounded-lg border border-[#7b4df0] bg-[#f2e9ff] px-3 py-1 font-semibold text-[#6f42f3]">Adaptive</span>
            </div>

            <section className="mt-4 rounded-3xl border border-[#cfd4e2] bg-white p-6">
              <h2 className="text-[52px] font-semibold leading-tight">Question 3: Which of the following best describes a covalent bond?</h2>
              <div className="mt-5 h-56 rounded-2xl bg-[radial-gradient(circle_at_20%_35%,#7bd4ff_0%,#1f5b8d_35%,#102542_80%)]" />
            </section>

            <div className="mt-4 space-y-3">
              {quizOptions.map((option) => {
                const selectedState = selected === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelected(option.key)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition ${
                      selectedState ? "border-[#1656cb] bg-white" : "border-[#cfd4e2] bg-white hover:bg-[#f9faff]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`grid h-9 w-9 place-items-center rounded-full border text-[22px] font-semibold ${selectedState ? "border-[#1656cb] bg-[#1656cb] text-white" : "border-[#9aa3b8] text-[#4f566b]"}`}>
                        {option.key}
                      </span>
                      <span className="text-[21px] text-[#273049]">{option.text}</span>
                    </div>
                    {selectedState ? <CheckCircle2 size={22} className="text-[#1656cb]" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button type="button" className="inline-flex items-center gap-2 text-[18px] text-[#4f566b]"><ArrowLeft size={16} />Previous</button>
              <div className="flex items-center gap-4">
                <button type="button" className="inline-flex items-center gap-2 text-[18px] text-[#4f566b]">Skip <ArrowRight size={16} /></button>
                <button type="button" onClick={submit} className="rounded-xl bg-[#1656cb] px-6 py-3 text-[19px] font-medium text-white">Submit Answer</button>
              </div>
            </div>
            {submittedMsg ? <p className="mt-3 text-sm text-[#22885f]">{submittedMsg}</p> : null}
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







