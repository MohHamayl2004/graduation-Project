import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { saveQuizResult } from "../../services/progressService";
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, RotateCcw, XCircle } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import MathText from "./MathText";

// A pen circle around a choice letter, the way a student circles it on paper.
function PenCircle({ tone }) {
  return <svg className={`qz-circle qz-circle-${tone}`} viewBox="0 0 60 60" aria-hidden="true">
    <path pathLength="1" d="M31 5c13 0 24 9 24 24 0 15-12 26-26 26C14 55 5 44 5 30 5 16 16 6 30 6c3 0 6 1 8 2" />
  </svg>;
}

function Choice({ choice, state, onPick, disabled }) {
  // state: idle | picked | right | wrong | answer (the right one, shown after a wrong pick)
  const ring = state === "picked" ? "primary" : state === "right" || state === "answer" ? "right" : state === "wrong" ? "wrong" : null;
  return <button type="button" onClick={onPick} disabled={disabled} aria-pressed={state === "picked"}
    className={`qz-choice qz-choice-${state}`}>
    <span className="qz-letter">{choice.key}{ring && <PenCircle tone={ring} />}</span>
    <MathText className="qz-choice-text">{choice.text}</MathText>
    {state === "right" && <CheckCircle2 size={20} className="qz-mark text-accent" />}
    {state === "wrong" && <XCircle size={20} className="qz-mark text-error" />}
  </button>;
}

function Solution({ question, open }) {
  if (!open) return null;
  return <div className="qz-solution">
    <p className="qz-solution-title"><Lightbulb size={16} />الحل</p>
    <ol>{question.solution.map((step) => <li key={step}><MathText>{step}</MathText></li>)}</ol>
  </div>;
}

function Summary({ quiz, results, onRestart, onReview, saved }) {
  const right = quiz.questions.filter((q) => results[q.id]?.correct).length;
  const share = right / quiz.questions.length;
  return <Card padding="lg" className="qz-summary">
    <div className="qz-score" style={{ "--share": share }}><strong>{right}</strong><span>من {quiz.questions.length}</span></div>
    <div>
      <h2 className="font-display text-2xl font-semibold text-ink">{share === 1 ? "ممتاز! كل إجاباتك صحيحة" : share >= 0.7 ? "شغل حلو، راجع الأخطاء" : "محتاج تراجع متوسط التغير"}</h2>
      <p className="mt-2 text-sm leading-7 text-ink-muted">اضغط على أي سؤال لترجع له وتشوف الحل.</p>
      {saved === "saved" && <p className="mt-1 text-sm font-semibold text-accent">حُفظت علامتك، وبتلاقيها بصفحة التقدم.</p>}
      {saved === "failed" && <p className="mt-1 text-sm text-error">ما قدرنا نحفظ العلامة هلأ؛ تأكد من الاتصال وأعد الاختبار.</p>}
      <div className="qz-review">{quiz.questions.map((q, i) => <button key={q.id} type="button" onClick={() => onReview(i)} className={results[q.id]?.correct ? "is-right" : "is-wrong"}>
        {results[q.id]?.correct ? <CheckCircle2 size={15} /> : <XCircle size={15} />}السؤال {i + 1}
      </button>)}</div>
      <Button className="mt-4" onClick={onRestart}><RotateCcw size={16} />أعد الاختبار</Button>
    </div>
  </Card>;
}

// One question at a time: circle an answer, check it, and see the solution when it is wrong.
export default function QuizPlayer({ quiz }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState({}); // id -> key, before checking
  const [results, setResults] = useState({}); // id -> { key, correct }, first check only
  const [showSolution, setShowSolution] = useState({});
  const [done, setDone] = useState(false);
  const { auth } = useAuth() || {};
  const [saved, setSaved] = useState(null);
  const sent = useRef(false);
  // Once every question has its first answer, send them: the API grades and keeps the result.
  useEffect(() => {
    if (sent.current || !auth?.token || Object.keys(results).length < quiz.questions.length) return;
    sent.current = true;
    saveQuizResult(auth.token, quiz.id, Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.key])))
      .then(() => setSaved("saved")).catch(() => setSaved("failed"));
  }, [results, auth?.token, quiz]);
  const q = quiz.questions[index];
  const result = results[q.id];
  const total = quiz.questions.length;
  const answered = Object.keys(results).length;
  const check = () => {
    const key = picked[q.id]; if (!key || result) return;
    const correct = key === q.answer;
    setResults((r) => ({ ...r, [q.id]: { key, correct } }));
    if (!correct) setShowSolution((s) => ({ ...s, [q.id]: true }));
  };
  const next = () => (index === total - 1 ? setDone(true) : setIndex(index + 1));
  const restart = () => { setIndex(0); setPicked({}); setResults({}); setShowSolution({}); setDone(false); setSaved(null); sent.current = false; };
  const stateOf = (key) => {
    if (!result) return picked[q.id] === key ? "picked" : "idle";
    if (key === result.key) return result.correct ? "right" : "wrong";
    return key === q.answer ? "answer" : "idle";
  };
  if (done) return <Summary quiz={quiz} results={results} saved={saved} onRestart={restart} onReview={(i) => { setIndex(i); setDone(false); }} />;
  return <>
    <Card padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-ink-muted">{quiz.subject} · {quiz.title}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">السؤال {index + 1} من {total}</h1>
        </div>
        <div className="text-end">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-tint px-3 py-1 text-sm font-semibold text-accent">{answered} / {total} أُجيب</span>
          <div className="mt-3 flex items-center justify-end gap-1.5" aria-label="تقدّم الأسئلة">
            {quiz.questions.map((item, i) => { const r = results[item.id];
              return <button key={item.id} type="button" onClick={() => setIndex(i)} aria-label={`السؤال ${i + 1}`} aria-current={i === index ? "step" : undefined}
                className={`qz-dot ${i === index ? "is-current" : r ? (r.correct ? "is-right" : "is-wrong") : ""}`} />; })}
          </div>
        </div>
      </div>
    </Card>

    <div className="mt-4 flex flex-wrap gap-2 text-sm">
      <span className="rounded-md border border-border bg-surface-alt px-3 py-1 text-ink-muted">{quiz.kind}</span>
      <span className="rounded-md border border-border bg-surface-alt px-3 py-1 text-ink-muted">{q.tag}</span>
    </div>

    <Card padding="lg" className="mt-4">
      <h2 className="qz-stem"><MathText>{q.stem}</MathText></h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="الخيارات">
        {q.choices.map((c) => <Choice key={c.key} choice={c} state={stateOf(c.key)} disabled={Boolean(result)} onPick={() => setPicked((p) => ({ ...p, [q.id]: c.key }))} />)}
      </div>
      {result && <div className={`qz-feedback ${result.correct ? "is-right" : "is-wrong"}`} role="status">
        {result.correct ? <><CheckCircle2 size={18} />إجابة صحيحة!</> : <><XCircle size={18} />إجابتك ({result.key}) غلط. الإجابة الصحيحة ({q.answer})، وهذا الحل:</>}
        {result.correct && !showSolution[q.id] && <button type="button" className="qz-link" onClick={() => setShowSolution((s) => ({ ...s, [q.id]: true }))}>اعرض الحل</button>}
      </div>}
      <Solution question={q} open={result && showSolution[q.id]} />
    </Card>

    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-40">
        <ArrowRight size={16} />السابق
      </button>
      {result
        ? <Button onClick={next}>{index === total - 1 ? "اعرض النتيجة" : "السؤال التالي"}<ArrowLeft size={16} /></Button>
        : <Button onClick={check} disabled={!picked[q.id]}>تحقّق من إجابتك</Button>}
    </div>
    <p className="mt-6 text-xs leading-6 text-ink-muted">{quiz.source}</p>
  </>;
}
