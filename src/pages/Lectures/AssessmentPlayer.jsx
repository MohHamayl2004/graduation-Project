import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTutorCompanion } from '../../companion/TutorCompanionContext';
import { apiRequest } from '../../services/api';
import { dueCheckpoint, persistAssessmentResult } from '../../companion/assessmentPlayback';
import { tryEnterFullscreen } from '../../../shared/fullscreen';
import './assessment-player.css';

export function AssessmentPlayer({ id, token }) {
  const [plan, setPlan] = useState(null), [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [retryOf, setRetryOf] = useState(null);
  const video = useRef(null), frame = useRef(null), dialog = useRef(null), pending = useRef(null);
  const activeQuestion = useRef(null), latestPlan = useRef(null);
  latestPlan.current = plan;
  const companion = useTutorCompanion();
  const path = '/lesson-videos/' + encodeURIComponent(id);
  const headers = { Authorization: 'Bearer ' + token };
  useEffect(() => {
    const controller = new AbortController();
    setPlan(null); setQuestion(null); setAnswer(''); setError(''); setBusy(false); activeQuestion.current = null;
    apiRequest(path, { headers:{ Authorization:'Bearer '+token }, signal:controller.signal }).then(data => { if (!controller.signal.aborted) setPlan(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => { controller.abort(); pending.current?.abort(); pending.current = null; };
  }, [path,token]);
  const result = plan?.results.find(r => r.questionId === question?.id);
  const recipient = companion?.assessmentAnswer;
  const interrupt = companion?.character.interrupt;
  useEffect(() => {
    if (!question || result || !recipient) return;
    recipient.current = text => setAnswer(text.slice(0,500));
    return () => { recipient.current = null; };
  }, [question,result,recipient]);
  useEffect(() => () => interrupt?.(), [interrupt]);
  useEffect(() => {
    if (!question) return;
    const modal = dialog.current, previousFocus = document.activeElement;
    modal.showModal();
    modal.querySelector('input,button')?.focus();
    return () => { modal.close(); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [question]);
  useEffect(() => { if (result) dialog.current?.querySelector('[data-resume]')?.focus(); }, [result]);
  useEffect(() => {
    const el = video.current;
    if (!el?.requestVideoFrameCallback) return;
    let handle;
    const tick = () => { advance(); handle = el.requestVideoFrameCallback(tick); };
    handle = el.requestVideoFrameCallback(tick);
    return () => el.cancelVideoFrameCallback(handle);
  }, [plan?.url]);
  function advance() {
    const el = video.current;
    if (!el || el.seeking || activeQuestion.current) return;
    const q = dueCheckpoint(latestPlan.current, el.currentTime, el.duration);
    if (!q) return;
    activeQuestion.current = q;
    el.pause();
    el.currentTime = q.at;
    if (el.webkitDisplayingFullscreen) el.webkitExitFullscreen?.();
    if (document.fullscreenElement === el) document.exitFullscreen?.().catch(() => {});
    interrupt?.();
    setAnswer(''); setError(''); setQuestion(q);
  }
  async function submit(skip) {
    if (pending.current || !question || result) return;
    if (!skip && (!answer.trim() || (question.kind === 'choice' && !question.options.includes(answer)))) return;
    const controller = new AbortController();
    pending.current = controller; setBusy(true); setError('');
    interrupt?.();
    try {
      const data = await apiRequest(path+'/questions/'+encodeURIComponent(question.id), {
        method:'PUT', headers, signal:controller.signal, body:JSON.stringify({ answer, skip, revision:plan.revision, ...(retryOf && { retryOf }) }),
      });
      if (!controller.signal.aborted) { setPlan(p => persistAssessmentResult(p, data.result)); setRetryOf(null); }
    } catch(e) { if (!controller.signal.aborted) setError(e.message); }
    finally { if (pending.current === controller) { pending.current=null; setBusy(false); } }
  }
  function resume() {
    if (!result) return;
    interrupt?.(); activeQuestion.current = null; setQuestion(null); setError('');
    void video.current.play().catch(() => setError('اضغط تشغيل للمتابعة.'));
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        await exit.call(document);
      } else if (!await tryEnterFullscreen(frame.current)) setError('تعذر فتح ملء الشاشة في هذا المتصفح.');
    } catch { setError('تعذر فتح ملء الشاشة في هذا المتصفح.'); }
  }
  return <main dir="rtl" className="assessment-player mx-auto max-w-4xl space-y-4 p-4 text-ink">
    <Link to="/lectures?subject=math">العودة إلى مكتبة الفيديو</Link>
    {error && !question && <p role="alert">{error}</p>}
    {plan ? <>
      <h1 className="text-2xl font-bold">{plan.title}</h1>
      <div ref={frame} className={`assessment-stage ${question ? 'has-question' : ''}`}>
      <video className="w-full rounded-xl bg-black" ref={video} controls={!question} controlsList="nofullscreen" playsInline tabIndex={0} aria-label={plan.title} src={import.meta.env.BASE_URL.replace(/\/$/,'') + plan.url}
        onTimeUpdate={advance} onPlay={() => { if (activeQuestion.current) video.current.pause(); else advance(); }}
        onSeeked={advance}>
        <track kind="captions" src={import.meta.env.BASE_URL.replace(/\/$/,'') + plan.captions} srcLang="ar" label="العربية" default />
      </video>
      <button className="assessment-fullscreen" type="button" onClick={fullscreen}>ملء الشاشة / إنهاء</button>
      {question && <dialog ref={dialog} dir="rtl" aria-labelledby="video-question" className="assessment-quiz"
        onCancel={event => { event.preventDefault(); if (result) resume(); }}>
        <section data-voice-question={question.prompt} className="space-y-3 p-5">
        <p className="assessment-eyebrow">توقف قصير للفهم · {Math.floor(question.at / 60)}:{String(Math.floor(question.at % 60)).padStart(2, '0')}</p>
        <h2 id="video-question" className="text-lg font-bold">{question.prompt}</h2>
        {error && <p role="alert">{error}</p>}
        {result ? <><p role="status">{result.status === 'skipped' ? 'تم تخطي السؤال.' : result.feedback}</p>
          <button data-resume type="button" className="assessment-primary" onClick={resume}>متابعة الفيديو</button>
          {result.updatedAt && <button type="button" onClick={() => {
            setRetryOf(result.updatedAt); setAnswer(''); setError('');
            setPlan(p=>({...p,results:p.results.filter(r=>r.questionId!==question.id)}));
          }}>حاول مرة أخرى</button>}</> :
        <form onSubmit={e => {e.preventDefault(); void submit(false);}} className="space-y-3">
          <fieldset disabled={busy} className="space-y-3"><legend className="sr-only">إجابتك</legend>
          {question.kind === 'choice' ? question.options.map(option => <label key={option} className="assessment-option"><input type="radio" name="video-answer" checked={answer===option} onChange={() => setAnswer(option)} /> {option}</label>) :
            <label className="block">إجابتك<input className="block w-full rounded-md border p-2" value={answer} maxLength={500} onChange={e=>setAnswer(e.target.value)} /></label>}
          </fieldset>
          {companion?.settings.microphone && <p>يمكنك الإجابة بالضغط على Alt الأيمن أو باستخدام ميكروفون المعلم.</p>}
          {question.kind === 'choice' && answer && !question.options.includes(answer) && <p>سمعت: {answer}. اختر الإجابة المطابقة.</p>}
          <div className="flex flex-wrap gap-4">
            <button className="rounded-md bg-primary px-4 py-2 text-white" disabled={busy || !answer.trim() || (question.kind==='choice' && !question.options.includes(answer))}>تحقق من الإجابة</button>
            <button type="button" disabled={busy} onClick={()=>submit(true)}>تخطي السؤال</button>
            {companion?.settings.voice && <button type="button" onClick={()=>companion.character.speakText(question.prompt, 'read aloud')}>استمع للسؤال</button>}
          </div>
        </form>}
        </section>
      </dialog>}
      </div>
    </> : !error && <p role="status">جارٍ تحميل الفيديو…</p>}
  </main>;
}

export default function LessonVideoPage() {
  const { id } = useParams(), { auth } = useAuth();
  return <AssessmentPlayer key={id+auth.user._id} id={id} token={auth.token} />;
}
