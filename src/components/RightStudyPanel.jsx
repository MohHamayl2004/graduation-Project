import { FlaskConical, Clock3, PlayCircle } from "lucide-react";
import { useState } from "react";

const weakAreas = [
  { title: "VSEPR Theory", subtitle: "Last Quiz: 45%", color: "#c4252d" },
  { title: "Metallic Bonding", subtitle: "Low interaction", color: "#a65016" }
];

export default function RightStudyPanel() {
  const [flashcardMsg, setFlashcardMsg] = useState("");

  const createNow = () => {
    setFlashcardMsg("Flashcards generated for Chapter 3.");
    setTimeout(() => setFlashcardMsg(""), 1800);
  };

  return (
    <aside className="hidden w-[320px] shrink-0 bg-[#ececf2] px-6 py-8 xl:block">
      <h3 className="text-[40px] leading-none">Study Insights</h3>

      <div className="mt-7 rounded-3xl border border-[#cfd3e0] bg-[#f7f8fc] p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-[33px]">
          <span>Chapter 3 Progress</span>
          <span className="font-semibold text-[#1f65d6]">68%</span>
        </div>
        <div className="h-3 rounded-full bg-[#d9def0]">
          <div className="h-full w-[68%] rounded-full bg-[#1f65d6]" />
        </div>
        <p className="mt-3 text-[16px] leading-7 text-[#51586c]">2 topics remaining to master this chapter.</p>
      </div>

      <h4 className="mt-8 text-[18px] font-semibold uppercase tracking-wide text-[#3d4354]">Current Context</h4>
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-[#ccd1e0] bg-[#e8eaf4] px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#f6f7fc] text-[#d56f16]"><FlaskConical size={18} /></div>
          <div>
            <p className="text-[18px] font-semibold">Chemistry</p>
            <p className="text-[15px] text-[#5a6175]">Tawjihi Curriculum</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#ccd1e0] bg-[#e8eaf4] px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#f6f7fc] text-[#2f66d8]"><Clock3 size={18} /></div>
          <div>
            <p className="text-[18px] font-semibold">Exam Date</p>
            <p className="text-[15px] text-[#5a6175]">June 20, 2024</p>
          </div>
        </div>
      </div>

      <h4 className="mt-8 text-[18px] font-semibold uppercase tracking-wide text-[#3d4354]">Weak Areas Identified</h4>
      <div className="mt-3 space-y-3">
        {weakAreas.map((item) => (
          <div key={item.title} className="rounded-xl border-y border-[#cfd3e0] bg-[#f5f6fb] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-10 w-1 rounded-full" style={{ backgroundColor: item.color }} />
                <div>
                  <p className="text-[18px] font-semibold">{item.title}</p>
                  <p className="text-[15px] text-[#5e6476]">{item.subtitle}</p>
                </div>
              </div>
              <button type="button" className="text-[#1f65d6] hover:text-[#154da8]">
                <PlayCircle size={22} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#7f41f2] to-[#a34df8] px-5 py-5 text-white shadow-soft">
        <p className="text-[31px]">Generate Flashcards</p>
        <p className="mt-1 text-[16px] leading-7 text-white/90">Master Chapter 3 keywords with AI-powered cards.</p>
        <button
          type="button"
          onClick={createNow}
          className="mt-4 rounded-xl bg-white/25 px-4 py-2 text-[28px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/35"
        >
          Create Now
        </button>
        {flashcardMsg && (
          <p className="mt-2 rounded-lg bg-white/20 px-2 py-1 text-[14px]">{flashcardMsg}</p>
        )}
      </div>
    </aside>
  );
}
