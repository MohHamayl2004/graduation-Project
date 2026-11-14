import { useId, useRef } from 'react';
import { exampleFunction, rateOfChange } from '../../../shared/lessonBook';
const X = x => 48 + (x + 2.4) / 4.8 * 544;
const Y = y => 330 - (y + 4) / 14 * 292;
const curve = Array.from({ length: 161 }, (_, i) => { const x = -2.2 + i * 4.4 / 160; return `${i ? 'L' : 'M'}${X(x)},${Y(exampleFunction(x))}`; }).join(' ');

export function pointAfterKey(value, key) {
  if (key === 'Home') return -2;
  if (key === 'End') return 2;
  const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[key];
  return step ? Math.max(-2, Math.min(2, Math.round((value * 10 + step)) / 10)) : null;
}

export default function DiscoveryGraph({ points, onChange, triangle }) {
  const svg = useRef(null), dragging = useRef(null);
  const id = useId(), gridId = `discovery-grid-${id}`, clipId = `discovery-clip-${id}`;
  const values = rateOfChange(...points);
  const move = event => {
    if (dragging.current === null) return;
    const matrix = svg.current.getScreenCTM();
    if (!matrix) return;
    const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    onChange(dragging.current, Math.max(-2, Math.min(2, Math.round(((position.x - 48) / 544 * 4.8 - 2.4) * 10) / 10)));
  };
  return <svg ref={svg} className="discovery-graph" viewBox="0 0 640 370" dir="ltr" aria-label="منحنى الاقتران والقاطع. اسحب النقطتين أو استخدم الأسهم على النقطة المحددة أو منزلقات س أسفل الرسم" onPointerMove={move} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }} onLostPointerCapture={() => { dragging.current = null; }}>
    <defs><pattern id={gridId} width="56.67" height="41.71" patternUnits="userSpaceOnUse" x={X(0)} y={Y(0)}><path d="M 56.67 0 L 0 0 0 41.71" fill="none" stroke="#e6ebe7" strokeWidth="1" /></pattern><clipPath id={clipId}><rect x="30" y="20" width="580" height="320" /></clipPath></defs>
    <rect x="30" y="20" width="580" height="320" fill={`url(#${gridId})`} />
    <path d={`M30 ${Y(0)}H610 M${X(0)} 20V340`} stroke="#a0ada5" fill="none" />
    {[-2, -1, 1, 2].map(x => <text key={x} x={X(x)} y={Y(0) + 20} textAnchor="middle">{x}</text>)}
    {[2, 4, 6, 8].map(y => <text key={y} x={X(0) - 13} y={Y(y) + 4} textAnchor="end">{y}</text>)}
    <text x="612" y={Y(0) - 10}>س</text><text x={X(0) + 12} y="24">ص</text>
    <g clipPath={`url(#${clipId})`}>
      <path d={curve} stroke="#215a46" strokeWidth="3" fill="none" />
      {triangle && <path d={`M${X(points[0])} ${Y(values.y1)}H${X(points[1])}V${Y(values.y2)}Z`} fill="#22c96b10" stroke="#729281" strokeWidth="1.5" strokeDasharray="5 5" />}
      <line x1={X(points[0])} y1={Y(values.y1)} x2={X(points[1])} y2={Y(values.y2)} stroke="#22b968" strokeWidth="3" />
    </g>
    {points.map((x, i) => <g key={i} className="discovery-point" role="slider" tabIndex={0} aria-label={`إحداثي س للنقطة ${i ? 'ب' : 'أ'}`} aria-valuemin={-2} aria-valuemax={2} aria-valuenow={x} aria-valuetext={`${x.toLocaleString('ar')}، ق(س) = ${Number(exampleFunction(x).toFixed(2)).toLocaleString('ar')}`} onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const next = pointAfterKey(x, event.key);
      if (next === null) return;
      event.preventDefault(); event.stopPropagation(); onChange(i, next);
    }} onPointerDown={event => { event.preventDefault(); dragging.current = i; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); }}>
      <circle cx={X(x)} cy={Y(exampleFunction(x))} r="22" fill="transparent" />
      <circle cx={X(x)} cy={Y(exampleFunction(x))} r="8" fill={i ? '#1d2923' : '#22b968'} stroke="white" strokeWidth="3" />
      <text x={X(x)} y={Y(exampleFunction(x)) - 20} textAnchor="middle">{i ? 'B' : 'A'}</text>
    </g>)}
  </svg>;
}

