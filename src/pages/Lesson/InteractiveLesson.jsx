import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, BookOpen, RotateCcw, Sparkles, Check, MoveHorizontal } from 'lucide-react';
import StudentBadge from '../../components/common/StudentBadge';
import { useAuth } from '../../context/AuthContext';
import { exampleFunction, rateOfChange, evaluateBookAnswer, bookTutorQuestion } from '../../../shared/lessonBook';
import { getBookProgress, saveBookAttempt } from '../../services/lessonBookService';
import './interactive-lesson.css';

const steps = ['استكشف', 'اكتشف العلاقة', 'اختبر فهمك'];
const fmt = value => value === null ? 'غير معرّف' : Number(value.toFixed(2)).toLocaleString('ar');
const X = x => 48 + (x + 2.4) / 4.8 * 544;
const Y = y => 330 - (y + 4) / 14 * 292;
const curve = Array.from({ length: 161 }, (_, i) => { const x = -2.2 + i * 4.4 / 160; return `${i ? 'L' : 'M'}${X(x)},${Y(exampleFunction(x))}`; }).join(' ');

export function DiscoveryGraph({ points, onChange, triangle }) {
  const svg = useRef(null), dragging = useRef(null);
  const values = rateOfChange(...points);
  const move = event => {
    if (dragging.current === null) return;
    const matrix = svg.current.getScreenCTM();
    if (!matrix) return;
    const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    onChange(dragging.current, Math.max(-2, Math.min(2, Math.round(((position.x - 48) / 544 * 4.8 - 2.4) * 10) / 10)));
  };
  return <svg ref={svg} className="discovery-graph" viewBox="0 0 640 370" dir="ltr" aria-label="منحنى الاقتران والقاطع. اسحب النقطتين أو استخدم منزلقات س أسفل الرسم" onPointerMove={move} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}>
    <defs><pattern id="discovery-grid" width="56.67" height="41.71" patternUnits="userSpaceOnUse" x={X(0)} y={Y(0)}><path d="M 56.67 0 L 0 0 0 41.71" fill="none" stroke="#e6ebe7" strokeWidth="1" /></pattern><clipPath id="discovery-clip"><rect x="30" y="20" width="580" height="320" /></clipPath></defs>
    <rect x="30" y="20" width="580" height="320" fill="url(#discovery-grid)" />
    <path d={`M30 ${Y(0)}H610 M${X(0)} 20V340`} stroke="#a0ada5" fill="none" />
    {[-2, -1, 1, 2].map(x => <text key={x} x={X(x)} y={Y(0) + 20} textAnchor="middle">{x}</text>)}
    {[2, 4, 6, 8].map(y => <text key={y} x={X(0) - 13} y={Y(y) + 4} textAnchor="end">{y}</text>)}
    <text x="612" y={Y(0) - 10}>س</text><text x={X(0) + 12} y="24">ص</text>
    <g clipPath="url(#discovery-clip)">
      <path d={curve} stroke="#215a46" strokeWidth="3" fill="none" />
      {triangle && <path d={`M${X(points[0])} ${Y(values.y1)}H${X(points[1])}V${Y(values.y2)}Z`} fill="#22c96b10" stroke="#729281" strokeWidth="1.5" strokeDasharray="5 5" />}
      <line x1={X(points[0])} y1={Y(values.y1)} x2={X(points[1])} y2={Y(values.y2)} stroke="#22b968" strokeWidth="3" />
    </g>
    {points.map((x, i) => <g key={i} className="discovery-point" onPointerDown={event => { event.preventDefault(); dragging.current = i; event.currentTarget.setPointerCapture(event.pointerId); }}>
      <circle cx={X(x)} cy={Y(exampleFunction(x))} r="22" fill="transparent" />
      <circle cx={X(x)} cy={Y(exampleFunction(x))} r="8" fill={i ? '#1d2923' : '#22b968'} stroke="white" strokeWidth="3" />
      <text x={X(x)} y={Y(exampleFunction(x)) - 20} textAnchor="middle">{i ? 'B' : 'A'}</text>
    </g>)}
  </svg>;
}

export default function InteractiveLesson({ book }) {
  const { auth } = useAuth(), navigate = useNavigate();
  const [step, setStep] = useState(0), [points, setPoints] = useState([-1, 2]);
  const [prediction, setPrediction] = useState(null), [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null), [hint, setHint] = useState(false);
  const [complete, setComplete] = useState(false), [save, setSave] = useState('loading');
  const active = useRef(true), changed = useRef(false), queue = useRef(Promise.resolve());
  const values = rateOfChange(...points);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    getBookProgress(auth.token, book.id, controller.signal).then(({ progress }) => {
      if (active.current && !changed.current) { setComplete(Boolean(progress?.completedActivities?.includes('example-1-rate'))); setSave('ready'); }
    }).catch(error => { if (active.current && error.name !== 'AbortError') setSave('error'); });
    return () => { active.current = false; controller.abort(); };
  }, [auth.token, book.id]);
  const change = (index, value) => setPoints(current => current.map((x, i) => i === index ? value : x));
  const submit = event => {
    event.preventDefault();
    const correct = evaluateBookAnswer(book.id, 'example-1-rate', answer);
    setFeedback(correct === null ? 'invalid' : correct ? 'correct' : 'incorrect');
    if (correct === null) return;
    changed.current = true;
    setSave('saving');
    queue.current = queue.current.catch(() => {}).then(() => saveBookAttempt(auth.token, book.id, 'example-1-rate', answer)).then(({ progress }) => {
      if (active.current) { setComplete(Boolean(progress.completedActivities?.includes('example-1-rate'))); setSave('saved'); }
    }).catch(() => { if (active.current) setSave('error'); });
  };
  return <div className="discovery-screen" dir="rtl">
    <header className="discovery-header"><Link to="/lectures?subject=math" className="discovery-back"><ArrowRight size={18} /> الرياضيات</Link><span className="discovery-brand">نِبراس <small>مساحة التعلّم</small></span><StudentBadge /></header>
    <main className="discovery-main">
      <div className="discovery-title"><div><p className="discovery-eyebrow">الوحدة الأولى / الدرس ١–١</p><h1>التغيّر له معنى.</h1><p>متوسط التغير <span>·</span> من حركة نقطتين إلى فكرة رياضية.</p></div><a className="discovery-reference" href={`${import.meta.env.BASE_URL}${book.pdf}#page=1`} target="_blank" rel="noreferrer"><BookOpen size={17} /> الكتاب الأصلي <span>↗</span></a></div>
      <nav className="discovery-steps" aria-label="مراحل الدرس">{steps.map((label, i) => <button key={label} onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined}><span>{i === 2 && complete ? <Check size={16} /> : i + 1}</span>{label}</button>)}</nav>
      <section className="discovery-workspace" aria-label="مختبر متوسط التغير">
        <div className="discovery-instructions" key={step}>
          <span className="discovery-kicker">{['٠١ / حرّك ولاحظ', '٠٢ / اربط الفكرة', '٠٣ / دورك الآن'][step]}</span>
          <h2>{['ماذا يحدث بين نقطتين؟', 'الميل يحكي قصة التغيّر.', 'حوّل ملاحظتك إلى حلّ.'][step]}</h2>
          <p>{['حرّك النقطتين على المنحنى. راقب كيف يتغيّر الخط الواصل بينهما: هذا هو القاطع.', 'المسافة الأفقية هي التغير في س، والمسافة الرأسية هي التغير في ص. نسبة التغيرين تساوي ميل القاطع.', 'عد إلى مثال الكتاب: تتغير س من −١ إلى ٢. احسب متوسط التغير باستخدام قيم الاقتران عند الطرفين.'][step]}</p>
          <div className="discovery-equation" dir="ltr">ق(س) = س³ − ٥س + ٣</div>
          {step === 0 && <div className="discovery-prompt"><h3>توقّع أولًا</h3><p>من س = −١ إلى س = ٢، هل متوسط التغير موجب أم سالب؟</p><div className="discovery-choices">{['موجب', 'سالب'].map((label, i) => <button key={label} aria-pressed={prediction === i} onClick={() => setPrediction(i)}>{label}</button>)}</div>{prediction !== null && <p role="status">{prediction === 1 ? 'صحيح! قيمة النهاية أقل من قيمة البداية، رغم أن المنحنى لا يتناقص طوال الفترة.' : 'انظر إلى الطرفين: ق(−١) = ٧ و ق(٢) = ١. التغير الكلي في ص سالب.'}</p>}</div>}
          {step === 1 && <div className="discovery-prompt"><h3>جرّب حالة مختلفة</h3><p>اجعل س₁ = س₂. لماذا لا يمكن حساب متوسط التغير؟</p><button className="discovery-soft" onClick={() => setPoints([1, 1])}>اجمع النقطتين</button><p className="discovery-insight">{values.dx === 0 ? 'Δس = ٠؛ القسمة على صفر غير معرّفة. نحتاج نقطتين بقيمتي س مختلفتين.' : 'متوسط التغير = Δص ÷ Δس، بشرط أن Δس ≠ ٠.'}</p></div>}
          {step === 2 && <form className="discovery-prompt" onSubmit={submit}><label htmlFor="discovery-answer">متوسط التغير في الفترة [−١، ٢] =</label><div className="discovery-answer"><input id="discovery-answer" dir="ltr" inputMode="decimal" autoComplete="off" placeholder="؟" value={answer} onChange={event => { setAnswer(event.target.value); setFeedback(null); }} /><button className="discovery-primary" type="submit">تحقّق <Check size={16} /></button></div><button className="discovery-hint" type="button" onClick={() => setHint(value => !value)} aria-expanded={hint}>أحتاج تلميحًا</button>{hint && <p>احسب ق(٢) و ق(−١)، ثم اقسم الفرق بينهما على ٢ − (−١).</p>}{feedback && <p className={`discovery-feedback ${feedback}`} role="status">{feedback === 'correct' ? 'أحسنت! (١ − ٧) ÷ (٢ − (−١)) = −٢.' : feedback === 'invalid' ? 'اكتب عددًا؛ يمكنك استخدام الأرقام العربية.' : 'راجع ترتيب الطرح: قيمة النهاية ناقص قيمة البداية في البسط والمقام.'}</p>}</form>}
          <button className="discovery-tutor" onClick={() => navigate('/ai-tutor', { state: { lessonQuestion: bookTutorQuestion(book.id, step === 1 ? 2 : 1) } })}><Sparkles size={17} /> اسأل نبراس عن هذه الفكرة <ArrowLeft size={15} /></button>
        </div>
        <div className="discovery-canvas"><div className="discovery-canvas-heading"><span><i /> مختبر القاطع</span><button onClick={() => setPoints([-1, 2])} aria-label="إعادة النقطتين إلى مثال الكتاب"><RotateCcw size={15} /> إعادة الضبط</button></div><DiscoveryGraph points={points} onChange={change} triangle={step > 0} /><p className="discovery-drag-note"><MoveHorizontal size={15} /> اسحب A و B على المنحنى، أو استخدم المنزلقين</p><div className="discovery-controls">{points.map((x, i) => <label key={i}><span><b>{i ? 'B' : 'A'}</b> س<sub>{i + 1}</sub><output dir="ltr">{fmt(x)}</output></span><input aria-label={`إحداثي س للنقطة ${i ? 'B' : 'A'}`} dir="ltr" type="range" min="-2" max="2" step="0.1" value={x} onChange={event => change(i, Number(event.target.value))} /></label>)}</div><div className="discovery-measurements" aria-live="polite"><div><span>التغير الأفقي · Δس</span><strong dir="ltr">{fmt(values.dx)}</strong></div><div><span>التغير الرأسي · Δص</span><strong dir="ltr">{fmt(values.dy)}</strong></div><div><span>متوسط التغير</span><strong dir="ltr">{step === 2 ? '؟' : fmt(values.rate)}</strong></div></div></div>
      </section>
      <footer className="discovery-footer"><div><span className="discovery-source">من الكتاب: مثال ١، ص ٤ · المعنى الهندسي، ص ٥</span><p role="status">{save === 'error' ? 'تعذّر الاتصال لحفظ التقدم. يمكنك المتابعة وإعادة التحقق لحفظ إجابتك.' : save === 'saving' ? 'جارٍ حفظ المحاولة…' : save === 'loading' ? 'جارٍ تحميل تقدمك…' : complete ? '✓ حُفظ إنجازك في هذا النشاط' : 'يُحفظ إنجاز النشاط عند التحقق من إجابتك.'}</p></div>{step < 2 ? <button className="discovery-primary" onClick={() => setStep(value => value + 1)}>{step === 0 ? 'اكتشف العلاقة' : 'جاهز للتحدّي'}<ArrowLeft size={17} /></button> : <button className="discovery-soft" onClick={() => setStep(0)}>استكشف من جديد <RotateCcw size={16} /></button>}</footer>
    </main>
  </div>;
}
