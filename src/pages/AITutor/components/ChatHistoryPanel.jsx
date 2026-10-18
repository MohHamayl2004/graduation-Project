import { useEffect } from "react";
import { MessageSquarePlus, Trash2, X } from "lucide-react";

export default function ChatHistoryPanel({ chats, activeId, busy, onOpen, onNew, onDelete, mobileOpen, onClose }) {
  useEffect(() => { const mq = window.matchMedia("(min-width:1280px)"); const close = () => { if (mq.matches) onClose?.(); }; mq.addEventListener("change", close); return () => mq.removeEventListener("change", close); }, [onClose]);
  return (
    <>
    {mobileOpen && <div className="fixed inset-0 z-40 bg-ink/40 xl:hidden" onClick={onClose} aria-hidden="true" />}
    <aside role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined} className={`${mobileOpen ? "fixed inset-y-0 end-0 z-50 flex w-[min(320px,90vw)]" : "hidden"} min-h-0 shrink-0 flex-col gap-3 overflow-y-auto bg-surface-alt px-4 py-5 xl:static xl:flex xl:w-[280px]`} aria-label="المحادثات السابقة">
      <button aria-label="إغلاق سجل المحادثات" onClick={onClose} className="ms-auto grid h-11 w-11 place-items-center rounded-lg border border-border xl:hidden"><X size={20} /></button>
      <button
        type="button"
        onClick={onNew}
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:bg-border-strong"
      >
        <MessageSquarePlus size={18} /> محادثة جديدة
      </button>

      <h3 className="mt-2 px-1 text-sm font-semibold text-ink-muted">محادثاتك</h3>

      {chats.length === 0 && <p className="px-1 text-sm text-ink-faint">لسا ما في محادثات.</p>}

      <ul className="flex flex-col gap-1">
        {chats.map((chat) => (
          <li key={chat.id} className={`group flex items-center gap-1 rounded-lg ${chat.id === activeId ? "bg-primary-tint" : "hover:bg-surface-raised"}`}>
            <button
              type="button"
              onClick={() => onOpen(chat.id)}
              disabled={busy}
              className={`min-w-0 flex-1 truncate px-3 py-2 text-start text-sm ${chat.id === activeId ? "font-semibold text-primary" : "text-ink"}`}
              title={chat.title}
            >
              {chat.title}
            </button>
            <button
              type="button"
              onClick={() => onDelete(chat.id)}
              disabled={busy}
              aria-label={`حذف المحادثة: ${chat.title}`}
              className="me-1 grid h-11 w-11 place-items-center rounded-md text-ink-faint hover:bg-surface-alt hover:text-error"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </aside></>
  );
}
