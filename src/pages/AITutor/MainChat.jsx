import { Bell, CircleHelp, LogIn, MessageSquarePlus } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import AssistantMessage from "./components/AssistantMessage";
import Composer from "./components/Composer";

// Only follow the answer down while the student is already at the bottom:
// scrolling up to reread must not be yanked back by every new word.
const NEAR_BOTTOM_PX = 120;

export default function MainChat({ chat }) {
  const { state, signedIn, send, stop, newChat } = chat;
  const { messages, phase, error } = state;
  const busy = phase === "streaming";
  const list = useRef(null);
  const pinned = useRef(true);

  useEffect(() => {
    const el = list.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = list.current;
    if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col border-e border-border bg-surface">
      <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-raised px-5 py-3 pe-20 sm:px-8 lg:pe-8">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:border-e sm:border-border sm:pe-6">
            <h2 className="font-display text-xl font-semibold text-ink">معلّم نبراس الذكي</h2>
            <div className="rounded-md bg-accent-tint px-2 py-1 text-xs font-semibold text-accent">الوحدة الأولى: التفاضل</div>
          </div>
          {signedIn && (
            <button
              type="button"
              onClick={newChat}
              disabled={busy}
              className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-ink shadow-sm hover:bg-surface-alt disabled:opacity-50 xl:hidden"
            >
              <MessageSquarePlus size={17} className="text-primary" /> محادثة جديدة
            </button>
          )}
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
        {!signedIn ? (
          <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-4 text-center">
            <p className="text-lg text-ink">سجّل دخولك عشان تسأل المعلّم الذكي وتنحفظ محادثاتك.</p>
            <Link to="/login" className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover">
              <LogIn size={18} className="rtl:-scale-x-100" /> تسجيل الدخول
            </Link>
          </div>
        ) : (
          <>
            <div ref={list} onScroll={onScroll} className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-5 overflow-y-auto pe-1 sm:pe-2" aria-live="polite">
              {messages.length === 0 && (
                <div className="mt-10 text-center text-ink-muted">
                  <p className="text-lg">اسألني عن أي شيء بالوحدة الأولى.</p>
                  <p className="mt-1 text-sm">بجاوبك من كتابك وبحكيلك الصفحة، والتمارين الحسابية بتنحسب وبتتأكد قبل ما توصلك.</p>
                </div>
              )}

              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} dir="auto" className="ms-auto max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-es-md bg-primary px-5 py-4 text-base leading-8 text-white shadow-sm sm:max-w-[78%] sm:px-6 sm:py-5">
                    {message.content}
                  </div>
                ) : (
                  <AssistantMessage key={message.id} message={message} />
                )
              )}
            </div>

            {error && <p className="mx-auto mt-3 w-full max-w-[900px] text-sm text-error" role="alert">{error}</p>}

            <Composer busy={busy} onSend={send} onStop={stop} showStarters={messages.length === 0} />
          </>
        )}
      </section>
    </main>
  );
}
