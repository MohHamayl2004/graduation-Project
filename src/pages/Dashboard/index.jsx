import { ArrowLeft, ArrowUpLeft, BookOpen, CalendarDays, Clock3, FileText, MessageCircle, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Footer from "../../components/layout/Footer";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { useDashboard } from "../../hooks/useDashboard";
import { materialStatusLabel } from "../../services/materialStatus.js";
import { streamLabel } from "../../../shared/academicStreams";
import { dashboardSchedule, STUDY_TIME_ZONE, planUrl, chatUrl } from "./dashboardModel.js";
import "./dashboard.css";

const number = (value) => value.toLocaleString("ar-PS");
const stamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("ar-PS", { month: "short", day: "numeric", timeZone: STUDY_TIME_ZONE });
};
const newest = (items, field) => [...items].sort((a, b) => (Date.parse(b[field]) || 0) - (Date.parse(a[field]) || 0));

function ResourceContent({ resource, onRetry, empty, children }) {
  if (resource.loading) return <p role="status" className="dashboard-state">جارٍ تحميل بياناتك…</p>;
  if (resource.error) return <div role="alert" className="dashboard-state dashboard-error">
    <p>{resource.error.message}</p>
    <button type="button" className="dashboard-text-link" onClick={onRetry}>إعادة المحاولة</button>
  </div>;
  if (!resource.data.length) return <p className="dashboard-state">{empty}</p>;
  return children;
}

function NextAction({ resource, schedule, onRefresh, navigate }) {
  const { nextSession, todayPlan, weeklyPlan, staleToday } = schedule;
  let eyebrow = "خطوتك التالية", title = "يومك الدراسي يبدأ بخطة.", detail = "اختَر دروسك ووقتك، ورتّب يومًا يناسبك.", action = "جهّز خطتك الدراسية", path = "/study-plan";
  if (todayPlan) {
    title = nextSession ? nextSession.lessonTitle : "خطتك لليوم محفوظة.";
    eyebrow = nextSession ? nextSession.start <= schedule.clock ? "جلسة مجدولة الآن" : "جلستك القادمة" : "راجع جدولك";
    detail = nextSession ? `${nextSession.subjectTitle} · ${nextSession.minutes} دقيقة مخصصة في الخطة` : "راجع جلسات اليوم وأوقاتها. مرور الموعد لا يعني إتمام الدراسة.";
    action = "افتح الجلسة في خطتك"; path = planUrl(todayPlan._id);
  } else if (weeklyPlan) {
    title = "من خطة الأسبوع إلى يومك.";
    detail = "لديك دروس موزّعة لهذا اليوم. حدّد وقتك لتجهيز جدول يومي.";
    action = "جهّز يومك من خطة الأسبوع"; path = planUrl(weeklyPlan._id);
  } else if (staleToday) {
    title = "حدّث خطتك قبل أن تبدأ.";
    detail = "تغيّرت اختياراتك. أعد توليد خطة اليوم لتظهر جلساتك الحالية.";
    action = "راجع اختيارات اليوم";
  }
  if (resource.loading) { title = "نحضّر مساحة دراستك."; detail = "جارٍ تحميل خططك المحفوظة."; }
  if (resource.error) { title = "خطتك لم تُحمّل بعد."; detail = "أعد المحاولة لاستعادة جدولك. ما زال بإمكانك فتح الخطط مباشرة."; }
  return <section className="dashboard-next" aria-labelledby="next-action-title">
    <div className="dashboard-next-copy">
      <span className="dashboard-eyebrow">{eyebrow}</span>
      <h2 id="next-action-title">{title}</h2>
      <p>{detail}</p>
      {resource.error ? <div className="dashboard-next-actions"><Button press onClick={onRefresh}>إعادة تحميل البيانات</Button><Link to="/study-plan">افتح الخطط</Link></div>
        : <Button press loading={resource.loading} onClick={() => navigate(path)} className="dashboard-start">{resource.loading ? "جارٍ التحميل" : action}<ArrowLeft size={18} aria-hidden="true" /></Button>}
    </div>
    <div className="dashboard-next-note" aria-label="موعد الجلسة">
      <CalendarDays size={25} strokeWidth={1.6} aria-hidden="true" />
      {nextSession && !resource.loading && !resource.error ? <><strong dir="ltr">{nextSession.start}</strong><span>حتى <bdi>{nextSession.end}</bdi></span><small>موعد مخطط · بتوقيت فلسطين</small></>
        : <><strong className="dashboard-note-label">على مهل، وبوضوح.</strong><span>خطوة واحدة تقرّبك من الفهم.</span></>}
    </div>
  </section>;
}

export function DashboardScreen({ user, resources, now, onRefresh }) {
  const navigate = useNavigate();
  const { plans, materials, chats } = resources;
  const schedule = dashboardSchedule(plans.data, now);
  const recentMaterials = newest(materials.data, "uploadedAt").slice(0, 3);
  const recentChats = newest(chats.data, "updatedAt").slice(0, 3);
  const recentPlans = newest(plans.data, "updatedAt").slice(0, 3);
  const dateLabel = now.toLocaleDateString("ar-PS", { weekday: "long", day: "numeric", month: "long", timeZone: STUDY_TIME_ZONE });
  const busy = Object.values(resources).some((resource) => resource.loading);

  return <div className="app-screen dashboard-screen bg-surface text-ink" dir="rtl">
    <div className="mx-auto flex h-full max-w-[1600px]">
      <Sidebar activeItem="dashboard" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="dashboard-topbar">
          <span className="dashboard-topbar-label">مساحتك الدراسية <span>/ الصفحة الرئيسية</span></span>
        </header>
        <main className="dashboard-scroll" id="dashboard-main">
          <div className="dashboard-content">
            <div className="dashboard-greeting">
              <div><p className="dashboard-date">{dateLabel}</p><h1>أهلًا، {user.fullName.split(" ")[0]}.</h1><p className="dashboard-subtitle">خلّينا نبدأ بما يهمّك اليوم.</p></div>
              <Button variant="ghost" size="sm" onClick={onRefresh} disabled={busy} aria-label="تحديث بيانات الصفحة الرئيسية"><RefreshCw size={16} aria-hidden="true" />{busy ? "جارٍ التحديث" : "تحديث البيانات"}</Button>
            </div>
            {user.schoolBenefit?.discountPercent ? <p className="dashboard-benefit">خصم مدرستك: {user.schoolBenefit.discountPercent}% · {user.schoolBenefit.schoolName}</p> : null}

            <NextAction resource={plans} schedule={schedule} onRefresh={onRefresh} navigate={navigate} />

            <div className="dashboard-columns">
              <div className="dashboard-primary-column">
                <section className="dashboard-agenda" aria-labelledby="today-title">
                  <div className="dashboard-section-heading"><div><span className="dashboard-eyebrow">رتّب وقتك</span><h2 id="today-title">على جدول اليوم</h2></div><Link to={schedule.todayPlan ? planUrl(schedule.todayPlan._id) : "/study-plan"} className="dashboard-text-link">كل الخطط <ArrowUpLeft size={16} aria-hidden="true" /></Link></div>
                  <ResourceContent resource={plans} onRetry={onRefresh} empty="لا توجد خطط محفوظة بعد. ابدأ باختيار أيامك ودروسك.">
                    {schedule.sessions.length ? <>
                      <div className="dashboard-plan-summary"><Clock3 size={16} aria-hidden="true" /><span>{number(schedule.plannedMinutes)} دقيقة مخططة</span><span aria-hidden="true">·</span><span>{number(schedule.lessonCount)} دروس في الجدول</span></div>
                      <ol className="dashboard-session-list">
                        {schedule.sessions.map((session) => <li key={session.id} className={session.id === schedule.nextSession?.id ? "is-next" : ""}>
                          <div className="dashboard-session-time"><bdi>{session.start}</bdi><span><bdi>{session.end}</bdi></span></div>
                          <div className="dashboard-session-copy"><p>{session.subjectTitle}</p><h3>{session.lessonTitle}</h3><span>{number(session.minutes)} دقيقة مخصصة{session.end <= schedule.clock ? " · مرّ الموعد" : session.start <= schedule.clock ? " · موعدها الآن" : ""}</span></div>
                          <Link to={planUrl(schedule.todayPlan._id)} aria-label={`عرض جلسة ${session.lessonTitle} في الخطة`} className="dashboard-session-link"><ArrowLeft size={18} aria-hidden="true" /></Link>
                        </li>)}
                      </ol>
                      <p className="dashboard-footnote">هذه أوقات الدراسة المخططة؛ لا تُحتسب كإنجاز أو وقت دراسة فعلي.</p>
                    </> : <div className="dashboard-agenda-empty"><CalendarDays size={30} strokeWidth={1.4} aria-hidden="true" /><h3>{schedule.staleToday ? "خطة اليوم تحتاج تحديثًا" : schedule.weeklyPlan ? "دروس اليوم بانتظار تحديد الوقت" : "مساحة ليومٍ تختاره أنت"}</h3><p>{schedule.staleToday ? "راجع اختياراتك وأعد توليد الجدول." : "لا يوجد جدول يومي مولّد لهذا اليوم. خططك الأخرى تبقى محفوظة."}</p><Link to={schedule.weeklyPlan ? planUrl(schedule.weeklyPlan._id) : "/study-plan"} className="dashboard-text-link">رتّب جدولك <ArrowLeft size={16} aria-hidden="true" /></Link></div>}
                  </ResourceContent>
                </section>

                <section className="dashboard-materials" aria-labelledby="materials-title">
                  <div className="dashboard-section-heading"><div><span className="dashboard-eyebrow">ارجع إلى موادك</span><h2 id="materials-title">آخر ما حفظته</h2></div><Link to="/analysis" className="dashboard-text-link">المواد المحفوظة <ArrowUpLeft size={16} aria-hidden="true" /></Link></div>
                  <ResourceContent resource={materials} onRetry={onRefresh} empty="لا توجد مواد محفوظة بعد. ستجد ملفاتك هنا عند إضافتها إلى حسابك.">
                    <ul className="dashboard-material-list">{recentMaterials.map((material) => <li key={material._id}><span className="dashboard-file-icon"><FileText size={21} strokeWidth={1.6} aria-hidden="true" /></span><div><h3>{material.title}</h3><p>{materialStatusLabel(material.status)}</p></div>{stamp(material.uploadedAt) && <time dateTime={material.uploadedAt}>{stamp(material.uploadedAt)}</time>}</li>)}</ul>
                    <p className="dashboard-footnote">حفظ الملف لا يعني إنشاء درس أو اختبار منه. معالجة الملفات غير متاحة بعد.</p>
                  </ResourceContent>
                </section>
              </div>

              <div className="dashboard-secondary-column">
                <section className="dashboard-tutor" aria-labelledby="tutor-title">
                  <div className="dashboard-tutor-label"><MessageCircle size={18} strokeWidth={1.6} aria-hidden="true" />معلّمك الذكي</div>
                  <h2 id="tutor-title">الفكرة مش واضحة؟<br />نأخذها خطوة خطوة.</h2>
                  <p>افتح محادثة لطرح سؤالك أو ارجع إلى شرح سابق.</p>
                  <Button press onClick={() => navigate("/ai-tutor")}>افتح المعلّم الذكي <ArrowLeft size={17} aria-hidden="true" /></Button>
                  <div className="dashboard-chat-history"><h3>محادثاتك الأخيرة</h3><ResourceContent resource={chats} onRetry={onRefresh} empty="لا توجد محادثات محفوظة بعد.">
                    <ul>{recentChats.map((chat) => <li key={chat.id}><Link to={chatUrl(chat.id)}><span>{chat.title}</span><ArrowUpLeft size={15} aria-hidden="true" /></Link>{stamp(chat.updatedAt) && <time dateTime={chat.updatedAt}>{stamp(chat.updatedAt)}</time>}</li>)}</ul>
                  </ResourceContent></div>
                </section>

                <section className="dashboard-saved-plans" aria-labelledby="saved-title">
                  <div className="dashboard-section-heading"><h2 id="saved-title">خطط ترجع لها</h2><BookOpen size={18} strokeWidth={1.6} aria-hidden="true" /></div>
                  <ResourceContent resource={plans} onRetry={onRefresh} empty="خطتك الأولى تبدأ باختيار أيامك ودروسك.">
                    <ul>{recentPlans.map((plan) => <li key={plan._id}><Link to={planUrl(plan._id)}><span>{plan.title}</span><ArrowUpLeft size={15} aria-hidden="true" /></Link><p>{plan.type === "weekly" ? "خطة أسبوعية" : "خطة يومية"} · {plan.generatedStale ? "تحتاج تحديثًا" : plan.generated ? "جدول محفوظ" : "اختيارات محفوظة"}</p></li>)}</ul>
                  </ResourceContent>
                </section>

                <aside className="dashboard-progress-note" aria-label="حالة متابعة الإنجاز"><span className="dashboard-eyebrow">خطوة بخطوة</span><h2>الفهم أهمّ من الرقم.</h2><p>إحصاءات الإنجاز والدرجات ليست متاحة بعد. حاليًا، تابع خططك وموادك ومحادثاتك المحفوظة.</p><span>الفرع {streamLabel(user.stream)}</span></aside>
              </div>
            </div>
          </div>
          <Footer />
        </main>
      </div>
    </div>
  </div>;
}

export default function Dashboard() {
  const { auth } = useAuth();
  const { resources, now, refresh } = useDashboard(auth.token);
  return <DashboardScreen user={auth.user} resources={resources} now={now} onRefresh={refresh} />;
}
