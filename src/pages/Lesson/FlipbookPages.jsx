import { useEffect, useRef, useState } from 'react';
import DiscoveryGraph from './DiscoveryGraph';
import { rateOfChange, evaluateBookAnswer } from '../../../shared/lessonBook';
import page4 from './content/math_page008.json';
import TextbookPage from './TextbookPage';
import QuestionSolutions from './QuestionSolutions';

const fmt = value => value === null ? 'غير معرّف' : Number(value.toFixed(2)).toLocaleString('ar');
const sourceFunction = page4.blocks.find(block => block.topic_title === 'examples[0].function').text.replace('^٣', '³');
const meanings = [
  ['Δس', 'التغير في س', 'س₂ − س₁', 'نطرح قيمة البداية من قيمة النهاية: ٢ − (−١) = ٣.'],
  ['Δص', 'التغير في الاقتران', 'ق(س₂) − ق(س₁)', 'من مثال الكتاب: ق(−١) = ٧، ق(٢) = ١. إذن التغير ١ − ٧ = −٦.'],
  ['Δص / Δس', 'متوسط التغير', '(ق(س₂) − ق(س₁)) / (س₂ − س₁)', 'لكل وحدة تغير في س، يتغير ص في المتوسط بمقدار −٢. يجب أن س₁ ≠ س₂.'],
];

function Meaning() {
  const [selected, setSelected] = useState(0);
  return <><p className="leaf-overline">نتأمل تعريف الكتاب · ص ٤</p><h2>التغيّر… خطوة بخطوة</h2><p>نقيس الفرق بين البداية والنهاية، ثم نربط التغيرين. المس كل جزء من العلاقة لتكتشف معناه.</p><div className="leaf-formula-tabs">{meanings.map(([symbol, name], i) => <button key={name} aria-pressed={selected === i} onClick={() => setSelected(i)}><b dir="ltr">{symbol}</b><span>{name}</span></button>)}</div><div className="leaf-reveal" key={selected}><span className="leaf-step">{selected + 1} / 3</span><h3>{meanings[selected][1]}</h3><p className="leaf-equation" dir="ltr">{meanings[selected][2]}</p><p>{meanings[selected][3]}</p></div><p className="leaf-note">نطبّق التعريف على مثال ١ نفسه، دون تغيير اقتران الكتاب.</p><p className="leaf-equation" dir="ltr">{sourceFunction}</p></>;
}

function Graph() {
  const [points, setPoints] = useState([-1, 2]), [triangle, setTriangle] = useState(false);
  const values = rateOfChange(...points);
  return <><p className="leaf-overline">المعنى الهندسي · ص ٥</p><h2>القاطع بين نقطتين</h2><p>حرّك أ أو ب لتكتشف ميل القاطع.</p><p className="leaf-equation compact" dir="ltr">{sourceFunction}</p><DiscoveryGraph points={points} onChange={(i, x) => setPoints(current => current.map((p, j) => i === j ? x : p))} triangle={triangle} /><div className="leaf-sliders">{points.map((x, i) => <label key={i}>س<sub>{i + 1}</sub> = <bdi>{fmt(x)}</bdi><input aria-label={`إحداثي س للنقطة ${i ? 'ب' : 'أ'}`} dir="ltr" type="range" min="-2" max="2" step="0.1" value={x} onChange={event => setPoints(current => current.map((p, j) => i === j ? Number(event.target.value) : p))} /></label>)}</div><div className="leaf-values" aria-live="polite"><span>Δس <bdi>{fmt(values.dx)}</bdi></span><span>Δص <bdi>{fmt(values.dy)}</bdi></span><span>الميل <bdi>{fmt(values.rate)}</bdi></span></div><div className="leaf-actions"><button aria-pressed={triangle} onClick={() => setTriangle(!triangle)}> {triangle ? 'إخفاء' : 'إظهار'} مثلث التغير</button><button onClick={() => setPoints([-1, 2])}>مثال الكتاب</button></div>{values.rate === null && <p role="status" className="leaf-note">النقطتان لهما قيمة س نفسها؛ لا تجوز القسمة على صفر.</p>}</>;
}

function Exercise({ onAttempt, completed }) {
  const [part, setPart] = useState(0), [input, setInput] = useState(''), [feedback, setFeedback] = useState(''), [hint, setHint] = useState(false);
  const questions = ['ما التغير في س من −١ إلى ٢؟', 'إذا كان ق(−١) = ٧ و ق(٢) = ١، فما التغير في ص؟', 'ما متوسط التغير في الفترة من −١ إلى ٢؟'];
  const hints = ['اطرح قيمة البداية من النهاية: ٢ − (−١).', 'احسب قيمة النهاية ناقص قيمة البداية: ١ − ٧.', 'اقسم التغير في ص على التغير في س.'];
  const expected = [3, -6, -2];
  const submit = event => {
    event.preventDefault();
    const normalized = input.trim().replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[−–]/g, '-').replace('٫', '.');
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) { setFeedback('اكتب إجابة عددية، بالأرقام العربية أو الإنجليزية.'); return; }
    const correct = part === 2 ? evaluateBookAnswer('1-1', 'example-1-rate', input) : Number(normalized) === expected[part];
    if (part === 2) onAttempt(input);
    if (!correct) { setFeedback(`لنراجعها معًا: ${hints[part]}`); return; }
    setFeedback(part === 2 ? 'أحسنت! متوسط التغير = −٦ ÷ ٣ = −٢.' : 'صحيح. انتقل إلى الخطوة التالية.');
  };
  return <><p className="leaf-overline">عودة إلى مثال ١ · ص ٤</p><h2>أنت تكمل الحلّ</h2><p className="leaf-equation" dir="ltr">{sourceFunction}</p><div className="leaf-exercise-steps">{questions.map((_, i) => <button key={i} onClick={() => { setPart(i); setInput(''); setFeedback(''); setHint(false); }} aria-current={part === i ? 'step' : undefined}>{['١ · Δس', '٢ · Δص', '٣ · المتوسط'][i]}</button>)}</div><form onSubmit={submit}><label htmlFor="leaf-answer">{questions[part]}</label><div className="leaf-answer"><input id="leaf-answer" dir="ltr" value={input} onChange={event => { setInput(event.target.value); setFeedback(''); }} inputMode="decimal" autoComplete="off" placeholder="الإجابة" /><button className="leaf-primary" type="submit">تحقّق</button></div><button type="button" className="leaf-text-button" onClick={() => setHint(!hint)} aria-expanded={hint}>أحتاج تلميحًا</button>{hint && <p className="leaf-note">{hints[part]}</p>}<p role="status" className="leaf-feedback">{feedback}</p></form>{part < 2 && feedback.startsWith('صحيح') && <button className="leaf-primary" onClick={() => { setPart(part + 1); setInput(''); setFeedback(''); setHint(false); }}>الخطوة التالية ←</button>}{completed && <p className="leaf-complete">✓ أُنجز هذا المثال وحُفظ في حسابك.</p>}<p className="leaf-note">تعتمد الإجابة النهائية على مثال الكتاب الأصلي؛ يُتحقق منها أيضًا على الخادم.</p></>;
}

function Connection() {
  const [h, setH] = useState(3);
  const values = rateOfChange(-1, -1 + h);
  return <><p className="leaf-overline">نربط الصيغتين · تعريف ص ٤</p><h2>الفترة نفسها، برمز جديد</h2><p>يرمز الكتاب للتغير في س بالرمز هـ. إذا بدأنا عند س₁ فإن س₂ = س₁ + هـ.</p><p className="leaf-equation" dir="ltr">هـ = س₂ − س₁</p><p>نثبّت البداية عند −١ في اقتران مثال ١. غيّر هـ لترى أين تصبح النهاية.</p><label className="leaf-h">هـ = <bdi>{fmt(h)}</bdi><input aria-label="التغير هـ" type="range" min="0" max="3" step="0.5" value={h} onChange={event => setH(Number(event.target.value))} /></label><div className="leaf-reveal" key={h}><p>س₂ = <bdi>{fmt(-1 + h)}</bdi></p><p className="leaf-equation" dir="ltr">(ق(س₁ + هـ) − ق(س₁)) / هـ</p><p>متوسط التغير = <bdi>{fmt(values.rate)}</bdi></p></div><p className="leaf-note">{h === 0 ? 'عندما هـ = ٠ يصبح المقام صفرًا، ولذلك لا يُعرّف متوسط التغير هنا.' : 'هذه هي صيغة التعريف في الكتاب؛ تغير الرمز ولم يتغير المعنى.'}</p></>;
}

export default function FlipbookPage({ leaf, index, book, onAttempt, completed, onAsk, onGo, active = true, portrait = false, activeQuestion = null, onSelectQuestion, onCloseQuestion }) {
  const bodyRef = useRef(null);
  const showQuestion = Boolean(activeQuestion && active);
  useEffect(() => {
    if (showQuestion && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [showQuestion, activeQuestion]);
  return <div className={`leaf-paper ${leaf.kind === 'original' ? 'leaf-original' : leaf.kind === 'graph' ? 'leaf-graph' : ''}`} dir="rtl">
    <header className="leaf-running"><span>نِبراس / الرياضيات</span><span>متوسط التغير</span></header>
    <div className="leaf-body" ref={bodyRef}>
      {leaf.kind === 'original' ? <TextbookPage book={book} pdfPage={leaf.pdfPage} active={active} portrait={portrait} activeQuestion={activeQuestion} onSelectQuestion={onSelectQuestion} onCloseQuestion={onCloseQuestion} />
        : <>
          {showQuestion && <QuestionSolutions key={`${activeQuestion.question.id}-${activeQuestion.mode}-${activeQuestion.seq}`} question={activeQuestion.question} initialMode={activeQuestion.mode} onClose={onCloseQuestion} />}
          <div className="leaf-interactive-content" hidden={showQuestion ? true : undefined}>
            {leaf.kind === 'meaning' ? <Meaning />
              : leaf.kind === 'graph' ? <Graph />
                : leaf.kind === 'exercise' ? <Exercise onAttempt={onAttempt} completed={completed} />
                  : leaf.kind === 'connection' ? <Connection />
                    : <><p className="leaf-overline">قبل أن تغلق الكتاب</p><h2>ما الذي تغيّر في فهمك؟</h2><p>متوسط التغير يقارن قيمتي الاقتران عند طرفي الفترة، ويمثل ميل القاطع الواصل بينهما.</p><p className="leaf-equation" dir="ltr">متوسط التغير = Δص / Δس</p><p>في مثال ١، كان التغير في س يساوي ٣ والتغير في ص يساوي −٦، فكان متوسط التغير −٢.</p><div className="leaf-review-links"><button onClick={() => onGo(0)}>ارجع إلى مثال الكتاب · ص ٤</button><button onClick={() => onGo(3)}>جرّب القاطع مرة أخرى</button><button onClick={() => onGo(5)}>أكمل حل المثال</button></div><p className="leaf-complete">{completed ? '✓ حُفظ إنجازك لمثال ١.' : 'تحقق من إجابة المثال لحفظ إنجازك.'}</p></>}
          </div>
        </>}
    </div>
    <footer className="leaf-footer"><span>{leaf.label}</span><span>{(index + 1).toLocaleString('ar')}</span>{leaf.kind !== 'original' && <button onClick={() => onAsk(leaf.kind === 'graph' ? 2 : 1)}>اسأل نبراس</button>}</footer>
  </div>;
}
