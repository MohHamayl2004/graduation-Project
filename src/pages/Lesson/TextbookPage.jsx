import { useEffect, useId, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { lesson11Questions } from './content/lesson11Questions';
import QuestionSolutions from './QuestionSolutions';

export default function TextbookPage({ book, pdfPage, active = true, portrait = false, activeQuestion = null, onSelectQuestion, onCloseQuestion }) {
  const questions = lesson11Questions.filter(question => question.pdfPage === pdfPage);
  const [selected, setSelected] = useState(questions[0]?.id);
  const [mode, setMode] = useState(null), [zoom, setZoom] = useState(1);
  const opener = useRef(null), frame = useRef(null), selectId = useId();
  const question = questions.find(item => item.id === selected);
  useEffect(() => { if (!active) setMode(null); }, [active]);
  useEffect(() => { if (zoom === 1 && frame.current) { frame.current.scrollTop = 0; frame.current.scrollLeft = 0; } }, [zoom]);
  const choose = (id, next, target) => {
    const item = questions.find(q => q.id === id);
    if (!item) return;
    opener.current = target;
    if (onSelectQuestion) onSelectQuestion(item, next, target);
    else setMode(next);
  };
  const close = () => {
    if (onCloseQuestion) onCloseQuestion();
    else { setMode(null); opener.current?.focus(); }
  };
  const localQuestion = activeQuestion ? activeQuestion.question : question;
  const localMode = activeQuestion ? activeQuestion.mode : mode;
  return <div className="leaf-textbook">
    <div className="leaf-textbook-tools"><a className="leaf-original-link" href={`${import.meta.env.BASE_URL}${book.pdf}#page=${pdfPage}`} target="_blank" rel="noreferrer">الصفحة الأصلية ↗</a><div className="leaf-textbook-zoom" aria-label="تكبير صفحة الكتاب"><button type="button" aria-label="تصغير صفحة الكتاب" disabled={zoom === 1} onClick={() => setZoom(value => Math.max(1, value - 0.25))}><Minus size={14} /></button><output dir="ltr">{Math.round(zoom * 100)}%</output><button type="button" aria-label="تكبير صفحة الكتاب" disabled={zoom === 2.5} onClick={() => setZoom(value => Math.min(2.5, value + 0.25))}><Plus size={14} /></button></div></div>
    <div ref={frame} className={`leaf-textbook-frame${zoom > 1 ? ' is-zoomed' : ''}`} tabIndex={0} role="region" aria-label="صفحة الكتاب؛ يمكن التمرير عند التكبير" dir="ltr"><img draggable="false" style={{ width: `${zoom * 100}%` }} src={`${import.meta.env.BASE_URL}books/lesson-1-1/page-${pdfPage + 3}.webp`} alt={`صفحة الكتاب الأصلية ${pdfPage + 3}، درس متوسط التغير`} /></div>
    {question && <div className="leaf-question-picker"><label htmlFor={selectId}>أسئلة الصفحة <small>({questions.length.toLocaleString('ar')})</small></label><div><select id={selectId} aria-label={`اختر سؤالًا من صفحة ${pdfPage + 3}`} value={selected} onChange={event => { const nextId = event.target.value; setSelected(nextId); choose(nextId, 'hint', event.currentTarget); }}>{questions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="button" onClick={event => choose(selected, 'hint', event.currentTarget)} aria-label={`تلميح: ${question.label}`}>تلميح</button><button className="leaf-question-solve" type="button" onClick={event => choose(selected, 'solution', event.currentTarget)} aria-label={`الحل: ${question.label}`}>الحل</button></div></div>}
    {(portrait || !onSelectQuestion) && localMode && active && localQuestion && <QuestionSolutions key={`${localQuestion.id}-${localMode}-${activeQuestion?.seq || 0}`} question={localQuestion} initialMode={localMode} onClose={close} />}
  </div>;
}
