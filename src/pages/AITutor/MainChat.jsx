import { useMemo, useState } from "react";
import {
  Bell,
  CircleHelp,
  ChevronDown,
  FileText,
  Paperclip,
  Send,
  Sparkles,
  ListOrdered
} from "lucide-react";

const starterPrompts = [
  '"Practice quiz on Bonding"',
  '"Summarize pg 42-45"',
  '"Explain electronegativity trends"'
];

const aiBody = {
  intro:
    "Great question, Mohammad! In Chapter 3, the distinction between ionic and covalent bonds is primarily determined by how atoms share (or don't share) their electrons, which is dictated by their electronegativity values.",
  steps: [
    "Ionic Bonds: Occur when the electronegativity difference (delta EN) is large (>1.7). One atom steals electrons from another.",
    "Covalent Bonds: Occur when delta EN is small (<1.7). Atoms share electrons to reach stability.",
    "Polarity: If the sharing is unequal (0.4 < delta EN < 1.7), it's a polar covalent bond, like in H2O."
  ]
};

export default function MainChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "user",
      text: "Can you explain the difference between covalent and ionic bonds in Chapter 3? Specifically, how do they relate to electronegativity?"
    },
    {
      id: 2,
      role: "ai",
      text: aiBody.intro
    }
  ]);

  const canSend = input.trim().length > 0;

  const chips = useMemo(() => starterPrompts, []);

  const handleSend = () => {
    const value = input.trim();
    if (!value) return;

    const userMsg = { id: Date.now(), role: "user", text: value };
    const fakeAi = {
      id: Date.now() + 1,
      role: "ai-simple",
      text: "Nice prompt. I can break this into quick steps, summary bullets, or quiz mode next."
    };

    setMessages((prev) => [...prev, userMsg, fakeAi]);
    setInput("");
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col border-r border-[#d7d9e3] bg-[#f7f7fa]">
      <header className="flex h-[84px] items-center justify-between border-b border-[#d8dbe6] bg-[#f2f3f8] px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 border-r border-[#d3d6e1] pr-6">
            <h2 className="text-[32px] leading-none">NIPRAS AI Tutor</h2>
            <div className="rounded-md bg-[#f0e9ff] px-2 py-1 text-[14px] font-semibold text-[#7a3ff2]">AI</div>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-[#c7ccdd] bg-white px-4 py-2 text-[17px] text-[#39405a] shadow-sm"
          >
            <FileText size={18} className="text-[#1f65d6]" />
            Chemistry_Chapter3.pdf
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="flex items-center gap-4 text-[#2a3043]">
          <button type="button" className="rounded-full p-2 hover:bg-[#e6e9f4]"><Bell size={20} /></button>
          <button type="button" className="rounded-full p-2 hover:bg-[#e6e9f4]"><CircleHelp size={20} /></button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col px-8 pb-6 pt-7">
        <div className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-5 overflow-y-auto pr-2">
          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="ml-auto max-w-[78%] rounded-3xl rounded-tr-xl bg-[#2362db] px-6 py-5 text-[20px] leading-9 text-white shadow-soft">
                  {message.text}
                </div>
              );
            }

            if (message.role === "ai") {
              return (
                <div key={message.id} className="flex gap-4">
                  <div className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8d3cff] to-[#3565df] text-white shadow-md">
                    <Sparkles size={21} />
                  </div>
                  <div className="w-full rounded-3xl border border-[#cfd3e0] bg-white p-6 shadow-[0_8px_16px_rgba(22,32,70,0.06)]">
                    <p className="text-[20px] leading-9 text-[#23293a]">{message.text}</p>

                    <div className="mt-5 rounded-2xl border border-[#cfd3e0] bg-[#ececf7] p-5">
                      <div className="mb-3 flex items-center gap-2 text-[38px] text-[#6e41f3]">
                        <ListOrdered size={20} />
                        <span>Step-by-step breakdown</span>
                      </div>
                      <ol className="space-y-3">
                        {aiBody.steps.map((step, idx) => (
                          <li key={step} className="flex gap-3 text-[18px] leading-8 text-[#1f2434]">
                            <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#c9ccda] bg-white text-[14px] text-[#6f7488]">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <p className="mt-4 text-[20px] leading-8 text-[#30374d]">
                      Would you like me to generate a practice quiz on these electronegativity thresholds?
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[16px]">
                      <span className="font-semibold text-[#3c4256]">SOURCES:</span>
                      <button type="button" className="rounded-md border border-[#d3d7e5] bg-[#f6f8ff] px-2 py-1 text-[#2259c4]">
                        pg 42: Atomic Bonding
                      </button>
                      <button type="button" className="rounded-md border border-[#d3d7e5] bg-[#f6f8ff] px-2 py-1 text-[#2259c4]">
                        pg 45: Electronegativity Table
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className="mr-auto max-w-[70%] rounded-2xl border border-[#d0d5e3] bg-white px-5 py-4 text-[18px] text-[#31384d]">
                {message.text}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-4 w-full max-w-[900px]">
          <div className="mb-4 flex flex-wrap gap-3">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setInput(chip)}
                className="rounded-full border border-[#d1d5e3] bg-[#eceef6] px-5 py-2 text-[17px] text-[#41485d] transition hover:bg-[#e3e6f2]"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-[#c8ccdb] bg-[#ebedf6] p-2 shadow-soft">
            <div className="flex items-center gap-3 rounded-2xl bg-white/40 px-4 py-2">
              <Paperclip size={20} className="text-[#3e4457]" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Ask NIPRAS about Chemistry..."
                className="h-11 flex-1 bg-transparent text-[20px] text-[#2c3348] placeholder:text-[#6f7486] outline-none"
              />
              <button
                type="button"
                onClick={handleSend}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-[30px] font-semibold text-white transition ${
                  canSend ? "bg-[#0f5dd8] hover:bg-[#0a53ca]" : "bg-[#8facdf]"
                }`}
              >
                Send <Send size={18} />
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[14px] text-[#7b8092]">
            NIPRAS AI can make mistakes. Verify important information with your Tawjihi textbook.
          </p>
        </div>
      </section>
    </main>
  );
}

