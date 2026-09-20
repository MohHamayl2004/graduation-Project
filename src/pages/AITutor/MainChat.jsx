import { useMemo, useState } from "react";
import { Bell, CircleHelp, ChevronDown, FileText, Paperclip, Send, Sparkles, ListOrdered } from "lucide-react";

const starterPrompts = ["اختبار قصير عن الروابط", "لخّص الصفحات 42–45", "اشرح اتجاهات الكهروسالبية"];

const aiBody = {
  intro:
    "سؤال ممتاز يا محمد! الفرق بين الروابط الأيونية والتساهمية بيعتمد بالأساس على طريقة تعامل الذرات مع الإلكترونات، وهذا مرتبط بقيم الكهروسالبية.",
  steps: [
    "الروابط الأيونية: بتتكوّن لما يكون فرق الكهروسالبية كبيرًا (أكبر من 1.7)، فبتنتقل إلكترونات من ذرة لذرة ثانية.",
    "الروابط التساهمية: بتتكوّن لما يكون فرق الكهروسالبية صغيرًا (أقل من 1.7)، وبتشارك الذرات الإلكترونات عشان توصل للاستقرار.",
    "القطبية: إذا كانت المشاركة غير متساوية وكان فرق الكهروسالبية بين 0.4 و1.7، بتكون الرابطة تساهمية قطبية، مثل الماء H₂O."
  ]
};

export default function MainChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "user",
      text: "ممكن تشرحلي الفرق بين الروابط التساهمية والأيونية في الفصل الثالث؟ وكيف إلها علاقة بالكهروسالبية؟"
    },
    { id: 2, role: "ai", text: aiBody.intro }
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
      text: "تمام! بقدر أشرحلك الفكرة بخطوات سريعة، أو ألخّصها، أو أحوّلها لاختبار قصير."
    };

    setMessages((prev) => [...prev, userMsg, fakeAi]);
    setInput("");
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col border-e border-border bg-surface">
      <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-raised px-5 py-3 pe-20 sm:px-8 lg:pe-8">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:border-e sm:border-border sm:pe-6">
            <h2 className="font-display text-xl font-semibold text-ink">معلّم نبراس الذكي</h2>
            <div className="rounded-md bg-accent-tint px-2 py-1 text-xs font-semibold text-accent">ذكي</div>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-ink shadow-sm hover:bg-surface-alt"
          >
            <FileText size={17} className="text-primary" />
            Chemistry_Chapter3.pdf
            <ChevronDown size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-ink-muted">
          <button type="button" aria-label="الإشعارات" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-alt">
            <Bell size={19} />
          </button>
          <button type="button" aria-label="المساعدة" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-alt">
            <CircleHelp size={19} />
          </button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
        <div className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-5 overflow-y-auto pe-1 sm:pe-2">
          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <div
                  key={message.id}
                  className="ms-auto max-w-[85%] rounded-2xl rounded-es-md bg-primary px-5 py-4 text-base leading-8 text-white shadow-sm sm:max-w-[78%] sm:px-6 sm:py-5"
                >
                  {message.text}
                </div>
              );
            }

            if (message.role === "ai") {
              return (
                <div key={message.id} className="flex gap-3 sm:gap-4">
                  <div className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-ink text-white shadow-md">
                    <Sparkles size={19} />
                  </div>
                  <div className="w-full min-w-0 rounded-2xl border border-border bg-surface-raised p-5 shadow-sm sm:p-6">
                    <p className="text-base leading-8 text-ink">{message.text}</p>

                    <div className="mt-5 rounded-lg border border-border bg-surface-alt p-4 sm:p-5">
                      <div className="mb-3 flex items-center gap-2 text-base font-semibold text-primary">
                        <ListOrdered size={19} />
                        <span>الشرح خطوة خطوة</span>
                      </div>
                      <ol className="space-y-3">
                        {aiBody.steps.map((step, idx) => (
                          <li key={step} className="flex gap-3 text-sm leading-7 text-ink">
                            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-xs text-ink-muted">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <p className="mt-4 text-base leading-7 text-ink">
                      بتحب أجهّزلك اختبار قصير على حدود الكهروسالبية؟
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-ink-muted">المصادر:</span>
                      <button type="button" className="rounded-md border border-border bg-primary-tint px-2 py-1 text-primary hover:bg-primary/10">
                        صفحة 42: الروابط الذرّية
                      </button>
                      <button type="button" className="rounded-md border border-border bg-primary-tint px-2 py-1 text-primary hover:bg-primary/10">
                        صفحة 45: جدول الكهروسالبية
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id} className="me-auto max-w-[85%] rounded-2xl border border-border bg-surface-raised px-5 py-4 text-base text-ink sm:max-w-[70%]">
                {message.text}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-4 w-full max-w-[900px]">
          <div className="mb-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setInput(chip)}
                className="rounded-full border border-border bg-surface-alt px-4 py-2 text-sm text-ink-muted transition-colors duration-base hover:bg-primary-tint hover:text-primary"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-surface-alt p-2 shadow-sm">
            <div className="flex items-center gap-3 rounded-xl bg-surface-raised/60 px-3 py-1.5 sm:px-4 sm:py-2">
              <Paperclip size={19} className="shrink-0 text-ink-muted" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="ابعت سؤالك وأنا بشرحلك خطوة خطوة."
                aria-label="اسأل نبراس عن الكيمياء"
                className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                aria-label="إرسال السؤال"
                className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors duration-base sm:px-5 ${
                  canSend ? "bg-primary hover:bg-primary-hover" : "bg-border-strong"
                }`}
              >
                <span className="hidden sm:inline">إرسال</span> <Send size={17} className="rtl:-scale-x-100" />
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-xs text-ink-faint">
            معلّم نبراس الذكي ممكن يخطئ. تأكد من المعلومات المهمة بالرجوع إلى كتاب التوجيهي.
          </p>
        </div>
      </section>
    </main>
  );
}
