import { useEffect, useMemo, useState } from "react";
import { Bell, CircleHelp, Search, FileText, Sparkles, Check, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { userProfile } from "../data/userProfile";

const steps = [
  {
    title: "Upload Received",
    detail: "File successfully stored in your cloud library"
  },
  {
    title: "Document Chunking",
    detail: "Parsing semantic sections for better analysis"
  },
  {
    title: "Embedding Generation",
    detail: "Translating text into vector knowledge maps..."
  },
  {
    title: "Knowledge Retrieval",
    detail: "Contextualizing with Tawjihi syllabus"
  },
  {
    title: "Lecture Generation",
    detail: "Creating adaptive learning scripts"
  },
  {
    title: "Quiz Generation",
    detail: "Preparing mastery assessment questions"
  }
];

function AnalysisHeader() {
  return (
    <header className="border-b border-[#d7dbe8] bg-[#f8f8fc] px-6 py-3 lg:px-8">
      <div className="mx-auto flex w-full max-w-[980px] items-center justify-between gap-4">
        <div className="flex h-12 w-[300px] items-center gap-3 rounded-full border border-[#c9cfde] bg-[#edeff7] px-4 text-[#5e6578] sm:w-[340px]">
          <Search size={19} />
          <input
            type="text"
            readOnly
            value=""
            placeholder="Search your library..."
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#6f7588]"
          />
        </div>

        <div className="flex items-center gap-3 text-[#343b50]">
          <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]"><Bell size={19} /></button>
          <button type="button" className="rounded-full p-2 hover:bg-[#eaedf6]"><CircleHelp size={19} /></button>
          <img src={userProfile.avatar} alt={userProfile.name} className="h-9 w-9 rounded-full object-cover" />
        </div>
      </div>
    </header>
  );
}

function AnalysisFooter() {
  return (
    <footer className="border-t border-[#d7dbe8] bg-[#f8f8fc] px-6 py-2.5 lg:px-8">
      <div className="mx-auto flex w-full max-w-[980px] flex-wrap items-center justify-between gap-2 text-[#4f556b]">
        <p className="text-[13px]">© 2024 NIPRAS AI Learning. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-5 text-[13px]">
          <button type="button">About Us</button>
          <button type="button">Privacy Policy</button>
          <button type="button">Terms of Service</button>
          <button type="button">Support</button>
        </div>
      </div>
    </footer>
  );
}

export default function Analysis() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    if (canceled) return undefined;

    const id = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(id);
          return 100;
        }
        return prev + 1;
      });
    }, 120);

    return () => clearInterval(id);
  }, [canceled]);

  useEffect(() => {
    if (progress === 100 && !canceled) {
      const timeout = setTimeout(() => navigate("/dashboard"), 700);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [progress, canceled, navigate]);

  const activeIndex = useMemo(() => {
    if (progress >= 100) return steps.length - 1;
    return Math.min(steps.length - 1, Math.floor((progress / 100) * steps.length));
  }, [progress]);

  const estimatedSeconds = Math.max(0, Math.ceil((100 - progress) * 0.12));

  return (
    <div className="h-screen overflow-hidden bg-[#f1f2f7] text-[#1d2436]">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="Upload Material" />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AnalysisHeader />

          <main className="flex flex-1 flex-col overflow-hidden px-4 py-2 sm:px-6 lg:px-8">
            <div className="mx-auto flex h-full w-full max-w-[980px] items-center justify-center">
              <div className="flex w-full max-w-[760px] flex-col items-center gap-3">
                <div className="rounded-full bg-[#e9ddff] px-4 py-1.5 text-[15px] text-[#5a2dd2]">
                  <span className="inline-flex items-center gap-2"><Sparkles size={14} /> AI is analyzing your material</span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl border border-[#c6cede] bg-white px-3 py-1.5 text-[14px] text-[#2f384f]">
                  <FileText size={16} className="text-[#1d5dd4]" /> Chemistry_Chapter3.pdf
                </div>

                <div className="grid h-[160px] w-[160px] place-items-center rounded-full bg-[radial-gradient(circle,_#909ff0_0%,_#7f97e8_42%,_#9db6ef_100%)] sm:h-[190px] sm:w-[190px] lg:h-[220px] lg:w-[220px]">
                  <div className="grid h-[84px] w-[84px] place-items-center rounded-full bg-[radial-gradient(circle,_#8f89f0_0%,_#8396ef_100%)] sm:h-[98px] sm:w-[98px] lg:h-[110px] lg:w-[110px]">
                    <div className="relative h-[58px] w-[58px] sm:h-[66px] sm:w-[66px] lg:h-[76px] lg:w-[76px]">
                      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
                      <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-white/80" />
                      <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white/80" />
                      <div className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/80" />
                      <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white/80" />
                      <div className="absolute inset-3 border-2 border-dashed border-white/70" style={{ transform: "rotate(45deg)" }} />
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-[440px] rounded-2xl border border-[#cfd4e2] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(27,36,64,0.06)]">
                  <ul className="space-y-2.5">
                    {steps.map((step, index) => {
                      const done = index < activeIndex;
                      const active = index === activeIndex && progress < 100;
                      return (
                        <li key={step.title} className="flex gap-3">
                          <div
                            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                              done
                                ? "border-[#0d8a64] bg-[#0d8a64] text-white"
                                : active
                                  ? "border-[#1956ca] bg-[#1956ca] text-white"
                                  : "border-[#c7cedd] bg-[#e9edf6] text-[#8b94a8]"
                            }`}
                          >
                            {done ? <Check size={12} /> : active ? <LoaderCircle size={12} className="animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                          </div>
                          <div>
                            <p className={`text-[16px] leading-tight ${done || active ? "text-[#1f273b]" : "text-[#8c93a6]"}${active ? " font-semibold text-[#1254c8]" : ""}`}>
                              {step.title}
                            </p>
                            <p className={`text-[12px] leading-5 ${done || active ? "text-[#5b6276]" : "text-[#a1a7b7]"}`}>{step.detail}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="w-full max-w-[440px]">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[24px] font-medium text-[#1353c6]">{progress}% Analyzed</p>
                    <p className="text-[12px] text-[#5d647a]">~{estimatedSeconds}s remaining</p>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#d7dcee]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1558cf] via-[#2b72e3] to-[#1452bf] transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCanceled(true);
                    navigate("/login");
                  }}
                  className="rounded-full border border-[#8a90a5] px-7 py-2 text-[16px] text-[#434a5f] transition hover:bg-[#eceff7]"
                >
                  Cancel Processing
                </button>
              </div>
            </div>
          </main>

          <AnalysisFooter />
        </div>
      </div>
    </div>
  );
}
