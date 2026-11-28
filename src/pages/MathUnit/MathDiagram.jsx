import { useEffect, useId, useRef, useState } from "react";
import { diagramSpecs, diagramState } from "../../../shared/mathUnit.js";

const fmt = (n) =>
  n === null
    ? "غير معرّف"
    : n.toLocaleString("ar", { maximumFractionDigits: 3 });
export default function MathDiagram({ code }) {
  const spec = diagramSpecs[code],
    id = useId(),
    [x, setX] = useState(spec.initial),
    [second, setSecond] = useState(spec.second ?? 2),
    [playing, setPlaying] = useState(false),
    frame = useRef();
  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    const animate = (now) => {
      const t = ((now - start) / 7000) % 2;
      setX(spec.min + (spec.max - spec.min) * (t <= 1 ? t : 2 - t));
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, spec]);
  const state = diagramState(code, x, second),
    samples = Array.from({ length: 161 }, (_, i) => {
      const sx = spec.min + ((spec.max - spec.min) * i) / 160;
      return [sx, state.f(sx)];
    }).filter(([, y]) => y !== null && Number.isFinite(y));
  const ys = samples.map(([, y]) => y),
    low = Math.min(0, ...ys),
    high = Math.max(1, ...ys),
    padding = (high - low) * 0.12;
  const px = (v) => 54 + ((v - spec.min) / (spec.max - spec.min)) * 560,
    py = (v) => 316 - ((v - low + padding) / (high - low + 2 * padding)) * 270;
  const path = samples
    .map(([sx, sy], i) => `${i ? "L" : "M"}${px(sx)},${py(sy)}`)
    .join(" ");
  const slope = code === "1-1" ? state.value : state.derivative(x);
  const change = (value) => {
    setPlaying(false);
    setX(Number(value));
  };
  return (
    <section className="unit-diagram" aria-label={spec.label}>
      <div className="unit-section-heading">
        <h3>{spec.label}</h3>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
        >
          {playing ? "إيقاف الحركة" : "تحريك النقطة"}
        </button>
      </div>
      <p dir="ltr" className="unit-formula">
        {spec.formula}
      </p>
      <svg
        viewBox="0 0 660 360"
        role="img"
        aria-label={`${spec.label}؛ س=${fmt(x)}، القيمة=${fmt(state.value)}`}
        dir="ltr"
      >
        <defs>
          <pattern
            id={id + "grid"}
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path d="M40 0H0V40" fill="none" stroke="#dce8df" />
          </pattern>
          <clipPath id={id + "clip"}>
            <rect x="42" y="20" width="584" height="312" />
          </clipPath>
        </defs>
        <rect x="42" y="20" width="584" height="312" fill={`url(#${id}grid)`} />
        <g clipPath={`url(#${id}clip)`}>
          <path d={`M42 ${py(0)}H626 M${px(0)} 20V332`} stroke="#82988b" />
          <path d={path} fill="none" stroke="#215a46" strokeWidth="3" />
          {slope !== null && state.y !== null && (
            <line
              x1={px(spec.min)}
              y1={py(state.y + slope * (spec.min - x))}
              x2={px(spec.max)}
              y2={py(state.y + slope * (spec.max - x))}
              stroke="#e4a036"
              strokeWidth="2.5"
            />
          )}
          {code === "1-5" && slope !== 0 && (
            <line
              x1={px(spec.min)}
              y1={py(state.y - (spec.min - x) / slope)}
              x2={px(spec.max)}
              y2={py(state.y - (spec.max - x) / slope)}
              stroke="#16733e"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}
          {code === "1-1" && (
            <>
              <path
                d={`M${px(x)} ${py(state.y)}H${px(second)}V${py(state.f(second))}`}
                fill="none"
                stroke="#718c7b"
                strokeDasharray="5 5"
              />
              <circle
                cx={px(second)}
                cy={py(state.f(second))}
                r="7"
                fill="#e4a036"
                stroke="white"
                strokeWidth="2"
              />
            </>
          )}
          {state.y !== null && (
            <circle
              cx={px(x)}
              cy={py(state.y)}
              r="8"
              fill="#22a866"
              stroke="white"
              strokeWidth="3"
            />
          )}
        </g>
        <text x="620" y="351">
          س
        </text>
        <text x="24" y="24">
          ص
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text
            key={t}
            x={px(spec.min + t * (spec.max - spec.min))}
            y="350"
            textAnchor="middle"
            fontSize="12"
          >
            {fmt(spec.min + t * (spec.max - spec.min))}
          </text>
        ))}
      </svg>
      <div className="unit-slider-grid">
        <label>
          {" "}
          {code === "1-4" ? "هـ" : "س"} = {fmt(x)}
          <input
            aria-label={code === "1-4" ? "قيمة هـ" : "إحداثي س"}
            type="range"
            min={spec.min}
            max={spec.max}
            step="0.01"
            value={x}
            onChange={(e) => change(e.target.value)}
          />
        </label>
        {code === "1-1" && (
          <label>
            س₂ = {fmt(second)}
            <input
              aria-label="إحداثي س الثاني"
              type="range"
              min={spec.min}
              max={spec.max}
              step=".01"
              value={second}
              onChange={(e) => {
                setPlaying(false);
                setSecond(Number(e.target.value));
              }}
            />
          </label>
        )}
      </div>
      <output
        className="unit-diagram-result"
        aria-live={playing ? "off" : "polite"}
      >
        {code === "1-1"
          ? "متوسط التغير"
          : code === "1-4"
            ? "جا هـ / هـ"
            : "ميل المماس"}{" "}
        = {fmt(state.value)}
      </output>
      {code === "1-4" && (
        <p>
          تقترب النسبة من ١ عندما تقترب هـ من صفر. عند صفر، الكسر نفسه غير
          معرّف؛ المعروض هو سلوك النهاية.
        </p>
      )}
      {code === "1-6" && (
        <p>
          الداخل ع = س² + ١؛ مشتقته ٢س. الخارج ع³؛ مشتقته ٣ع². نضرب المشتقتين.
        </p>
      )}
      {code === "1-7" && (
        <p>
          نعرض الفرع العلوي للعلاقة. ميله (٤−٢س)/(٢ص+١)، عندما يكون المقام غير
          صفر.
        </p>
      )}
    </section>
  );
}
