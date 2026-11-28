import { useState } from 'react';
import { exampleFunction, rateOfChange, evaluateBookAnswer } from '../../../shared/lessonBook.js';

const W = 480, H = 260, pad = 32;
const sx = x => pad + (x + 2) / 4 * (W - 2 * pad);
const sy = y => H - pad - (y + 3) / 12 * (H - 2 * pad);
const format = value => value === null ? 'غير معرّف' : Number(value.toFixed(2)).toLocaleString('ar');

export default function SecantActivity({ onAttempt, onAsk, completed, showExercise = true }) {
  const [x1, setX1] = useState(-1), [x2, setX2] = useState(2);
  const [answer, setAnswer] = useState(''), [result, setResult] = useState(null), [hint, setHint] = useState(false);
  const resultForPoints = rateOfChange(x1, x2);
  const path = Array.from({ length: 81 }, (_, index) => {
    const x = -2 + index * 0.05;
    return `${index ? 'L' : 'M'}${sx(x).toFixed(2)},${sy(exampleFunction(x)).toFixed(2)}`;
  }).join(' ');
  const submit = event => {
    event.preventDefault();
    const checked = evaluateBookAnswer('1-1', 'example-1-rate', answer);
    if (checked === null) { setResult('invalid'); return; }
    setResult(checked ? 'correct' : 'incorrect');
    onAttempt(answer);
  };
  return <section className="book-activity" aria-labelledby="secant-title">
    <div className="book-activity-heading"><div><p>{showExercise ? 'مثال ١ · صفحة ٤' : 'المعنى الهندسي · صفحة ٥'}</p><h2 id="secant-title">جرّب متوسط التغير</h2></div>{showExercise && completed && <span>أُنجز النشاط</span>}</div>
    <p>نستخدم اقتران مثال ١ في صفحة ٤: ق(س) = س³ − ٥س + ٣. حرّك النقطتين لتشاهد ميل القاطع.</p>
    <div className="book-graph" dir="ltr"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="منحنى الاقتران والقاطع بين النقطتين المحددتين">
      <line x1={pad} x2={W - pad} y1={sy(0)} y2={sy(0)} className="book-axis" /><line x1={sx(0)} x2={sx(0)} y1={pad} y2={H - pad} className="book-axis" />
      <path d={path} className="book-curve" />
      <line x1={sx(x1)} y1={sy(resultForPoints.y1)} x2={sx(x2)} y2={sy(resultForPoints.y2)} className="book-secant" />
      <circle cx={sx(x1)} cy={sy(resultForPoints.y1)} r="5" /><circle cx={sx(x2)} cy={sy(resultForPoints.y2)} r="5" />
      {[-2, -1, 0, 1, 2].map(x => <text key={x} x={sx(x)} y={sy(0) + 17} textAnchor="middle">{x}</text>)}
    </svg></div>
    <div className="book-sliders">
      <label>س₁ = {format(x1)}<input type="range" min="-2" max="2" step="0.5" value={x1} onChange={event => setX1(Number(event.target.value))} /></label>
      <label>س₂ = {format(x2)}<input type="range" min="-2" max="2" step="0.5" value={x2} onChange={event => setX2(Number(event.target.value))} /></label>
    </div>
    <p className="book-result" aria-live="polite">Δس = {format(resultForPoints.dx)} ، Δص = {format(resultForPoints.dy)} ، متوسط التغير = {format(resultForPoints.rate)}</p>
    {showExercise && <form onSubmit={submit} className="book-question">
      <label htmlFor="book-rate-answer">إذا كان ق(س) = س³ − ٥س + ٣، فما متوسط التغير عندما تتغير س من −١ إلى ٢؟</label>
      <div><input id="book-rate-answer" value={answer} onChange={event => { setAnswer(event.target.value); setResult(null); }} inputMode="decimal" autoComplete="off" placeholder="اكتب الإجابة" /><button type="submit">تحقق</button><button type="button" className="secondary" onClick={() => setHint(open => !open)}>تلميح</button></div>
      {hint && <p>احسب ق(٢) − ق(−١)، ثم اقسم الناتج على ٢ − (−١).</p>}
      {result && <p role="status">{result === 'invalid' ? 'أدخل عددًا، مثل −١.' : result === 'correct' ? 'إجابة صحيحة: −٦ ÷ ٣ = −٢.' : 'حاول مرة أخرى: احسب التغير في الاقتران ثم اقسمه على التغير في س.'}</p>}
    </form>}
    <button type="button" className="book-ask" onClick={onAsk}>{showExercise ? 'اسأل نبراس عن هذا المثال' : 'اسأل نبراس عن القاطع'}</button>
  </section>;
}
