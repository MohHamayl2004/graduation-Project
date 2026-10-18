import { Bell, CircleHelp, LogIn, MessageSquarePlus, History } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import AssistantMessage from "./components/AssistantMessage";
import Composer from "./components/Composer";
import StudentBadge from "../../components/common/StudentBadge";

// Only follow the answer down while the student is already at the bottom:
// scrolling up to reread must not be yanked back by every new word.
const NEAR_BOTTOM_PX = 120;

export default function MainChat({ chat, onHistory }) {
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
    <main className="chat-main flex min-w-0 flex-1 flex-col border-e border-border bg-surface">
      <header className="chat-header flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-raised px-4 py-3 lg:px-8">
        <div className="flex w-full flex-wrap items-center gap-2 ps-16 lg:w-auto lg:ps-0 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:border-e sm:border-border sm:pe-6">
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
          {signedIn && <button type="button" onClick={onHistory} aria-label="فتح سجل المحادثات" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm xl:hidden"><History size={18} />المحادثات السابقة</button>}
        </div>
        <div className="flex items-center gap-2 text-ink-muted">
          <StudentBadge />
          <button type="button" aria-label="الإشعارات" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-alt">
            <Bell size={19} />
          </button>
          <button type="button" aria-label="المساعدة" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface-alt">
            <CircleHelp size={19} />
          </button>
        </div>
      </header>

      <section className="chat-workspace flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3 sm:px-8 sm:pt-7">
        {!signedIn ? (
          <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-4 text-center">
            <p className="text-lg text-ink">سجّل دخولك عشان تسأل المعلّم الذكي وتنحفظ محادثاتك.</p>
            <Link to="/login" className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover">
              <LogIn size={18} className="rtl:-scale-x-100" /> تسجيل الدخول
            </Link>
          </div>
        ) : (
          <>
            <div ref={list} onScroll={onScroll} className="chat-messages mx-auto flex min-h-0 w-full max-w-[900px] flex-1 flex-col gap-5 overflow-y-auto pe-1 sm:pe-2" aria-live="polite">
              {messages.length === 0 && (
                <div className="mt-10 text-center text-ink-muted">
                  <p className="text-lg">اسألني عن أي شيء بالوحدة الأولى.</p>
                  <p className="mt-1 text-sm">بجاوبك من كتابك وبحكيلك الصفحة، والتمارين الحسابية بتنحسب وبتتأكد قبل ما توصلك.</p>
                </div>
              )}

              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} dir="auto" className="chat-message ms-auto max-w-[95%] whitespace-pre-wrap break-words rounded-2xl rounded-es-md bg-primary px-4 py-3 text-base leading-8 text-white shadow-sm sm:max-w-[78%] sm:px-6 sm:py-5">
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
