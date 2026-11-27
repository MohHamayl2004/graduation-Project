import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { History, Plus, Trash2, X } from "lucide-react";

export default function ChatHistoryPanel({ chats, activeId, busy, onOpen, onNew, onDelete, isOpen, onToggle, onModeChange, onClose }) {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width:1280px)").matches);
  const panel = useRef(null);
  const historyCard = useRef(null);
  const id = useId();
  const modal = isOpen && !wide;
  useEffect(() => {
    const mq = window.matchMedia("(min-width:1280px)");
    const change = () => { setWide(mq.matches); onModeChange(mq.matches); };
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, [onModeChange]);
  useLayoutEffect(() => {
    const measure = () => {
      const card = historyCard.current;
      const y = card.offsetTop + card.offsetHeight / 2;
      panel.current.parentElement.style.setProperty("--tutor-panel-grip-y", `${y}px`);
    };
    const observer = new ResizeObserver(measure);
    [panel.current, historyCard.current].forEach((element) => observer.observe(element));
    measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previousFocus = document.activeElement;
    const slot = panel.current.parentElement;
    const background = [...slot.parentElement.children].filter((element) => element !== slot && !element.hasAttribute("data-tutor-backdrop"));
    const inert = background.map((element) => element.inert);
    background.forEach((element) => { element.inert = true; });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current.querySelector(".tutor-panel-close").focus();
    return () => {
      background.forEach((element, index) => { element.inert = inert[index]; });
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [modal]);
  const onKeyDown = (event) => {
    if (!modal) return;
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    if (event.key !== "Tab") return;
    const controls = [...panel.current.parentElement.querySelectorAll('button:not(:disabled)')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <>
    {modal && <div data-tutor-backdrop className="tutor-panel-backdrop" onClick={onClose} aria-hidden="true" />}
    <div className="tutor-panel-slot" data-open={isOpen} role={modal ? "dialog" : undefined} aria-modal={modal || undefined} aria-label={modal ? "المحادثات" : undefined} onKeyDown={onKeyDown}>
      <aside ref={panel} id="tutor-study-panel" className="tutor-side-panel" aria-label="المحادثات" aria-hidden={!isOpen} {...(!isOpen ? { inert: "" } : {})}>
        <button type="button" aria-label="إغلاق المحادثات" onClick={onClose} className="tutor-panel-close"><X size={19} /></button>
        <section ref={historyCard} className="tutor-panel-section" aria-labelledby={`${id}-history-title`}>
          <div className="tutor-section-heading">
            <h2 id={`${id}-history-title`} className="tutor-section-label"><History size={20} aria-hidden="true" />المحادثات</h2>
            <button type="button" onClick={onNew} disabled={busy} className="tutor-new-chat" aria-label="محادثة جديدة"><Plus size={16} aria-hidden="true" /><span>محادثة جديدة</span></button>
          </div>
          <div id={`${id}-history`} className="tutor-section-body tutor-history">
            {chats.length === 0 && <p className="tutor-history-empty">لسا ما في محادثات.</p>}
            <ul>{chats.map((chat) => <li key={chat.id} className={chat.id === activeId ? "is-active" : ""}>
              <button type="button" onClick={() => onOpen(chat.id)} disabled={busy} className="tutor-chat-title" title={chat.title} aria-current={chat.id === activeId ? "true" : undefined}>{chat.title}</button>
              <button type="button" onClick={() => onDelete(chat.id)} disabled={busy} aria-label={`حذف المحادثة: ${chat.title}`} className="tutor-chat-delete"><Trash2 size={15} /></button>
            </li>)}</ul>
          </div>
        </section>
      </aside>
      <button type="button" className="tutor-panel-toggle" aria-expanded={isOpen} aria-controls="tutor-study-panel" aria-label={isOpen ? "إخفاء المحادثات" : "إظهار المحادثات"} onClick={onToggle}>
        <svg viewBox="0 0 44 116" aria-hidden="true" focusable="false">
          <path d="M0 0 C0 18 42 22 42 58 C42 94 0 98 0 116 Z" fill="currentColor" />
          <path d="M9 50H28 M9 58H28 M9 66H28" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  </>;
}
