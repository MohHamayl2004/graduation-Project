import { useEffect, useId, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export function SolutionFormula({ math }) {
  return <div className="solution-math" dir="ltr" dangerouslySetInnerHTML={{ __html: katex.renderToString(math, { displayMode: true, throwOnError: false, trust: false, strict: 'ignore' }) }} />;
}

// This panel only reads local lesson data. Opening it never submits an attempt.
export default function QuestionSolutions({ question, initialMode = 'solution', onClose }) {
  const [solution, setSolution] = useState(initialMode === 'solution');
  const [revealed, setRevealed] = useState(1);
  const title = useId(), panel = useRef(null), scroll = useRef(null);
  useEffect(() => { panel.current?.focus(); }, []);
  useEffect(() => {
    if (revealed > 1 && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [revealed]);
  return <section ref={panel} className="leaf-solution" role="dialog" aria-modal="false" aria-labelledby={title} tabIndex={-1} data-question-id={question.id} onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
  }}>
    <header className="solution-heading"><div><span>صفحة {question.printedPage.toLocaleString('ar')} · {solution ? 'الحل خطوة بخطوة' : 'تلميح'}</span><h3 id={title}>{question.label}</h3></div><button type="button" aria-label="إخفاء الحل" onClick={onClose}>×</button></header>
    <div className="solution-scroll" ref={scroll}>
      <p className="solution-prompt">{question.prompt}</p>
      <p className="solution-notation">نستخدم x للدلالة على س، و f(x) للدلالة على ق(س).</p>
      {solution ? <><ol className="solution-steps">{question.steps.slice(0, revealed).map((step, index) => <li key={index}><span className="solution-step-number">{(index + 1).toLocaleString('ar')}</span><div><p>{step.text}</p>{step.math && <SolutionFormula math={step.math} />}</div></li>)}</ol>{revealed === question.steps.length && question.answer && <div className="solution-answer"><span>النتيجة</span><SolutionFormula math={question.answer} /></div>}</> : <div className="solution-hint"><span>فكّر أولًا</span><p>{question.hint}</p></div>}
    </div>
    <footer className="solution-controls"><span aria-live="polite">{solution ? `${revealed.toLocaleString('ar')} / ${question.steps.length.toLocaleString('ar')}` : 'دون كشف الإجابة'}</span>{!solution ? <button className="leaf-primary" type="button" onClick={() => setSolution(true)}>الحل</button> : revealed < question.steps.length ? <button className="leaf-primary" type="button" onClick={() => setRevealed(value => value + 1)}>الخطوة التالية</button> : <span className="solution-finished">اكتمل الشرح</span>}<button type="button" onClick={onClose}>إخفاء الحل</button></footer>
  </section>;
}
