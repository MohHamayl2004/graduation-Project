import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BookOpen, ClipboardCheck, Clock3, Target, Sparkles, Award, CalendarDays } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { getProgressOverview } from "../../services/progressService";
import "./progress.css";

const metrics = [
  ["معدل الإنجاز العام", Target, "لا يوجد مقياس مكتمل بعد"],
  ["الدروس المكتملة", BookOpen, "تتبع إكمال الدروس غير متاح بعد"],
  ["الاختبارات المكتملة", ClipboardCheck, "تتبع الاختبارات المقيّمة غير متاح بعد"],
  ["وقت الدراسة", Clock3, "تتبع وقت الدراسة غير متاح بعد"]
];

export function ProgressContent({ data, loading, error, days, onDaysChange, onRetry }) {
  const plan = data?.plan;
  return <div className="progress-content" dir="rtl">
    <header className="progress-heading"><div><h1><span className="progress-heading-icon"><Activity size={24} /></span>متابعة التقدم</h1><p>نظرة شاملة على إنجازك في التعلّم والخطة الدراسية.</p></div>
      <label className="progress-period">الفترة <select value={days} onChange={(e) => onDaysChange(Number(e.target.value))} aria-label="الفترة الزمنية"><option value={7}>آخر 7 أيام</option><option value={30}>آخر 30 يومًا</option><option value={90}>آخر 90 يومًا</option></select></label>
    </header>
    {loading ? <div className="progress-state" role="status" aria-busy="true">جارٍ تحميل بيانات التقدم…</div> : error ? <div className="progress-state" role="alert"><p>تعذّر تحميل بيانات التقدم: {error}</p><button type="button" onClick={onRetry}>إعادة المحاولة</button></div> : <>
      <section className="progress-metrics" aria-label="ملخص التقدم">{metrics.map(([label, Icon, explanation]) => <article className="progress-card progress-metric" key={label}><span className="progress-icon"><Icon size={21} /></span><h2>{label}</h2><strong>غير متاح</strong><p>{explanation}</p></article>)}</section>
      <div className="progress-columns">
        <section className="progress-card progress-panel"><h2>التقدم حسب المادة</h2><div className="progress-empty"><BookOpen size={25} /><p>لا تتوفر سجلات إكمال موثوقة للمواد بعد.</p></div></section>
        <section className="progress-card progress-panel"><h2>التقدم عبر الوقت</h2><div className="progress-empty"><Activity size={25} /><p>سيظهر نشاطك هنا عند توفر سجل إنجاز موثوق.</p></div></section>
        <section className="progress-card progress-panel"><h2>الخطة الدراسية</h2>{plan ? <div className="progress-plan"><span className="progress-icon"><CalendarDays size={21} /></span><h3>{plan.type === "daily" ? "خطة يومية" : "خطة أسبوعية"} · <bdi>{plan.periodStart}</bdi></h3><p>{plan.scheduledSessions === null ? "لم تُجدول جلسات يومية لهذه الخطة بعد." : `الجلسات في آخر جدول محفوظ: ${new Intl.NumberFormat("ar").format(plan.scheduledSessions)}`}</p><p>تم إعداد الخطة، ولم يبدأ تتبع إنجاز الجلسات بعد.</p><Link to={`/study-plan?plan=${encodeURIComponent(plan.id)}`}>عرض الخطة</Link></div> : <div className="progress-plan"><p>لم تنشئ خطة دراسية بعد.</p><Link to="/study-plan">إنشاء خطة دراسية</Link></div>}</section>
        <section className="progress-card progress-panel"><h2>الإنجازات</h2><div className="progress-empty"><Award size={25} /><p>ستظهر الإنجازات عندما تتوفر أنشطة تعليمية موثقة.</p></div></section>
      </div>
      <section className="progress-card progress-activity"><h2>آخر الأنشطة</h2><p>تتبع الأنشطة التعليمية غير متاح بعد.</p></section>
      <section className="progress-strategy"><span className="progress-strategy-icon"><Sparkles size={22} /></span><div><h2>تحديث استراتيجية الدراسة</h2><p>نحتاج إلى أنشطة تعليمية موثقة قبل تقديم توصيات شخصية مناسبة.</p><p>ستتوفر إجراءات الدروس والاختبارات المقترحة عند وجود محتوى وبيانات موثوقة.</p></div></section>
    </>}
  </div>;
}

export default function Progress() {
  const { auth } = useAuth();
  const [days, setDays] = useState(7), [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    let current = true, timedOut = false;
    setState({ data: null, loading: true, error: "" });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); if (current) setState({ data: null, loading: false, error: "انتهت مهلة الاتصال بالخادم." }); }, 15000);
    getProgressOverview(auth.token, days, { signal: controller.signal }).then((data) => {
      if (current && !timedOut) setState({ data, loading: false, error: "" });
    }).catch((error) => { if (current && !timedOut && error.name !== "AbortError") setState({ data: null, loading: false, error: error.message }); }).finally(() => clearTimeout(timer));
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [auth.token, days, attempt]);
  return <div className="app-screen progress-screen" dir="rtl"><div className="mx-auto flex h-full max-w-[1600px]"><Sidebar activeItem="progress" /><div className="flex min-w-0 flex-1 flex-col"><Navbar searchPlaceholder="ابحث في تقارير التقدّم..." showNotificationDot /><main className="min-h-0 flex-1 overflow-y-auto"><ProgressContent {...state} days={days} onDaysChange={setDays} onRetry={() => setAttempt((n) => n + 1)} /></main><Footer brand /></div></div></div>;
}
