import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import MathText from "../AITutor/components/MathText";
import MathDiagram from "./MathDiagram";
import {
  getUnitLessons,
  getUnitLesson,
  getUnitProgress,
  saveUnitStep,
  submitUnitAnswer,
  getUnitAssessment,
  submitUnitAssessment,
} from "../../services/mathUnitService";
import "./math-unit.css";

function AnswerField({ activity, value, onChange, disabled }) {
  return activity.kind === "choice" ? (
    <fieldset disabled={disabled}>
      <legend className="sr-only">اختر الإجابة</legend>
      {activity.options.map((option, i) => (
        <label className="unit-option" key={i}>
          <input
            type="radio"
            name={activity.id}
            checked={value === String(i)}
            onChange={() => onChange(String(i))}
          />
          <MathText text={option} />
        </label>
      ))}
    </fieldset>
  ) : (
    <label className="unit-number">
      إجابتك (عدد أو كسر)
      <input
        required
        inputMode="text"
        autoComplete="off"
        maxLength={80}
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مثال: −٢ أو ٢/٣"
      />
    </label>
  );
}
function Exercise({ activity, code, token, onProgress }) {
  const [value, setValue] = useState(""),
    [result, setResult] = useState(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const r = await submitUnitAnswer(token, code, activity.id, value);
      if (active.current) {
        setResult(r);
        onProgress(r.progress);
      }
    } catch {
      if (active.current)
        setError(
          "تعذر التحقق والحفظ. اكتب عدداً أو كسراً صالحاً ثم حاول مجدداً.",
        );
    } finally {
      if (active.current) setPending(false);
    }
  };
  return (
    <form className="unit-exercise" data-voice-question={activity.prompt} onSubmit={submit}>
      <h3>
        <MathText text={activity.prompt} />
      </h3>
      <AnswerField
        activity={activity}
        value={value}
        disabled={pending}
        onChange={(v) => {
          setValue(v);
          setResult(null);
        }}
      />
      <button type="submit" disabled={pending || !value.trim()}>
        {pending ? "جارٍ التحقق والحفظ…" : "تحقق من إجابتي"}
      </button>
      {result && (
        <div
          className={result.correct ? "unit-feedback correct" : "unit-feedback"}
          role="status"
        >
          <strong>
            {result.correct
              ? "إجابة صحيحة وحُفظ إنجازك"
              : "راجع الخطوات ثم حاول مجدداً"}
          </strong>
          <p>
            <MathText text={result.explanation} />
          </p>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
function LessonView({ lesson, token }) {
  const [step, setStep] = useState(0),
    [progress, setProgress] = useState(null),
    [status, setStatus] = useState("loading"),
    [open, setOpen] = useState({});
  const active = useRef(true),
    changed = useRef(false),
    queue = useRef(Promise.resolve()),
    navigate = useNavigate();
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    getUnitProgress(token, lesson.code, controller.signal)
      .then((r) => {
        if (active.current && !changed.current) {
          setProgress(r.progress);
          setStep(
            Math.max(
              0,
              Math.min(lesson.examples.length + 2, r.progress?.lastPage ?? 0),
            ),
          );
          setStatus("ready");
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError" && active.current) setStatus("error");
      });
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [token, lesson]);
  const move = (page) => {
    changed.current = true;
    setStep(page);
    setStatus("saving");
    queue.current = queue.current
      .catch(() => {})
      .then(() => saveUnitStep(token, lesson.code, page))
      .then((r) => {
        if (active.current) {
          setProgress(r.progress);
          setStatus("saved");
        }
      })
      .catch(() => {
        if (active.current) setStatus("error");
      });
  };
  const total = lesson.examples.length + 3,
    isPractice = step === total - 1,
    example = lesson.examples[step - 2];
  return (
    <>
      <div className="unit-section-heading">
        <div>
          <p className="unit-eyebrow">
            الدرس {lesson.code} · صفحات المصدر {lesson.source.pages.join("–")}
          </p>
          <h1>{lesson.title}</h1>
        </div>
        <button
          onClick={() =>
            navigate("/ai-tutor", {
              state: {
                lessonQuestion: `اشرح لي ${lesson.title} من الوحدة الأولى، وبيّن حدود الإجابة إن لم تتوفر لديك مراجع الكتاب.`,
              },
            })
          }
        >
          اسأل المعلم
        </button>
      </div>
      <nav className="unit-tabs" aria-label="أقسام الدرس">
        {[
          "المفاهيم",
          "استكشف",
          ...lesson.examples.map((e) => e.title),
          "اختبر فهمك",
        ].map((label, i) => (
          <button
            key={i}
            aria-current={step === i ? "step" : undefined}
            onClick={() => move(i)}
          >
            {label}
          </button>
        ))}
      </nav>
      <p role="status" className="unit-save">
        {status === "loading"
          ? "جارٍ استعادة تقدمك…"
          : status === "saving"
            ? "جارٍ الحفظ…"
            : status === "error"
              ? "تعذر حفظ أو استعادة التقدم. تحقق من الاتصال وأعد المحاولة."
              : `إنجاز محفوظ: ${progress?.completedActivities?.length || 0} / ${lesson.activities.length}`}
        {status === "error" && (
          <button onClick={() => move(step)}>إعادة الحفظ</button>
        )}
      </p>
      {step === 0 && (
        <section className="unit-content">
          <h2>المفاهيم والقواعد</h2>
          {lesson.definitions.map((d, i) => (
            <article key={i}>
              <h3>{d.title}</h3>
              {d.body.map((p, j) => (
                <p key={j}>
                  <MathText text={p} />
                </p>
              ))}
              {d.formula && (
                <p className="unit-rule">
                  <MathText text={d.formula} />
                </p>
              )}
            </article>
          ))}
        </section>
      )}
      {step === 1 && <MathDiagram key={lesson.code} code={lesson.code} />}
      {example && (
        <section className="unit-content" data-voice-question={example.statement || example.steps[0]?.math}>
          <h2>{example.title}</h2>
          {example.statement && (
            <p>
              <MathText text={example.statement} />
            </p>
          )}
          {example.steps.map((s, i) => (
            <div className="unit-worked-step" key={s.id || i}>
              <button
                aria-expanded={Boolean(open[`${step}:${i}`])}
                onClick={() =>
                  setOpen((o) => ({
                    ...o,
                    [`${step}:${i}`]: !o[`${step}:${i}`],
                  }))
                }
              >
                الخطوة {(i + 1).toLocaleString("ar")} ·{" "}
                {open[`${step}:${i}`] ? "إخفاء" : "إظهار الشرح"}
              </button>
              {open[`${step}:${i}`] && (
                <p>
                  <MathText text={s.math} />
                </p>
              )}
            </div>
          ))}
        </section>
      )}
      {isPractice && (
        <section className="unit-content">
          <h2>اختبر فهمك</h2>
          <p>تُصحح الإجابات على الخادم، وتُحفظ المحاولات في حسابك.</p>
          {lesson.activities.map((a) => (
            <Exercise
              key={a.id}
              activity={a}
              code={lesson.code}
              token={token}
              onProgress={(p) => {
                changed.current = true;
                setProgress(p);
              }}
            />
          ))}
        </section>
      )}
      <footer className="unit-section-heading">
        <button disabled={step === 0} onClick={() => move(step - 1)}>
          السابق
        </button>
        <span>
          {(step + 1).toLocaleString("ar")} / {total.toLocaleString("ar")}
        </span>
        {step < total - 1 ? (
          <button onClick={() => move(step + 1)}>التالي</button>
        ) : (
          <Link to="/math-unit/assessment">التقييم الشامل</Link>
        )}
      </footer>
      {lesson.code === "1-1" && (
        <Link className="unit-book-link" to="/lesson-book/1-1">
          فتح الكتاب التفاعلي الأصلي لمتوسط التغير
        </Link>
      )}
      {lesson.video && (
        <section className="unit-content">
          <h2>شرح مرئي قصير</h2>
          <video controls preload="metadata" playsInline src={lesson.video.url}>
            <track
              kind="captions"
              src={lesson.video.captions}
              srcLang="ar"
              label="العربية"
              default
            />
          </video>
          <p>{lesson.video.description}</p>
        </section>
      )}
    </>
  );
}
function Assessment({ token }) {
  const [items, setItems] = useState(null),
    [answers, setAnswers] = useState({}),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    const c = new AbortController();
    getUnitAssessment(token, c.signal)
      .then((r) => {
        if (active.current) {
          setItems(r.items);
          if (r.result) {
            setResult(r.result);
            setAnswers(
              Object.fromEntries(
                r.result.results.map((a) => [a.lessonId, a.answer]),
              ),
            );
          }
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError" && active.current)
          setError("تعذر تحميل التقييم.");
      });
    return () => {
      active.current = false;
      c.abort();
    };
  }, [token]);
  const submit = async (e) => {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const r = await submitUnitAssessment(
        token,
        items.map((a) => ({
          lessonId: a.lessonId,
          activityId: a.id,
          answer: answers[a.lessonId] || "",
        })),
      );
      if (active.current) setResult(r);
    } catch {
      if (active.current)
        setError("تعذر حفظ التقييم. تحقق من إجاباتك والاتصال ثم حاول مجدداً.");
    } finally {
      if (active.current) setPending(false);
    }
  };
  return (
    <>
      <h1>التقييم الشامل للوحدة الأولى</h1>
      <p>
        سؤال من كل درس. أجب عن جميع الأسئلة قبل التصحيح؛ تُحفظ النتيجة
        والمحاولات في حسابك.
      </p>
      {!items && !error && <p role="status">جارٍ التحميل…</p>}
      {items && (
        <form onSubmit={submit}>
          {items.map((a) => (
            <section className="unit-exercise" key={a.lessonId}>
              <p className="unit-eyebrow">{a.title}</p>
              <h2>
                <MathText text={a.prompt} />
              </h2>
              <AnswerField
                activity={a}
                value={answers[a.lessonId]}
                disabled={pending}
                onChange={(v) => {
                  setAnswers((s) => ({ ...s, [a.lessonId]: v }));
                  setResult(null);
                }}
              />
            </section>
          ))}
          <button disabled={pending || items.some((a) => !answers[a.lessonId])}>
            {pending ? "جارٍ التصحيح والحفظ…" : "تصحيح التقييم وحفظ النتيجة"}
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {result && (
        <section className="unit-content" role="status">
          <h2>
            نتيجتك {result.score} / {result.total} ({result.percentage}٪)
          </h2>
          {result.results.map((r) => (
            <p key={r.lessonId}>
              <strong>
                {r.lessonId}: {r.correct ? "صحيح" : "راجع الدرس"}
              </strong>{" "}
              · <MathText text={r.explanation} />
            </p>
          ))}
          <Link to="/math-unit">مراجعة الدروس</Link>
        </section>
      )}
    </>
  );
}
export default function MathUnit() {
  const { code } = useParams(),
    { auth } = useAuth(),
    [catalog, setCatalog] = useState(null),
    [lesson, setLesson] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    setLesson(null);
    setError("");
    getUnitLessons(auth.token, c.signal)
      .then((r) => setCatalog(r.lessons))
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "تعذر تحميل الوحدة. أعد تحميل الصفحة بعد التحقق من الاتصال.",
          );
      });
    if (code && code !== "assessment")
      getUnitLesson(auth.token, code, c.signal)
        .then((r) => setLesson(r.lesson))
        .catch((e) => {
          if (e.name !== "AbortError") setError("تعذر تحميل الدرس.");
        });
    return () => c.abort();
  }, [code, auth.token]);
  return (
    <div className="math-unit-screen" dir="rtl">
      <header className="unit-top">
        <Link to="/lectures?subject=math">الرياضيات</Link>
        <Link to="/math-unit" className="unit-brand">
          نِبراس · الوحدة الأولى
        </Link>
        <Link to="/ai-tutor">المعلم الذكي</Link>
      </header>
      <main className="math-unit-main">
        {error && <p role="alert">{error}</p>}
        {!code ? (
          <>
            <p className="unit-eyebrow">الرياضيات · التفاضل</p>
            <h1>تعلّم، استكشف، ثم اختبر فهمك</h1>
            <p>
              دروس الوحدة الأولى من محتوى المنهج، مع رسوم تفاعلية وأمثلة محلولة
              وتقدم محفوظ.
            </p>
            <div className="unit-lesson-grid">
              {catalog?.map((l) => (
                <Link
                  className="unit-lesson-card"
                  to={`/math-unit/${l.code}`}
                  key={l.code}
                >
                  <span>الدرس {l.code}</span>
                  <h2>{l.title}</h2>
                  <progress
                    max={l.activityCount}
                    value={l.completedActivities.length}
                    aria-label={`إنجاز ${l.title}`}
                  />
                  <p>
                    {l.completedActivities.length} / {l.activityCount} أنشطة
                    مكتملة
                  </p>
                </Link>
              ))}
            </div>
            <Link className="unit-assessment-link" to="/math-unit/assessment">
              ابدأ التقييم الشامل للوحدة
            </Link>
          </>
        ) : code === "assessment" ? (
          <Assessment token={auth.token} />
        ) : lesson ? (
          <LessonView key={code} lesson={lesson} token={auth.token} />
        ) : (
          !error && <p role="status">جارٍ تحميل الدرس…</p>
        )}
      </main>
    </div>
  );
}
