// Experiments on the book's photos and drawings that are not circuit diagrams.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { At, Choice, fmt } from "../overlay";
import { sound } from "../sound";

// Activity (4-1): light the lamp with the battery and a wire.
// Terminals on the photo (fractions of the photo).
const TERMINALS = {
  plus: { x: 0.658, y: 0.15, label: "القطب الموجب (+)" },
  minus: { x: 0.658, y: 0.69, label: "القطب السالب (−)" },
  tip: { x: 0.268, y: 0.725, label: "قاعدة المصباح (الطرف السفلي)" },
  side: { x: 0.348, y: 0.595, label: "جسم المصباح المعدني (القلاووظ)" }
};
const key = (a, b) => [a, b].sort().join("-");
function classify(wires) {
  const set = new Set(wires.map(([a, b]) => key(a, b)));
  if (set.has(key("plus", "minus"))) return { lit: false, short: true, text: "دارة قصر: السلك وصل قطبي البطارية مباشرة. البطارية بتسخن والمصباح ما بيضوي." };
  const lit = (set.has(key("tip", "plus")) && set.has(key("side", "minus"))) || (set.has(key("tip", "minus")) && set.has(key("side", "plus")));
  if (lit) return { lit: true, text: "المصباح أضاء: طرفا المصباح موصولان بقطبين مختلفين، فصار للشحنات مسار مغلق." };
  if (set.has(key("tip", "side"))) return { lit: false, text: "وصلت طرفي المصباح ببعض؛ التيار ما بيمر بفتيلة المصباح." };
  if (wires.length < 2) return { lit: false, text: "الدارة مفتوحة: لازم مسار مغلق من القطب الموجب، عبر المصباح، إلى القطب السالب." };
  return { lit: false, text: "طرفا المصباح موصولان بنفس القطب أو الدارة غير مغلقة، فما في فرق جهد على المصباح." };
}
export function Lamp({ Figure, Card }) {
  const [wires, setWires] = useState([]);
  const [first, setFirst] = useState(null);
  const [found, setFound] = useState({ lit: [], dark: [] });
  const result = classify(wires);
  const pick = (t) => {
    if (!first) { setFirst(t); sound.click(); return; }
    if (first === t) { setFirst(null); return; }
    setFirst(null);
    if (wires.length >= 2 || wires.some(([a, b]) => key(a, b) === key(first, t))) return;
    const next = [...wires, [first, t]];
    setWires(next); sound.connect();
    const r = classify(next);
    if (r.lit) sound.light(); else if (r.short) sound.buzz();
    if (next.length === 2 || r.short) {
      const id = next.map(([a, b]) => key(a, b)).sort().join("|");
      setFound((f) => r.lit ? { ...f, lit: f.lit.includes(id) ? f.lit : [...f.lit, id] } : { ...f, dark: f.dark.includes(id) ? f.dark : [...f.dark, id] });
    }
  };
  const h = 592;
  return <>
    <Figure>
      <svg className="bk-wires" viewBox={`0 0 1000 ${h}`} preserveAspectRatio="none" aria-hidden="true">
        {wires.map(([a, b]) => { const A = TERMINALS[a], B = TERMINALS[b];
          const mx = (A.x + B.x) / 2 * 1000, my = Math.max(A.y, B.y) * h + 120;
          return <path key={key(a, b)} d={`M${A.x * 1000} ${A.y * h} Q${mx} ${my} ${B.x * 1000} ${B.y * h}`} className={result.short ? "is-hot" : ""} />; })}
      </svg>
      {result.lit && <At x={0.39} y={0.665} className="bk-glow bk-glow-strong" />}
      {Object.entries(TERMINALS).map(([id, t]) => <At key={id} x={t.x} y={t.y} style={{ width: "6.5%" }} className={`bk-terminal${first === id ? " is-picked" : ""}`}>
        <button type="button" aria-label={t.label} title={t.label} onClick={() => pick(id)} />
      </At>)}
    </Figure>
    <Card>
      <p>اضغط على نقطة ثم على نقطة ثانية لتمد سلكًا بينهما (سلكان كحد أقصى). حاول تضوي المصباح.</p>
      <p className={result.lit ? "bk-ok" : result.short ? "bk-bad" : ""}>{wires.length ? result.text : "ما في أسلاك بعد."}</p>
      <ul className="bk-goals">
        <li className={found.lit.length >= 2 ? "is-done" : ""}>{found.lit.length >= 2 && <Check size={14} />}طريقتان يضيء فيهما المصباح: {fmt(Math.min(found.lit.length, 2))} / 2</li>
        <li className={found.dark.length >= 3 ? "is-done" : ""}>{found.dark.length >= 3 && <Check size={14} />}ثلاث حالات لا يضيء فيها: {fmt(Math.min(found.dark.length, 3))} / 3</li>
      </ul>
      <button type="button" className="bk-button bk-button-ghost" onClick={() => { setWires([]); setFirst(null); }}><RotateCcw size={14} />افصل الأسلاك</button>
      <p className="bk-note">ارسم كل حالة بدفترك كما يطلب النشاط.</p>
    </Card>
  </>;
}

// Page 59, question: rank the four sections by current, and give its direction.
// A: 3 positive charges right and 2 negative left -> 5 units right.
// B: 3 positive left -> 3 left. C: 2 positive right, 2 negative left -> 4 right. D: 2 negative right -> 2 left.
const SECTIONS = { A: { x: 0.123, net: 5, dir: "right" }, B: { x: 0.377, net: 3, dir: "left" }, C: { x: 0.622, net: 4, dir: "right" }, D: { x: 0.873, net: 2, dir: "left" } };
export function Ranking({ Figure, Card }) {
  const [order, setOrder] = useState([]);
  const [dirs, setDirs] = useState({});
  const [state, setState] = useState("idle");
  const right = ["D", "B", "C", "A"];
  const check = () => {
    const ok = order.join("") === right.join("") && Object.entries(SECTIONS).every(([k, s]) => dirs[k] === s.dir);
    setState(ok ? "right" : "wrong"); ok ? sound.right() : sound.wrong();
  };
  return <>
    <Figure>
      {Object.entries(SECTIONS).map(([k, s]) => <At key={k} x={s.x} y={0.38} className="bk-rank">
        <button type="button" aria-label={`المقطع ${k}`} onClick={() => { sound.click(); setState("idle"); setOrder((o) => o.includes(k) ? o.filter((x) => x !== k) : [...o, k]); }}>
          {order.includes(k) ? fmt(order.indexOf(k) + 1) : ""}
        </button>
      </At>)}
    </Figure>
    <Card>
      <p>اضغط على المقاطع بالترتيب من الأقل شدة تيار إلى الأكثر، ثم حدد اتجاه التيار الاصطلاحي في كل مقطع.</p>
      <div className="bk-dirs">{Object.keys(SECTIONS).map((k) => <div key={k}><strong>{k}</strong>
        <button type="button" aria-pressed={dirs[k] === "left"} onClick={() => setDirs((d) => ({ ...d, [k]: "left" }))} aria-label={`اتجاه ${k} لليسار`}>←</button>
        <button type="button" aria-pressed={dirs[k] === "right"} onClick={() => setDirs((d) => ({ ...d, [k]: "right" }))} aria-label={`اتجاه ${k} لليمين`}>→</button>
      </div>)}</div>
      <button type="button" className="bk-button" disabled={order.length < 4} onClick={check}>تحقّق</button>
      {state === "right" && <p className="bk-ok">صح: D ثم B ثم C ثم A. الشحنة السالبة المتحركة لليسار تكافئ موجبة متحركة لليمين، لهيك بنجمعهم.</p>}
      {state === "wrong" && <p className="bk-bad">عدّ صافي الشحنة العابرة: كل شحنة موجبة لجهة بتساوي شحنة سالبة للجهة المعاكسة.</p>}
    </Card>
  </>;
}

// Activity (4-3): the same current through a conductor that narrows.
// Profile of the drawn conductor (fractions of the figure): wide until 0.42, narrow from 0.64.
const WIDE = [0.319, 0.886], NARROW = [0.48, 0.741];
const smooth = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const edges = (x) => { const t = smooth((x - 0.42) / 0.22); return [WIDE[0] + (NARROW[0] - WIDE[0]) * t, WIDE[1] + (NARROW[1] - WIDE[1]) * t]; };
export function Drift({ Figure, Card }) {
  const dots = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: (i * 0.618) % 1, u: ((i * 0.377) % 0.84) - 0.42 })), []);
  useEffect(() => {
    let raf, last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // The figure may be drawn twice (on the page and enlarged); move the dots in both.
      const drawings = [...document.querySelectorAll(".bk-drift")].map((el) => el.querySelectorAll("circle"));
      dots.forEach((d, i) => {
        const [top, bottom] = edges(d.x);
        // Same current everywhere: the drift speed grows as the section narrows.
        d.x -= dt * 0.06 * ((WIDE[1] - WIDE[0]) / (bottom - top));
        if (d.x < 0.01) d.x = 0.985;
        const [t2, b2] = edges(d.x);
        for (const circles of drawings) { const c = circles[i]; if (c) { c.setAttribute("cx", d.x * 1000); c.setAttribute("cy", ((t2 + b2) / 2 + d.u * (b2 - t2)) * 659); } }
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [dots]);
  const ratio = (WIDE[1] - WIDE[0]) / (NARROW[1] - NARROW[0]);
  return <>
    <Figure>
      <svg className="bk-drift" viewBox="0 0 1000 659" preserveAspectRatio="none" aria-hidden="true">{dots.map((_, i) => <circle key={i} r="9" />)}</svg>
      <At x={0.12} y={0.93} className="bk-reading">v<sub>d</sub> × 1</At>
      <At x={0.86} y={0.93} className="bk-reading">v<sub>d</sub> × {fmt(ratio, 1)}</At>
    </Figure>
    <Card>
      <p>النقاط هي الإلكترونات الحرة، وتتحرك عكس اتجاه التيار I. نفس عدد الشحنات يعبر كل مقطع بالثانية، فتسرع حيث يضيق الموصل.</p>
      <Choice question="عند أي نقطة تكون شدة التيار أكبر؟" options={["a", "b", "c", "متساوية في الجميع"]} answer="متساوية في الجميع" />
      <Choice question="ما اتجاه المجال الكهربائي عبر الموصل؟" options={["باتجاه I", "عكس اتجاه I"]} answer="باتجاه I" />
      <Choice question="عند أي نقطة تكون السرعة الانسياقية أكبر؟" options={["a", "b", "c"]} answer="c" />
      <Choice question="عند أي نقطة تكون كثافة التيار (I لوحدة المساحة) أكبر؟" options={["a", "b", "c"]} answer="c" />
    </Card>
  </>;
}

// Figure (4-3): move along both curves and watch V / I.
// Graph geometry in fractions of the two-graph figure.
const OHMIC = { o: [0.0708, 0.8766], e: [0.283, 0.305] };
const NONOHMIC = { o: [0.6637, 0.8475], e: [0.8659, 0.3503] };
export function IVCurves({ Figure, Card }) {
  const [t, setT] = useState(0.6);
  const p1 = [OHMIC.o[0] + t * (OHMIC.e[0] - OHMIC.o[0]), OHMIC.o[1] + t * (OHMIC.e[1] - OHMIC.o[1])];
  const p2 = [NONOHMIC.o[0] + t * (NONOHMIC.e[0] - NONOHMIC.o[0]), NONOHMIC.o[1] + t * t * (NONOHMIC.e[1] - NONOHMIC.o[1])];
  const h = 371;
  return <>
    <Figure>
      <svg className="bk-iv" viewBox={`0 0 1000 ${h}`} preserveAspectRatio="none" aria-hidden="true">
        {[[OHMIC.o, p1], [NONOHMIC.o, p2]].map(([o, p], i) => <g key={i}>
          <line x1={o[0] * 1000} y1={o[1] * h} x2={p[0] * 1000} y2={p[1] * h} className="bk-chord" />
          <line x1={p[0] * 1000} y1={p[1] * h} x2={p[0] * 1000} y2={o[1] * h} className="bk-guide" />
          <line x1={p[0] * 1000} y1={p[1] * h} x2={o[0] * 1000} y2={p[1] * h} className="bk-guide" />
          <circle cx={p[0] * 1000} cy={p[1] * h} r="7" />
        </g>)}
      </svg>
      <At x={p1[0]} y={p1[1]} dx={0.07} className="bk-reading">R = {fmt(1, 2)}</At>
      <At x={p2[0]} y={p2[1]} dx={0.07} className="bk-reading">R = {fmt(1 / t, 2)}</At>
    </Figure>
    <Card>
      <label className="bk-slider">فرق الجهد V
        <input type="range" min="0.15" max="1" step="0.01" value={t} onChange={(e) => setT(Number(e.target.value))} /></label>
      <p>الخط المتقطع من الأصل ميله I ÷ V = 1 ÷ R. في المقاومة الأومية يبقى الميل ثابتًا (R ثابتة)، وفي اللاأومية يتغير الميل مع الجهد فتتغير R.</p>
      <p className="bk-note">القيم بوحدات نسبية؛ الشكل بالكتاب بدون أرقام على المحاور.</p>
    </Card>
  </>;
}
