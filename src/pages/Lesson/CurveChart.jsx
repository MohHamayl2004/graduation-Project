import { useMemo, useState } from "react";

// The textbook's own curve, traced from the printed figure.
// Dragging the two handles shows the secant whose slope IS the
// average rate of change — the one thing a static picture of this
// graph cannot show a student.
export default function CurveChart({ curve }) {
  const [a, setA] = useState(1);
  const [b, setB] = useState(3);

  const W = 460, H = 300, PAD = { t: 16, r: 16, b: 40, l: 44 };
  const xs = curve.points.map((p) => p[0]);
  const ys = curve.points.map((p) => p[1]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = 0, yMax = Math.ceil(Math.max(...ys));

  const sx = (x) => PAD.l + ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r);
  const sy = (y) => H - PAD.b - ((y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);

  const path = useMemo(
    () => curve.points.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" "),
    [curve.points]
  );

  const valueAt = (x) => {
    const pts = curve.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
    return pts[pts.length - 1][1];
  };

  const ya = valueAt(a), yb = valueAt(b);
  const dx = b - a;
  const dy = yb - ya;
  const rate = dx === 0 ? null : dy / dx;

  const ticksX = [1, 2, 3, 4, 5, 6, 7];
  const ticksY = Array.from({ length: yMax + 1 }, (_, i) => i);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[380px]" role="img"
             aria-label={`${curve.caption} — متوسط التغير من ${a} إلى ${b} يساوي ${rate?.toFixed(2)}`}>
          {ticksY.map((t) => (
            <line key={`gy${t}`} x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)}
                  stroke="#E2E5EE" strokeWidth="1" />
          ))}
          {ticksX.map((t) => (
            <line key={`gx${t}`} y1={PAD.t} y2={H - PAD.b} x1={sx(t)} x2={sx(t)}
                  stroke="#E2E5EE" strokeWidth="1" />
          ))}

          <line x1={PAD.l} x2={W - PAD.r} y1={sy(0)} y2={sy(0)} stroke="#5B6478" strokeWidth="1.5" />
          <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="#5B6478" strokeWidth="1.5" />

          {ticksX.map((t) => (
            <text key={`tx${t}`} x={sx(t)} y={H - PAD.b + 17} textAnchor="middle"
                  fontSize="11" fill="#5B6478">{t}</text>
          ))}
          {ticksY.map((t) => (
            <text key={`ty${t}`} x={PAD.l - 8} y={sy(t) + 4} textAnchor="end"
                  fontSize="11" fill="#5B6478">{t}</text>
          ))}

          <path d={path} fill="none" stroke="#152A63" strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round" />

          {/* the secant — its slope is the answer */}
          <line x1={sx(a)} y1={sy(ya)} x2={sx(b)} y2={sy(yb)}
                stroke="#1E7A3C" strokeWidth="2" strokeDasharray="5 4" />
          <line x1={sx(a)} y1={sy(ya)} x2={sx(b)} y2={sy(ya)} stroke="#B45309" strokeWidth="1.5" />
          <line x1={sx(b)} y1={sy(ya)} x2={sx(b)} y2={sy(yb)} stroke="#B45309" strokeWidth="1.5" />
          <text x={(sx(a) + sx(b)) / 2} y={sy(ya) + 15} textAnchor="middle"
                fontSize="11" fill="#B45309">Δس = {dx.toFixed(1)}</text>
          <text x={sx(b) + 6} y={(sy(ya) + sy(yb)) / 2} fontSize="11" fill="#B45309">
            Δص = {dy.toFixed(1)}
          </text>

          <circle cx={sx(a)} cy={sy(ya)} r="5" fill="#1E7A3C" />
          <circle cx={sx(b)} cy={sy(yb)} r="5" fill="#1E7A3C" />
          <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize="11" fill="#6B7280">{curve.xLabel}</text>
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-ink-muted">
          البداية: <span className="font-semibold text-ink">س = {a.toFixed(1)}</span>
          <input type="range" min={xMin} max={xMax} step="0.5" value={a}
                 onChange={(e) => setA(Math.min(Number(e.target.value), b - 0.5))}
                 className="mt-1 w-full accent-accent" />
        </label>
        <label className="text-sm text-ink-muted">
          النهاية: <span className="font-semibold text-ink">س = {b.toFixed(1)}</span>
          <input type="range" min={xMin} max={xMax} step="0.5" value={b}
                 onChange={(e) => setB(Math.max(Number(e.target.value), a + 0.5))}
                 className="mt-1 w-full accent-accent" />
        </label>
      </div>

      <div className="mt-4 rounded-md bg-accent-tint px-4 py-3 text-center">
        <span className="text-sm text-ink-muted">متوسط التغير = </span>
        <span className="font-semibold text-ink">Δص / Δس = {dy.toFixed(1)} / {dx.toFixed(1)} = </span>
        <span className="text-lg font-semibold text-accent">{rate?.toFixed(2)}</span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        المنحنى مستخرَج من رسم الكتاب نفسه، ومطابَق على القيمتين اللتين يذكرهما الكتاب:
        ق(١) = ٢ و ق(٣) = ٥ . حرّك النقطتين وراقب كيف يتغير الميل.
      </p>
    </div>
  );
}
