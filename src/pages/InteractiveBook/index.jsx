import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, FlaskConical, Volume2, VolumeX, X } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import { physicsUnit2, circuitFor } from "../../data/books/physicsUnit2";
import { rectStyle, LabCard } from "./overlay";
import { sound } from "./sound";
import { LiveCircuit, Resistors, Equivalent, Wheatstone, Kirchhoff1, Kirchhoff2, Conventional, OhmLab } from "./experiments/circuitExperiments";
import { Lamp, Ranking, Drift, IVCurves } from "./experiments/figureExperiments";
import "./book.css";

const experiments = { live: LiveCircuit, resistors: Resistors, equivalent: Equivalent, wheatstone: Wheatstone, kirchhoff1: Kirchhoff1, kirchhoff2: Kirchhoff2, conventional: Conventional, ohmLab: OhmLab, lamp: Lamp, ranking: Ranking, drift: Drift, ivCurves: IVCurves };
const arabic = (n) => new Intl.NumberFormat("ar-EG").format(n);

// One page alone (phones and narrow windows): the lab card goes under or over the figure.
function cardPlacement([x0, y0, x1, y1]) {
  const below = y1 < 470;
  const left = (x0 + x1) / 2 < 290;
  return { position: "absolute", ...(below ? { top: `${(y1 / 751.18) * 100 + 0.8}%` } : { bottom: `${100 - (y0 / 751.18) * 100 + 0.8}%` }), ...(left ? { left: `${(x0 / 581.1) * 100}%` } : { right: `${100 - (x1 / 581.1) * 100}%` }) };
}

function ActiveExperiment({ hotspot, page, onClose, cardHost, spread }) {
  const Experiment = experiments[hotspot.kind];
  // Figure renders before Card in every experiment, so the card can show an enlarged live copy.
  const figure = useRef(null);
  const slots = useMemo(() => ({
    Figure: ({ children }) => { figure.current = children; return <div className="bk-figure is-live" style={rectStyle(hotspot.rect)}>{children}</div>; },
    // In an open book the experiment fills the facing page, laid out like a page of the book.
    Card: ({ children, footer }) => {
      if (!cardHost) return null;
      if (spread) return createPortal(<article className="bk-labpage">
        <header className="bk-lab-band"><span className="bk-lab-square" /><h3>{hotspot.label}</h3>
          <button type="button" className="bk-close" onClick={onClose} aria-label="إغلاق التجربة والرجوع للصفحة"><X size={16} /></button></header>
        <p className="bk-lab-ref">تجربة تفاعلية على الشكل في صفحة {arabic(page.bookPage)} · الشكل المقابل يعمل الآن</p>
        {!hotspot.noZoom && <ZoomedFigure page={page} rect={hotspot.rect}>{figure.current}</ZoomedFigure>}
        <div className="bk-lab-body">{children}</div>
        {footer && <div className="bk-lab-footer">{footer}</div>}
        <span className="bk-lab-number">{arabic(page.bookPage)}</span>
      </article>, cardHost);
      return createPortal(<div className="bk-card-wrap" style={cardPlacement(hotspot.rect)}>
        <LabCard title={hotspot.label} footer={footer}>{!hotspot.noZoom && <ZoomedFigure page={page} rect={hotspot.rect}>{figure.current}</ZoomedFigure>}{children}</LabCard>
        <button type="button" className="bk-close bk-close-card" onClick={onClose} aria-label="إغلاق التجربة"><X size={16} /></button>
      </div>, cardHost);
    }
  }), [hotspot, page, onClose, cardHost, spread]);
  return <Experiment hotspot={hotspot} circuit={circuitFor(hotspot)} Figure={slots.Figure} Card={slots.Card} />;
}

// The same printed figure, cut from the page and enlarged, with the same live overlay.
function ZoomedFigure({ page, rect: [x0, y0, x1, y1], children }) {
  const w = x1 - x0, h = y1 - y0;
  return <div className="bk-lab-figure" style={{ aspectRatio: `${w} / ${h}`, width: `${Math.min(100, 64 * (w / h))}%`, backgroundImage: `url(${import.meta.env.BASE_URL}${page.image})`,
    backgroundSize: `${(581.1 / w) * 100}% auto`, backgroundPosition: `${(x0 / (581.1 - w)) * 100}% ${(y0 / (751.18 - h)) * 100}%` }}>
    <div className="bk-figure bk-figure-zoom">{children}</div>
  </div>;
}

// A printed page with its "جرّب" marks and, when one is open, its live figure.
function Sheet({ page, active, onOpen, children }) {
  return <div className="bk-sheet">
    <img src={`${import.meta.env.BASE_URL}${page.image}`} alt={`صفحة ${page.bookPage} من كتاب الفيزياء: ${page.title}`} width="1453" height="1878" draggable="false" />
    {page.hotspots.filter((h) => h.id !== active).map((h) => <button key={h.id} type="button" className="bk-hotspot" style={rectStyle(h.rect)} onClick={() => onOpen(h.id)} aria-label={`جرّب: ${h.label}`}>
      <span><FlaskConical size={13} />جرّب</span>
    </button>)}
    {children}
  </div>;
}

// A student reads the real pages of the book, as an open book. Clicking a figure
// makes it work in place, and the facing page becomes the experiment's page.
export default function InteractiveBook() {
  const book = physicsUnit2;
  const [params, setParams] = useSearchParams();
  const index = Math.max(0, book.pages.findIndex((p) => String(p.bookPage) === params.get("page")));
  const [active, setActive] = useState(null); // { page: index, id }
  const [flip, setFlip] = useState(null); // { dir: "next" | "prev", from, to } while a leaf is turning
  const [muted, setMuted] = useState(sound.muted);
  const [host, setHost] = useState(null);
  const main = useRef(null);
  const [spread, setSpread] = useState(true);
  useEffect(() => {
    const el = main.current; if (!el) return undefined;
    const observer = new ResizeObserver(() => setSpread(el.clientWidth >= 1000));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // In an open book the right-hand page is always an even position (RTL).
  const first = spread ? index - (index % 2) : index;
  const visible = (spread ? [first, first + 1] : [first]).filter((i) => i < book.pages.length);
  const step = spread ? 2 : 1;
  const go = useCallback((next) => {
    if (next < 0 || next >= book.pages.length) return;
    const target = spread ? next - (next % 2) : next;
    if (target === first || flip) return;
    sound.flip();
    setActive(null);
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setParams({ page: String(book.pages[target].bookPage) }, { replace: true });
    else setFlip({ dir: target > first ? "next" : "prev", from: first, to: target });
  }, [book.pages, first, spread, setParams, flip]);
  // The leaf has landed: the new pages become the open pages.
  const landed = (e) => { if (e.target !== e.currentTarget) return; setParams({ page: String(book.pages[flip.to].bookPage) }, { replace: true }); setFlip(null); };
  // Drag the page sideways to turn it (RTL: pull the left page to the right for the next page).
  const drag = useRef(null);
  const onPointerDown = (e) => { if (!active && !e.target.closest("button, input, a")) drag.current = e.clientX; };
  const onPointerUp = (e) => {
    if (drag.current === null) return;
    const dx = e.clientX - drag.current; drag.current = null;
    if (dx > 60) go(first + step); else if (dx < -60) go(first - step);
  };
  const close = useCallback(() => setActive(null), []);
  // A link from the study plan can open one experiment: /book/physics?page=68&try=series
  const tried = useRef(false);
  useEffect(() => {
    const id = params.get("try");
    if (tried.current || !id) return;
    const pageIndex = visible.find((i) => book.pages[i].hotspots.some((h) => h.id === id));
    if (pageIndex !== undefined) { tried.current = true; setActive({ page: pageIndex, id }); }
  }, [params, visible, book.pages]);
  // Load the pages around the open ones, so a turning leaf never shows a half-drawn page.
  useEffect(() => {
    for (let i = Math.max(0, first - 2); i < Math.min(book.pages.length, first + 4); i++) {
      const img = new Image(); img.src = `${import.meta.env.BASE_URL}${book.pages[i].image}`; img.decode?.().catch(() => {});
    }
  }, [book.pages, first]);
  const open = (pageIndex, id) => { sound.click(); setActive({ page: pageIndex, id }); };
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "Escape") setActive(null);
      // Right to left: the next page is on the left.
      if (e.key === "ArrowLeft") go(first + step);
      if (e.key === "ArrowRight") go(first - step);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, first, step]);
  const activePage = active && visible.includes(active.page) ? book.pages[active.page] : null;
  const activeHotspot = activePage?.hotspots.find((h) => h.id === active.id);
  const src = (i) => `${import.meta.env.BASE_URL}${book.pages[i].image}`;
  const plain = (i, key) => book.pages[i] ? <div key={key} className="bk-leaf"><div className="bk-sheet"><img src={src(i)} alt="" width="1453" height="1878" draggable="false" /></div></div> : <div key={key} className="bk-leaf bk-leaf-blank" />;
  const face = (i, cls) => <div className={`bk-face ${cls}`}>{book.pages[i] ? <img src={src(i)} alt="" draggable="false" /> : null}</div>;
  // While turning: the pages being uncovered lie flat, and one leaf turns over the spine.
  const turning = () => {
    const { dir, from, to } = flip;
    if (!spread) return <>
      {plain(dir === "next" ? to : from, "flat")}
      <div className={`bk-flipper bk-single-${dir}`} onAnimationEnd={landed}>{face(dir === "next" ? from : to, "bk-front")}</div>
    </>;
    return dir === "next" ? <>
      {plain(from, "r")}{plain(to + 1, "l")}
      <div className="bk-flipper bk-flip-next" onAnimationEnd={landed}>{face(from + 1, "bk-front")}{face(to, "bk-back")}</div>
    </> : <>
      {plain(to, "r")}{plain(from + 1, "l")}
      <div className="bk-flipper bk-flip-prev" onAnimationEnd={landed}>{face(from, "bk-front")}{face(to + 1, "bk-back")}</div>
    </>;
  };
  const leaf = (i) => {
    const page = book.pages[i];
    // The facing page of an open experiment becomes the experiment page.
    if (spread && activeHotspot && active.page !== i) return <div key={`lab-${i}`} className="bk-leaf bk-leaf-lab" ref={setHost} />;
    return <div key={page.pdfPage} className="bk-leaf">
      <Sheet page={page} active={active?.page === i ? active.id : null} onOpen={(id) => open(i, id)}>
        {activeHotspot && active.page === i && <ActiveExperiment key={activeHotspot.id} hotspot={activeHotspot} page={page} onClose={close} cardHost={host} spread={spread} />}
      </Sheet>
      {!spread && <div ref={setHost} className="bk-card-host" />}
    </div>;
  };
  // With one page open, the other half of the spread still needs a host before the lab renders.
  const lonely = spread && activeHotspot && visible.length === 1;
  return <div className="app-screen bk-screen" dir="rtl">
    <div className="mx-auto flex h-full max-w-[1600px]">
      <Sidebar activeItem="lectures" />
      <main className="bk-main" ref={main}>
        <header className="bk-header">
          <div><h1>{book.title}</h1><p>{book.source}</p></div>
          <button type="button" className="bk-icon-button" onClick={() => { sound.setMuted(!muted); setMuted(!muted); }} aria-pressed={!muted} aria-label={muted ? "تشغيل الأصوات" : "كتم الأصوات"} title={muted ? "تشغيل الأصوات" : "كتم الأصوات"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        </header>
        <p className="bk-hint"><FlaskConical size={16} />اضغط على أي شكل عليه «جرّب»: الشكل يشتغل مكانه، والصفحة المقابلة تصير صفحة التجربة.</p>
        <div className="bk-stage">
          <button type="button" className="bk-turn bk-turn-prev" onClick={() => go(first - step)} disabled={first === 0} aria-label="الصفحة السابقة"><ChevronRight size={26} /></button>
          <div className={`bk-book${spread ? " is-spread" : ""}${flip ? " is-turning" : ""}`} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { drag.current = null; }}>
            {flip ? turning() : <>
              {visible.map(leaf)}
              {lonely && <div className="bk-leaf bk-leaf-lab" ref={setHost} />}
              {!activeHotspot && first > 0 && <button type="button" className="bk-corner bk-corner-prev" onClick={() => go(first - step)} aria-label="اقلب للصفحة السابقة" />}
              {!activeHotspot && first + step < book.pages.length && <button type="button" className="bk-corner bk-corner-next" onClick={() => go(first + step)} aria-label="اقلب للصفحة التالية" />}
            </>}
          </div>
          <button type="button" className="bk-turn bk-turn-next" onClick={() => go(first + step)} disabled={first + step >= book.pages.length} aria-label="الصفحة التالية"><ChevronLeft size={26} /></button>
        </div>
        <nav className="bk-thumbs" aria-label="صفحات الكتاب">
          {book.pages.map((p, i) => <button key={p.pdfPage} type="button" aria-current={visible.includes(i) ? "page" : undefined} onClick={() => go(i)} title={p.title}>
            <img src={`${import.meta.env.BASE_URL}${p.image}`} alt="" loading="lazy" width="145" height="188" /><span>{arabic(p.bookPage)}</span>
          </button>)}
        </nav>
        <p className="bk-credit">صفحات الكتاب كما طُبعت، دون تعديل. التجارب التفاعلية من نبراس، وتُحسب بحلّ الدارة نفسها؛ ومحاكي الدارات الحر من CircuitJS (Paul Falstad).</p>
      </main>
    </div>
  </div>;
}
