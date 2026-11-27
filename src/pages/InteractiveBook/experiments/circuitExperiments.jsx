// Experiments on the book's circuit figures. Each one solves the same circuit
// the figure shows (shared/circuitSolver.js) and draws the result on top of it.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { solveCircuit, drop, equivalentResistance, seriesResistance, parallelResistance } from "../../../../shared/circuitSolver.js";
import { At, CurrentFlow, CircuitJSButton, partCenter, amps, volts, ohms, fmt } from "../overlay";
import { sound } from "../sound";

const useValues = (initial) => {
  const [values, setValues] = useState(initial);
  const set = (id, patch) => setValues((v) => ({ ...v, [id]: { ...v[id], ...patch } }));
  return [values, set, setValues];
};
const valueOf = (circuit, values, id, key) => values[id]?.[key] ?? circuit.parts.find((p) => p.id === id)[key];

function Stepper({ label, value, unit, options, onChange }) {
  const i = options.indexOf(value);
  return <div className="bk-stepper"><span>{label}</span>
    <button type="button" disabled={i <= 0} onClick={() => { sound.click(); onChange(options[i - 1]); }} aria-label={`إنقاص ${label}`}>−</button>
    <output>{fmt(value)} {unit}</output>
    <button type="button" disabled={i >= options.length - 1} onClick={() => { sound.click(); onChange(options[i + 1]); }} aria-label={`زيادة ${label}`}>+</button>
  </div>;
}
const RS = [5, 10, 15, 20, 22, 30, 33, 47, 50, 68, 100];
const EMFS = [1.5, 3, 4.5, 6, 9, 12];

// A transparent button over a printed part (a resistor, a switch) that the student clicks.
function Hit({ circuit, id, onClick, label, active, size = 0.12 }) {
  const [x, y] = partCenter(circuit, id);
  return <At x={x} y={y} className={`bk-hit${active ? " is-active" : ""}`} style={{ width: `${size * 100}%` }}>
    <button type="button" aria-label={label} title={label} onClick={onClick} />
  </At>;
}

// A switch drawn closed over the printed open switch.
function SwitchLever({ circuit, id, closed, onToggle, label }) {
  const p = circuit.parts.find((part) => part.id === id);
  const [ax, ay] = circuit.points[p.from], [bx, by] = circuit.points[p.to];
  const h = 1000 * circuit.aspect;
  return <>
    {closed && <svg className="bk-lever" viewBox={`0 0 1000 ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <line x1={ax * 1000} y1={ay * h} x2={bx * 1000} y2={by * h} />
    </svg>}
    <At x={(ax + bx) / 2} y={(ay + by) / 2} className={`bk-switch${closed ? " is-closed" : ""}`}>
      <button type="button" onClick={() => { sound.click(); onToggle(); }} aria-pressed={closed} aria-label={`${label}: ${closed ? "مغلق" : "مفتوح"}`}>{label}</button>
    </At>
  </>;
}

// Example (1) and example (10): the circuit runs, every resistor shows its current,
// and the results are compared with the book's printed answer.
export function LiveCircuit({ hotspot, circuit, Figure, Card }) {
  const solution = useMemo(() => solveCircuit(circuit), [circuit]);
  const [show, setShow] = useState("I");
  const resistors = circuit.parts.filter((p) => p.type === "resistor");
  return <>
    <Figure>
      <CurrentFlow circuit={circuit} solution={solution} />
      {resistors.map((p) => { const [x, y] = partCenter(circuit, p.id);
        return <At key={p.id} x={x} y={y} dy={hotspot.readingOffset?.[p.id] ?? -0.1} className="bk-reading">{show === "I" ? amps(solution.current[p.id]) : volts(Math.abs(drop(solution, p.id)))}</At>; })}
    </Figure>
    <Card footer={<CircuitJSButton circuit={circuit} title={hotspot.label} />}>
      <p>الدارة تعمل الآن. النقاط المتحركة هي التيار الاصطلاحي، وسرعتها تكبر مع شدة التيار؛ الفرع اللي ما فيه نقاط ما يمر فيه تيار.</p>
      <div className="bk-toggle" role="group" aria-label="ماذا تقيس">
        <button type="button" aria-pressed={show === "I"} onClick={() => setShow("I")}>شدة التيار</button>
        <button type="button" aria-pressed={show === "V"} onClick={() => setShow("V")}>فرق الجهد</button>
      </div>
      {hotspot.checks && <table className="bk-table"><thead><tr><th>الكمية</th><th>حل الكتاب</th><th>المحاكاة</th><th /></tr></thead>
        <tbody>{hotspot.checks.map((c) => { const v = c.get(solution); const ok = Math.abs(v - c.book) < 1e-6;
          return <tr key={c.label}><td>{c.label}</td><td>{c.bookText}</td><td>{fmt(v, 3)} {c.unit}</td><td>{ok ? <Check size={15} className="bk-ok" /> : <X size={15} className="bk-bad" />}</td></tr>; })}</tbody></table>}
    </Card>
  </>;
}

// Activity (4-4): series and parallel, measured with a multimeter.
export function Resistors({ hotspot, circuit, Figure, Card }) {
  const series = hotspot.mode === "series";
  const [values, set] = useValues({});
  const [probed, setProbed] = useState({});
  const solution = useMemo(() => solveCircuit(circuit, values), [circuit, values]);
  const ids = ["R1", "R2", "R3"];
  const R = (id) => valueOf(circuit, values, id, "R");
  const emf = valueOf(circuit, values, "battery", "emf");
  const total = solution.current.battery;
  const formula = series ? seriesResistance(ids.map(R)) : parallelResistance(ids.map(R));
  const arrows = series ? { battery: [0.17, 0.86] } : { R1: [0.36, 0.1], R2: [0.36, 0.35], R3: [0.36, 0.6], battery: [0.24, 0.84] };
  return <>
    <Figure>
      <CurrentFlow circuit={circuit} solution={solution} />
      {ids.map((id) => <Hit key={id} circuit={circuit} id={id} active={probed[id]} label={`قِس فرق الجهد بين طرفي ${id}`} onClick={() => { sound.connect(); setProbed((p) => ({ ...p, [id]: !p[id] })); }} />)}
      {ids.filter((id) => probed[id]).map((id) => { const [x, y] = partCenter(circuit, id);
        return <At key={id} x={x} y={y} dy={series ? 0.3 : -0.065} className="bk-reading bk-volt">{volts(drop(solution, id))}</At>; })}
      {Object.entries(arrows).map(([id, [x, y]]) => <At key={id} x={x} y={y} className="bk-reading bk-amp">{amps(solution.current[id])}</At>)}
    </Figure>
    <Card footer={<CircuitJSButton circuit={circuit} values={values} title={hotspot.label} />}>
      <p>{series ? "غيّر قيم المقاومات من هنا، واضغط على أي مقاومة بالرسم لتقيس فرق الجهد بين طرفيها بالملتيميتر." : "غيّر القيم، واضغط على أي مقاومة لتقيس فرق الجهد بين طرفيها. الأميترات تقيس i₁ و i₂ و i₃ و i."}</p>
      <div className="bk-steppers">
        {ids.map((id) => <Stepper key={id} label={id} unit="Ω" value={R(id)} options={RS} onChange={(v) => set(id, { R: v })} />)}
        <Stepper label="البطارية" unit="V" value={emf} options={EMFS} onChange={(v) => set("battery", { emf: v })} />
      </div>
      <table className="bk-table"><thead><tr><th /><th>R</th><th>V</th><th>I</th></tr></thead><tbody>
        {ids.map((id) => <tr key={id}><td>{id}</td><td>{ohms(R(id))}</td><td>{probed[id] ? volts(drop(solution, id)) : "اضغط عليها"}</td><td>{amps(solution.current[id])}</td></tr>)}
      </tbody></table>
      <p className="bk-result">من القياس: R<sub>eq</sub> = V ÷ i = {fmt(emf)} ÷ {fmt(total, 3)} = <strong>{ohms(emf / total)}</strong><br />
        من القانون: {series ? "R₁ + R₂ + R₃" : "1 ÷ (1/R₁ + 1/R₂ + 1/R₃)"} = <strong>{ohms(formula)}</strong> {Math.abs(emf / total - formula) < 1e-6 && <Check size={15} className="bk-ok" />}</p>
      <p className="bk-note">{series ? "لاحظ: نفس التيار بكل المقاومات، ومجموع فروق الجهد = جهد البطارية." : "لاحظ: نفس فرق الجهد على كل مقاومة، و i = i₁ + i₂ + i₃."} البطارية مثالية (بدون مقاومة داخلية) والقيم من اختيار نبراس؛ النشاط بالكتاب ما بيحدد قيم.</p>
    </Card>
  </>;
}

// Example (8) and the question on page 69: an ohmmeter across A and B.
export function Equivalent({ hotspot, circuit, Figure, Card }) {
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState(hotspot.solved ? "shown" : "idle");
  const probe = useMemo(() => {
    const parts = [...circuit.parts, { id: "__ohm", type: "battery", from: "B", to: "A", emf: 1.5, r: 0 }];
    return solveCircuit({ ...circuit, parts });
  }, [circuit]);
  const req = equivalentResistance(circuit, "A", "B");
  const check = () => {
    const value = Number(String(answer).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(",", "."));
    const ok = Math.abs(value - hotspot.answer) < 0.01;
    setState(ok ? "right" : "wrong"); ok ? sound.right() : sound.wrong();
  };
  const metered = state === "right" || state === "shown";
  const [ax, ay] = circuit.points.A, [bx, by] = circuit.points.B;
  return <>
    <Figure>
      {metered && <CurrentFlow circuit={circuit} solution={probe} />}
      {metered && <At x={(ax + bx) / 2} y={(ay + by) / 2} dy={0.08} className="bk-reading bk-ohm">أوميتر: {ohms(req)}</At>}
    </Figure>
    <Card footer={<CircuitJSButton circuit={circuit} title={hotspot.label} />}>
      {hotspot.solved ? <p>وصّلنا أوميتر بين A و B: قراءته {ohms(req)}، نفس جواب الكتاب. النقاط بتبيّن كيف يتوزع التيار لما نطبق جهد بين A و B.</p> : <>
        <p>احسب المقاومة المكافئة بين A و B بدفترك، واكتب الناتج:</p>
        <form className="bk-answer" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <input inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="المقاومة المكافئة بالأوم" placeholder="مثلًا 3.5" />
          <span>Ω</span><button type="submit" className="bk-button">تحقّق</button>
        </form>
        {state === "wrong" && <p className="bk-bad">مش هيك. ابدأ من الأبعد عن A و B: المقاومات اللي على خط واحد بدون تفرّع توالي.</p>}
        {state === "right" && <p className="bk-ok">صح! والأوميتر بين A و B بيقرأ {ohms(req)}.</p>}
      </>}
      {metered && <ol className="bk-steps">{hotspot.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
    </Card>
  </>;
}

// Page 82: balance the Wheatstone bridge with R3, then find Rx.
const UNKNOWNS = [12, 18, 24, 30, 36, 42];
export function Wheatstone({ hotspot, circuit, Figure, Card }) {
  const [Rx, setRx] = useState(() => UNKNOWNS[Math.floor(Math.random() * UNKNOWNS.length)]);
  const [values, set] = useValues({ R3: { R: 10 }, S1: { closed: false }, S2: { closed: false } });
  const solution = useMemo(() => solveCircuit(circuit, { ...values, Rx: { R: Rx } }), [circuit, values, Rx]);
  const ig = solution.current.G || 0;
  const closed = values.S1.closed && values.S2.closed;
  const balanced = closed && Math.abs(ig) < 2e-5;
  const was = useRef(false);
  useEffect(() => { if (balanced && !was.current) sound.ding(); was.current = balanced; }, [balanced]);
  const [answer, setAnswer] = useState(""), [state, setState] = useState("idle");
  const angle = Math.max(-70, Math.min(70, (ig / 0.02) * 70));
  const [gx, gy] = partCenter(circuit, "G");
  return <>
    <Figure>
      <CurrentFlow circuit={circuit} solution={solution} />
      <SwitchLever circuit={circuit} id="S1" label="S₁" closed={values.S1.closed} onToggle={() => set("S1", { closed: !values.S1.closed })} />
      <SwitchLever circuit={circuit} id="S2" label="S₂" closed={values.S2.closed} onToggle={() => set("S2", { closed: !values.S2.closed })} />
      <At x={gx} y={gy} className={`bk-needle${balanced ? " is-zero" : ""}`}><i style={{ transform: `rotate(${angle}deg)` }} /></At>
      <At x={0.28} y={0.52} className="bk-reading">R<sub>x</sub> = ؟</At>
      <At x={0.7} y={0.73} className="bk-reading">{ohms(values.R3.R)}</At>
    </Figure>
    <Card footer={<CircuitJSButton circuit={circuit} values={{ ...values, Rx: { R: Rx } }} title={hotspot.label} />}>
      <p>R₁ = 10 Ω و R₂ = 20 Ω معلومتان، و R<sub>x</sub> مجهولة. أغلق S₁ ثم S₂، وحرّك R₃ حتى تصير قراءة الجلفانوميتر صفرًا.</p>
      <label className="bk-slider">R₃ = <strong>{ohms(values.R3.R)}</strong>
        <input type="range" min="1" max="30" step="0.5" value={values.R3.R} onChange={(e) => set("R3", { R: Number(e.target.value) })} /></label>
      <p className={balanced ? "bk-ok" : ""}>الجلفانوميتر: {closed ? `${fmt(ig * 1000, 2)} mA` : "أغلق المفتاحين"} {balanced && "· القنطرة متزنة ✓"}</p>
      {balanced && <form className="bk-answer" onSubmit={(e) => { e.preventDefault(); const ok = Math.abs(Number(answer) - Rx) / Rx < 0.02; setState(ok ? "right" : "wrong"); ok ? sound.right() : sound.wrong(); }}>
        <label>R<sub>x</sub> = <input inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="قيمة المقاومة المجهولة" /> Ω</label>
        <button type="submit" className="bk-button">تحقّق</button>
      </form>}
      {state === "right" && <p className="bk-ok">صح: R<sub>x</sub> = R₂ × R₃ ÷ R₁ = 20 × {fmt(values.R3.R)} ÷ 10 = {ohms(Rx)}.</p>}
      {state === "wrong" && <p className="bk-bad">راجع العلاقة: R₁ ÷ R₂ = R₃ ÷ R<sub>x</sub>.</p>}
      <button type="button" className="bk-button bk-button-ghost" onClick={() => { setRx(UNKNOWNS[(UNKNOWNS.indexOf(Rx) + 1 + Math.floor(Math.random() * 4)) % UNKNOWNS.length]); setState("idle"); setAnswer(""); }}><RotateCcw size={14} />مقاومة مجهولة جديدة</button>
      <p className="bk-note">البطارية 12 V ومقاومتها الداخلية 1.25 Ω كما في مثال (9).</p>
    </Card>
  </>;
}

// Activity (5-1): Kirchhoff's first law with S1, S2 and four ammeters.
export function Kirchhoff1({ hotspot, circuit, Figure, Card }) {
  const [values, set] = useValues({ S1: { closed: false }, S2: { closed: false } });
  const [rows, setRows] = useState([]);
  const solution = useMemo(() => solveCircuit(circuit, values), [circuit, values]);
  const meters = ["A", "A1", "A2", "A3"];
  const R = (id) => valueOf(circuit, values, id, "R");
  const now = () => ({ state: `${values.S1.closed ? "S₁ مغلق" : "S₁ مفتوح"} · ${values.S2.closed ? "S₂ مغلق" : "S₂ مفتوح"}`, r: ["R1", "R2", "R3"].map(R), ...Object.fromEntries(meters.map((m) => [m, solution.current[m]])) });
  return <>
    <Figure>
      <CurrentFlow circuit={circuit} solution={solution} />
      <SwitchLever circuit={circuit} id="S1" label="S₁" closed={values.S1.closed} onToggle={() => set("S1", { closed: !values.S1.closed })} />
      <SwitchLever circuit={circuit} id="S2" label="S₂" closed={values.S2.closed} onToggle={() => set("S2", { closed: !values.S2.closed })} />
      {meters.map((m) => { const [x, y] = partCenter(circuit, m); return <At key={m} x={x} y={y} dy={-0.085} className="bk-reading bk-amp">{amps(solution.current[m])}</At>; })}
    </Figure>
    <Card footer={<CircuitJSButton circuit={circuit} values={values} title={hotspot.label} />}>
      <p>اضغط على S₁ و S₂ بالرسم لتغلقهما، وسجّل قراءات الأميترات بعد كل خطوة.</p>
      <div className="bk-steppers">{["R1", "R2", "R3"].map((id) => <Stepper key={id} label={id} unit="Ω" value={R(id)} options={RS} onChange={(v) => set(id, { R: v })} />)}</div>
      <button type="button" className="bk-button" onClick={() => { sound.connect(); setRows((r) => [...r, now()].slice(-6)); }}>سجّل القراءات</button>
      {rows.length > 0 && <table className="bk-table"><thead><tr><th>الحالة</th><th>A</th><th>A₁</th><th>A₂</th><th>A₃</th><th>A₁+A₂+A₃</th></tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}><td>{row.state}</td>{meters.map((m) => <td key={m}>{fmt(row[m], 3)}</td>)}<td>{fmt(row.A1 + row.A2 + row.A3, 3)}</td></tr>)}</tbody></table>}
      {rows.length > 1 && <p className="bk-result">ماذا تستنتج؟ في كل الحالات قراءة A = A₁ + A₂ + A₃: مجموع التيارات الداخلة لنقطة التفرع يساوي مجموع الخارجة منها.</p>}
      <p className="bk-note">البطارية 6 V والقيم من اختيار نبراس؛ غيّرها وكرر الخطوات كما يطلب النشاط.</p>
    </Card>
  </>;
}

// Activity (5-2): Kirchhoff's second law, element by element around a loop.
const LOOPS = [
  { name: "الحلقة العلوية", steps: [["R1", "r1a"], ["E1", "e1p"], ["R2", "r2b"], ["E2", "e2m"]] },
  { name: "الحلقة السفلية", steps: [["E2", "e2p"], ["R2", "r2a"], ["E3", "e3p"], ["R3", "r3b"]] },
  { name: "الحلقة الخارجية", steps: [["R1", "r1a"], ["E1", "e1p"], ["E3", "e3p"], ["R3", "r3b"]] }
];
const LABELS = { R1: "R₁", R2: "R₂", R3: "R₃", E1: "ε₁", E2: "ε₂", E3: "ε₃" };
export function Kirchhoff2({ hotspot, circuit, Figure, Card }) {
  const [loop, setLoop] = useState(0);
  const [measured, setMeasured] = useState({});
  const solution = useMemo(() => solveCircuit(circuit), [circuit]);
  const steps = LOOPS[loop].steps;
  const dv = ([id, entry]) => { const p = circuit.parts.find((x) => x.id === id); const exit = p.from === entry ? p.to : p.from; return solution.voltage[exit] - solution.voltage[entry]; };
  const done = steps.every(([id]) => measured[`${loop}:${id}`]);
  const measure = (id) => { if (!steps.some(([s]) => s === id)) { sound.wrong(); return; } sound.connect(); setMeasured((m) => ({ ...m, [`${loop}:${id}`]: true })); };
  useEffect(() => { if (done) sound.right(); }, [done]);
  return <>
    <Figure>
      <CurrentFlow circuit={circuit} solution={solution} />
      {Object.keys(LABELS).map((id) => <Hit key={id} circuit={circuit} id={id} size={0.16} active={measured[`${loop}:${id}`]} label={`قِس التغير في الجهد عبر ${LABELS[id]}`} onClick={() => measure(id)} />)}
      {steps.filter(([id]) => measured[`${loop}:${id}`]).map((step) => { const [x, y] = partCenter(circuit, step[0]);
        return <At key={step[0]} x={x} y={y} dy={0.1} className="bk-reading bk-volt">{dv(step) > 0 ? "+" : ""}{volts(dv(step))}</At>; })}
    </Figure>
    <Card footer={<CircuitJSButton circuit={circuit} title={hotspot.label} />}>
      <div className="bk-toggle" role="group" aria-label="اختر المسار المغلق">{LOOPS.map((l, i) => <button key={l.name} type="button" aria-pressed={loop === i} onClick={() => setLoop(i)}>{l.name}</button>)}</div>
      <p>امشِ بالمسار مع عقارب الساعة، واضغط على كل عنصر فيه بالرسم لتقيس التغير في الجهد عبره.</p>
      <table className="bk-table"><thead><tr><th>العنصر</th><th>ΔV</th></tr></thead><tbody>
        {steps.map((step) => <tr key={step[0]}><td>{LABELS[step[0]]}</td><td>{measured[`${loop}:${step[0]}`] ? volts(dv(step)) : "—"}</td></tr>)}
        <tr className="bk-sum"><td>المجموع</td><td>{done ? volts(steps.reduce((n, s) => n + dv(s), 0)) : "أكمل القياس"}</td></tr>
      </tbody></table>
      {done && <p className="bk-result">ماذا تستنتج؟ مجموع تغيرات الجهد عبر المسار المغلق = صفر. جرّب مسارًا آخر.</p>}
      <p className="bk-note">القيم من اختيار نبراس (الكتاب ما بيحددها): ε₁ = 6 V، ε₂ = 4 V، ε₃ = 3 V، R₁ = 10 Ω، R₂ = 20 Ω، R₃ = 30 Ω.</p>
    </Card>
  </>;
}

// Page 59: the same loop shown as conventional current or as electrons.
export function Conventional({ hotspot, circuit, Figure, Card }) {
  const [electrons, setElectrons] = useState(false);
  const solution = useMemo(() => solveCircuit(circuit), [circuit]);
  return <>
    <Figure>
      <CurrentFlow circuit={circuit} solution={solution} reverse={electrons} />
      <At x={0.842} y={0.17} className="bk-glow" />
    </Figure>
    <Card>
      <div className="bk-toggle" role="group" aria-label="ماذا نعرض">
        <button type="button" aria-pressed={!electrons} onClick={() => { sound.click(); setElectrons(false); }}>التيار الاصطلاحي</button>
        <button type="button" aria-pressed={electrons} onClick={() => { sound.click(); setElectrons(true); }}>حركة الإلكترونات</button>
      </div>
      <p>{electrons ? "الإلكترونات (سالبة) تتحرك في السلك من القطب السالب للبطارية إلى القطب الموجب." : "التيار الاصطلاحي يخرج من القطب الموجب للبطارية ويرجع للقطب السالب عبر الدارة، باتجاه حركة الشحنات الموجبة."}</p>
    </Card>
  </>;
}

// Activity (4-2), last step: a circuit to find a metal wire's resistance.
export function OhmLab({ hotspot, circuit, Figure, Card }) {
  const [emf, setEmf] = useState(3);
  const [rows, setRows] = useState([]);
  const [answer, setAnswer] = useState(""), [state, setState] = useState("idle");
  const solution = useMemo(() => solveCircuit(circuit, { battery: { emf } }), [circuit, emf]);
  const V = Math.round((solution.voltage.wa - solution.voltage.wb) * 100) / 100;
  const I = Math.round(solution.current.A * 1000) / 1000;
  const Rtrue = circuit.parts.find((p) => p.id === "wire").R;
  const maxV = 12, maxI = maxV / Rtrue;
  const slope = rows.length ? rows.reduce((n, r) => n + r.V * r.I, 0) / rows.reduce((n, r) => n + r.I * r.I, 0) : null;
  return <>
    <Figure><div className="bk-mark" /></Figure>
    <Card footer={<CircuitJSButton circuit={circuit} values={{ battery: { emf } }} title={hotspot.label} />}>
      <p>الدارة: مصدر جهد، وأميتر على التوالي مع السلك، وفولتميتر بين طرفي السلك. غيّر جهد المصدر، وسجّل القراءتين في كل مرة.</p>
      <label className="bk-slider">جهد المصدر = <strong>{volts(emf)}</strong>
        <input type="range" min="1.5" max="12" step="1.5" value={emf} onChange={(e) => setEmf(Number(e.target.value))} /></label>
      <p className="bk-meters"><span>الفولتميتر: <strong>{volts(V)}</strong></span><span>الأميتر: <strong>{amps(I)}</strong></span></p>
      <button type="button" className="bk-button" onClick={() => { sound.connect(); setRows((r) => r.some((x) => x.V === V) ? r : [...r, { V, I }].sort((a, b) => a.V - b.V)); }}>سجّل القراءة</button>
      {rows.length > 0 && <svg className="bk-plot" viewBox="0 0 220 140" role="img" aria-label="منحنى فرق الجهد مع التيار">
        <line x1="30" y1="120" x2="210" y2="120" /><line x1="30" y1="120" x2="30" y2="10" />
        <text x="212" y="132">I</text><text x="12" y="14">V</text>
        {slope && <line className="bk-fit" x1="30" y1="120" x2={30 + 180} y2={120 - (slope * maxI / maxV) * 110} />}
        {rows.map((r) => <circle key={r.V} cx={30 + (r.I / maxI) * 180} cy={120 - (r.V / maxV) * 110} r="3.5" />)}
      </svg>}
      {rows.length >= 3 && <form className="bk-answer" onSubmit={(e) => { e.preventDefault(); const ok = Math.abs(Number(answer) - Rtrue) / Rtrue < 0.05; setState(ok ? "right" : "wrong"); ok ? sound.right() : sound.wrong(); }}>
        <label>مقاومة السلك من ميل الخط R = V ÷ I = <input inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label="مقاومة السلك" /> Ω</label>
        <button type="submit" className="bk-button">تحقّق</button>
      </form>}
      {state === "right" && <p className="bk-ok">صح: الخط مستقيم يمر بنقطة الأصل، يعني السلك يطيع قانون أوم و R ثابتة = {ohms(Rtrue)}.</p>}
      {state === "wrong" && <p className="bk-bad">اقسم أي قراءة جهد على التيار المقابل لها.</p>}
    </Card>
  </>;
}
