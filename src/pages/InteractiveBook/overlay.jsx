// Building blocks that sit on top of a printed figure. Positions are fractions
// of the figure box, so everything lines up with the drawing at any size.
import { ExternalLink, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { PAGE_SIZE } from "../../data/books/physicsUnit2";
import { circuitJSLink } from "../../../shared/circuitjs.js";
import { sound } from "./sound";

export const pct = (n) => `${(n * 100).toFixed(3)}%`;
export const rectStyle = ([x0, y0, x1, y1]) => ({
  left: pct(x0 / PAGE_SIZE[0]), top: pct(y0 / PAGE_SIZE[1]), width: pct((x1 - x0) / PAGE_SIZE[0]), height: pct((y1 - y0) / PAGE_SIZE[1])
});

export const fmt = (n, digits = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const v = Math.abs(n) < 5e-10 ? 0 : n;
  return new Intl.NumberFormat("ar", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v);
};
export const amps = (i) => `${fmt(Math.abs(i), Math.abs(i) < 0.1 && i !== 0 ? 3 : 2)} A`;
export const volts = (v) => `${fmt(v, 2)} V`;
export const ohms = (r) => `${fmt(r, 2)} Ω`;

export const partCenter = (circuit, id) => {
  const p = circuit.parts.find((part) => part.id === id);
  const [ax, ay] = circuit.points[p.from], [bx, by] = circuit.points[p.to];
  return [(ax + bx) / 2, (ay + by) / 2];
};

// An element placed at a point of the figure, centred on it.
export function At({ x, y, className = "", children, dx = 0, dy = 0, style, ...rest }) {
  return <div className={`bk-at ${className}`} style={{ ...style, left: pct(x + dx), top: pct(y + dy) }} {...rest}>{children}</div>;
}

// Moving dots along every conducting part, faster where the current is larger.
// `reverse` shows electrons instead of conventional current.
export function CurrentFlow({ circuit, solution, reverse = false, className = "" }) {
  if (!solution?.ok) return null;
  const h = 1000 * circuit.aspect;
  const values = Object.values(solution.current).filter((i) => i !== null).map(Math.abs);
  const max = Math.max(...values, 1e-9);
  return <svg className={`bk-flow ${className}`} viewBox={`0 0 1000 ${h}`} preserveAspectRatio="none" aria-hidden="true">
    {circuit.parts.map((p) => {
      const i = solution.current[p.id];
      if (i === null || i === undefined || Math.abs(i) < 1e-6 || p.type === "voltmeter") return null;
      const points = [p.from, ...(p.via || []), p.to].map((n) => circuit.points[n]);
      const d = points.map(([x, y], k) => `${k ? "L" : "M"}${(x * 1000).toFixed(1)} ${(y * h).toFixed(1)}`).join(" ");
      const speed = 25 + 110 * (Math.abs(i) / max);
      const forward = (i > 0) !== reverse;
      return <path key={p.id} d={d} className={reverse ? "bk-electrons" : "bk-conventional"}
        style={{ animationDuration: `${(24 / speed).toFixed(3)}s`, animationDirection: forward ? "normal" : "reverse" }} />;
    })}
  </svg>;
}

const E12 = [1, 1.5, 2.2, 3.3, 4.7, 6.8, 10, 15, 22, 33, 47, 68, 100];
// A value printed beside a part that the student can step up or down.
export function ValueChip({ x, y, value, unit = "Ω", steps = E12, onChange, label }) {
  const index = steps.findIndex((s) => s >= value - 1e-9);
  const step = (dir) => {
    const next = steps[Math.min(steps.length - 1, Math.max(0, (index < 0 ? steps.length - 1 : index) + dir))];
    if (next !== value) onChange(next);
  };
  return <At x={x} y={y} className="bk-chip">
    <button type="button" onClick={() => step(-1)} aria-label={`إنقاص ${label}`}><Minus size={10} /></button>
    <span>{fmt(value, 2)} {unit}</span>
    <button type="button" onClick={() => step(1)} aria-label={`زيادة ${label}`}><Plus size={10} /></button>
  </At>;
}

// The lab card beside the figure: instructions, controls and results.
export function LabCard({ title, children, footer }) {
  return <section className="bk-card" aria-label={title}>
    <h3>{title}</h3>
    {children}
    {footer && <div className="bk-card-footer">{footer}</div>}
  </section>;
}

export function CircuitJSButton({ circuit, values, title }) {
  const [open, setOpen] = useState(false);
  if (!circuit) return null;
  return <>
    <button type="button" className="bk-button bk-button-ghost" onClick={() => setOpen(true)}><ExternalLink size={14} />افتحها في محاكي الدارات</button>
    {open && <div className="bk-modal" role="dialog" aria-modal="true" aria-label={`محاكي الدارات: ${title}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="bk-modal-box">
        <header><strong>محاكي الدارات · {title}</strong><button type="button" className="bk-button" onClick={() => setOpen(false)}>إغلاق</button></header>
        <iframe title={`CircuitJS: ${title}`} src={circuitJSLink(circuit, values, { aspect: circuit.aspect })} />
        <p>نفس الدارة اللي بالكتاب في محاكي CircuitJS (Paul Falstad، رخصة GPL-2.0). عدّل القيم، أضف عناصر، واسحب الأسلاك بحرية. يحتاج اتصال بالإنترنت.</p>
      </div>
    </div>}
  </>;
}

export function Choice({ question, options, answer, onResult }) {
  const [picked, setPicked] = useState(null);
  return <div className="bk-choice">
    <p>{question}</p>
    <div>{options.map((o) => <button type="button" key={o} className={picked === o ? (o === answer ? "is-right" : "is-wrong") : ""}
      onClick={() => { setPicked(o); o === answer ? sound.right() : sound.wrong(); onResult?.(o === answer); }}>{o}</button>)}</div>
  </div>;
}
