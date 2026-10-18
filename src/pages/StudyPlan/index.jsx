import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import { emptyVarkAnswers, varkQuestions, VARK_LABELS, VARK_VERSION } from "../../../shared/varkQuestionnaire";
import SavedPlans from "./SavedPlans";

export default function StudyPlan() {
  const { auth } = useAuth();
  const [answers, setAnswers] = useState(emptyVarkAnswers);
  const [cursor, setCursor] = useState(0);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [reload, setReload] = useState(0);
  const heading = useRef(null);
  const token = auth.token;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest("/study-plan/assessment", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ assessment: saved }) => {
        if (cancelled) return;
        if (saved && saved.version !== VARK_VERSION) throw new Error("نسخة الاستبيان المحفوظة مختلفة. تواصل مع الدعم قبل المتابعة.");
        setAssessment(saved);
        setAnswers(saved?.answers || emptyVarkAnswers());
        setCursor(saved?.cursor || 0);
        setLoading(false);
      }).catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [token, reload]);

  async function save(nextCursor, complete = false) {
    if (saving) return;
    setSaving(true);
    setError("");
    setSavedNotice("");
    try {
      const { assessment: saved } = await apiRequest("/study-plan/assessment", {
        method: "PUT", headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ version: VARK_VERSION, answers, cursor: nextCursor, complete })
      });
      setAssessment(saved);
      setCursor(nextCursor);
      setSavedNotice("تم حفظ إجاباتك. تقدر ترجع وتكمل لاحقًا.");
      if (complete) setEditing(false);
      heading.current?.focus();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const question = varkQuestions[cursor];
  const answered = answers.filter((choices) => choices.length).length;
  const finished = assessment?.completedAt && !editing;
  const toggle = (id) => {
    setSavedNotice("");
    setAnswers((previous) => previous.map((choices, i) => i !== cursor ? choices : choices.includes(id) ? choices.filter((c) => c !== id) : [...choices, id]));
  };

  return (
    <div className="app-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="studyPlan" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar searchPlaceholder="ابحث في موادك..." showNotificationDot mobileCompact />
          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8" dir="rtl">
            <div className="mx-auto max-w-3xl">
              <h1 className="font-display text-4xl font-semibold sm:text-5xl">الخطة الدراسية</h1>
              <p className="mt-2 text-ink-muted">{finished ? "رتّب أيامك، وحدد وقتك والمواد والدروس المناسبة إلك." : "الخطوة الأولى: نتعرّف على تفضيلاتك في التعلّم."}</p>
              {error && <div role="alert" className="mt-5 rounded-md border border-error/30 bg-error-tint p-4 text-error">{error}</div>}
              {loading ? (
                <div className="mt-6" role="status">
                  {error ? <Button onClick={() => setReload((v) => v + 1)}>إعادة المحاولة</Button> : "جاري تحميل الاستبيان…"}
                </div>
              ) : finished ? (
                <>
                <details className="mt-5 rounded-lg border border-border bg-surface-raised p-4">
                  <summary className="cursor-pointer font-semibold text-primary">نتيجة استبيان التعلّم — عرض ومراجعة</summary>
                <div className="mt-4">
                  <CheckCircle2 className="text-accent" size={32} />
                  <h2 ref={heading} tabIndex={-1} className="mt-3 font-display text-3xl font-semibold">تم حفظ إجاباتك</h2>
                  <p className="mt-2 text-ink-muted">هذه درجاتك حسب جدول الاستبيان. قد تفضّل أكثر من طريقة، ولا توجد إجابات صحيحة أو خاطئة.</p>
                  <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(VARK_LABELS).map(([key, label]) => (
                      <div key={key} className="rounded-lg border border-border bg-surface-alt p-4 text-center">
                        <dt className="text-sm text-ink-muted">{label} ({key})</dt>
                        <dd className="mt-2 text-3xl font-semibold text-primary">{assessment.scores[key]}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-5 text-sm text-ink-muted">أجبت عن {answered} من {varkQuestions.length} سؤالًا. تفضيلاتك قابلة للتغيير، والنتيجة ليست تقييمًا لقدراتك.</p>
                  <Button variant="outline" className="mt-6" onClick={() => { setEditing(true); setCursor(0); }}>مراجعة إجاباتي</Button>
                </div>
                </details>
                <SavedPlans token={token} />
                </>
              ) : (
                <Card padding="lg" className="mt-6">
                  <h2 className="font-display text-2xl font-semibold">استبيان فارك — كيف أتعلم بشكل أفضل</h2>
                  <p className="mt-2 text-sm leading-7 text-ink-muted">اختر الإجابة التي تشرح اختيارك الأفضل. يمكنك اختيار أكثر من إجابة، واترك السؤال الذي لا ينطبق عليك دون إجابة.</p>
                  <p className="mt-3 text-xs text-ink-faint">تُحفظ اختياراتك عند الانتقال بين الأسئلة أو الضغط على حفظ والمتابعة لاحقًا.</p>
                  <div className="mt-6 flex justify-between text-sm text-ink-muted">
                    <span>السؤال {cursor + 1} من {varkQuestions.length}</span>
                    <span>أجبت عن {answered}</span>
                  </div>
                  <div role="progressbar" aria-label="التقدّم في الاستبيان" aria-valuemin={0} aria-valuemax={16} aria-valuenow={cursor + 1} className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt">
                    <div className="h-full bg-primary transition-all" style={{ width: `${(cursor + 1) / 16 * 100}%` }} />
                  </div>
                  <fieldset disabled={saving} className="mt-7">
                    <legend ref={heading} tabIndex={-1} className="mb-5 text-xl font-semibold leading-9">{question.text}</legend>
                    <div className="space-y-3">
                      {question.options.map((option) => (
                        <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${answers[cursor].includes(option.id) ? "border-primary bg-primary-tint" : "border-border bg-surface-raised hover:bg-surface-alt"}`}>
                          <input type="checkbox" className="mt-1.5 h-4 w-4 shrink-0 accent-primary" checked={answers[cursor].includes(option.id)} onChange={() => toggle(option.id)} />
                          <span className="leading-7">{option.text}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                    <Button variant="outline" disabled={saving || cursor === 0} onClick={() => save(cursor - 1)}><ArrowRight size={16} /> السابق</Button>
                    <Button disabled={saving} onClick={() => save(cursor === 15 ? cursor : cursor + 1, cursor === 15)}>
                      {saving ? "جاري الحفظ…" : cursor === 15 ? "إنهاء الاستبيان وحفظ النتيجة" : answers[cursor].length ? "التالي" : "تخطي السؤال"}<ArrowLeft size={16} />
                    </Button>
                  </div>
                  <Button variant="ghost" className="mt-3" disabled={saving} onClick={() => save(cursor)}>حفظ والمتابعة لاحقًا</Button>
                  {savedNotice && <p role="status" className="mt-2 text-sm text-accent">{savedNotice}</p>}
                </Card>
              )}
              <p className="mt-5 text-xs text-ink-faint">VARK © VARK Learn Limited — الأسئلة وجدول الدرجات من نسخة الاستبيان العربية المرفقة.</p>
            </div>
          </main>
          <Footer brand />
        </div>
      </div>
    </div>
  );
}
