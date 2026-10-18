import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PaymentsTable from "./PaymentsTable";
import { ShieldCheck, Users, CreditCard, BarChart3, Printer, Download, Search, LogOut, RefreshCw, X, Clock3 } from "lucide-react";
import Logo from "../../components/common/Logo";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { apiRequest, API_BASE_URL } from "../../services/api";
import { palestinianCities, subscriptionPlans, tierLabel, money, palestineDate } from "../../../shared/subscriptions";
import "./admin.css";
import { academicStreams, streamLabel } from "../../../shared/academicStreams";

const input = "mt-2 h-11 w-full rounded-lg border border-border bg-surface-raised px-3 text-sm";
const date = (value) => value ? new Date(value).toLocaleDateString("ar-PS") : "—";
const queryString = (filters) => new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
const initialFilters = () => ({ city: "all", tier: "all", stream: "all", from: `${palestineDate().slice(0, 7)}-01`, to: palestineDate(), search: "" });

function Bars({ rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return <figure aria-label={label}>{!rows.length ? <p className="py-8 text-center text-ink-muted">لا توجد بيانات مطابقة</p> : <div className="mt-4 space-y-4">{rows.map((row) => <div key={row.label}><div className="mb-1 flex justify-between gap-2 text-sm"><span>{row.label}</span><span className="font-semibold">{row.count}</span></div><div role="meter" aria-label={row.label} aria-valuenow={row.count} aria-valuemin={0} aria-valuemax={max} className="h-3 overflow-hidden rounded-full bg-surface-alt"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${row.count / max * 100}%` }} /></div></div>)}</div>}</figure>;
}
function Donut({ rows }) {
  const colors = ["#192d69", "#158267", "#e6a43b", "#8b5cf6"];
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  let offset = 0;
  return <figure aria-label="توزيع أنواع الاشتراكات">{!total ? <p className="py-8 text-center text-ink-muted">لا توجد اشتراكات بعد</p> : <div className="mt-4 flex flex-wrap items-center justify-center gap-7"><svg width="180" height="180" viewBox="0 0 120 120" role="img" aria-label={`توزيع ${total} حسابًا حسب الاشتراك`}><circle cx="60" cy="60" r="43" fill="none" stroke="#eef0f5" strokeWidth="14" />{rows.map((row, i) => {
    const fraction = row.count / total; const start = offset; offset += fraction;
    return <circle key={row.label} cx="60" cy="60" r="43" fill="none" pathLength="1" stroke={colors[i % 4]} strokeWidth="14" strokeDasharray={`${fraction} ${1 - fraction}`} strokeDashoffset={-start} transform="rotate(-90 60 60)"><title>{row.label}: {row.count}</title></circle>;
  })}<text x="60" y="63" textAnchor="middle" fontSize="18" fontWeight="700" fill="#192d69">{total}</text><text x="60" y="78" textAnchor="middle" fontSize="9" fill="#667085">حساب</text></svg><ul className="space-y-3 text-sm">{rows.map((row, i) => <li key={row.label} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: colors[i % 4] }} />{row.label}: {row.count} ({Math.round(row.count / total * 100)}%)</li>)}</ul></div>}</figure>;
}
function MonthlyChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.demoCents + r.realCents));
  const hasPayments = rows.some((r) => r.payments);
  return <figure aria-label="الإيرادات الشهرية">{!hasPayments ? <p className="py-8 text-center text-ink-muted">لا توجد دفعات ضمن الفترة والفلاتر المحددة</p> : <div className="mt-5 flex flex-wrap items-end justify-center gap-6">{rows.map((row) => <div key={row.month} className="w-24 text-center text-xs"><p className="mb-2 font-semibold" dir="ltr">{money(row.demoCents + row.realCents)}</p><div className="mx-auto flex h-36 w-10 flex-col justify-end overflow-hidden rounded-t-md bg-surface-alt"><div className="bg-accent" style={{ height: `${row.realCents / max * 100}%` }} /><div className="bg-primary" style={{ height: `${row.demoCents / max * 100}%` }} /></div><p className="mt-2" dir="ltr">{row.month}</p><p className="mt-1 text-ink-muted">{row.payments} دفعة · {row.newStudents} حساب جديد</p></div>)}</div>}<figcaption className="mt-4 text-center text-xs text-ink-muted">الأزرق: مبالغ تجريبية · الأخضر: إيرادات حقيقية. الأرقام ليست صافي الربح.</figcaption></figure>;
}

export default function Admin() {
  const { auth, signOut } = useAuth();
  const token = auth.token;
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(initialFilters);
  const [report, setReport] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("grant");
  const [tier, setTier] = useState("monthly");
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const studentsTable = useRef(null);
  const [busy, setBusy] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const abort = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setReport(null);
    const controller = new AbortController(); abort.current = controller;
    apiRequest(`/admin/report?${queryString(filters)}`, { headers, signal: controller.signal }).then((data) => { if (!cancelled) { setReport(data); setLoading(false); } }).catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    apiRequest("/admin/events", { headers }).then((data) => !cancelled && setEvents(data.events)).catch(() => {});
    return () => { cancelled = true; controller.abort(); };
  }, [token, filters, reload]);
  useEffect(() => { const timer = setInterval(() => { if (!document.hidden && !selected && !busy) setReload((v) => v + 1); }, 60000); return () => clearInterval(timer); }, [selected, busy]);
  async function exportCsv() {
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/students.csv?${queryString(report.filters)}`, { headers });
      if (!response.ok) throw new Error("تعذر تصدير الملف");
      const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = "nipras-subscribers.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); }
  }
  async function submitAction(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      await apiRequest(`/admin/students/${selected._id}/action`, { method: "POST", headers, body: JSON.stringify({ action, tier, reason, confirmEmail }) });
      setSelected(null); setNotice(action === "delete" ? "تم حذف الحساب وبياناته الدراسية وتسجيل العملية." : action === "grant" ? "تم منح الاشتراك مجانًا وتفعيل الحساب." : "تم تحديث الحساب وتسجيل العملية."); setReload((v) => v + 1);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const stats = report?.stats;
  const studentNeedle = studentSearch.trim().toLowerCase();
  const visibleStudents = (report?.students || []).filter((student) => !studentNeedle || student.email.toLowerCase().includes(studentNeedle));
  const comprehensive = filters.city === "all" && filters.tier === "all" && filters.stream === "all" && !filters.search;
  return <div className="admin-report app-min-screen bg-surface text-ink" dir="rtl">
    <header className="admin-no-print border-b border-border bg-surface-raised"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-5"><Logo height={30} /><span className="flex items-center gap-2 font-semibold text-primary"><ShieldCheck size={20} />لوحة إدارة نبراس</span><Link to="/admin/coupons" className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-tint">كوبونات الخصم</Link><Button variant="ghost" size="sm" onClick={signOut}><LogOut size={16} />تسجيل الخروج</Button></div></header>
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-4xl font-semibold">دراسات الاشتراكات</h1><p className="mt-2 text-ink-muted">رسومات وأرقام وتحليلات من قاعدة البيانات مباشرة، تشمل الحسابات الموجودة.</p></div><div className="admin-no-print flex flex-wrap gap-2"><Button variant="outline" disabled={loading || !report} onClick={() => setReload((v) => v + 1)}><RefreshCw size={16} />تحديث</Button><Button variant="outline" disabled={loading || !report} onClick={exportCsv}><Download size={16} />تصدير CSV</Button><Button disabled={loading || !report} onClick={() => window.print()}><Printer size={16} />طباعة / حفظ PDF</Button></div></div>
      <form className="admin-no-print my-6 grid items-end gap-3 rounded-xl border border-border bg-surface-raised p-5 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => { event.preventDefault(); setFilters({ ...draft }); setNotice(""); }}>
        <label className="text-sm">المدينة<select className={input} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })}><option value="all">كل المدن</option>{[...palestinianCities, "غير محددة"].map((city) => <option key={city}>{city}</option>)}</select></label>
        <label className="text-sm">نوع الاشتراك<select className={input} value={draft.tier} onChange={(e) => setDraft({ ...draft, tier: e.target.value })}><option value="all">كل الاشتراكات</option><option value="free">مجاني</option>{subscriptionPlans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <label className="text-sm">الفرع الدراسي<select className={input} value={draft.stream} onChange={(e) => setDraft({ ...draft, stream: e.target.value })}><option value="all">كل الفروع</option>{academicStreams.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}<option value="unspecified">المسار غير محدد</option></select></label>
        <label className="text-sm">من تاريخ<input type="date" className={input} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label><label className="text-sm">إلى تاريخ<input type="date" className={input} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label>
        <label className="text-sm">البحث بإيميل الطالب<input type="search" dir="ltr" placeholder="student@example.com" className={input} value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} /></label>
        <div className="flex gap-2"><Button type="submit" disabled={busy}><Search size={16} />تطبيق</Button><Button variant="ghost" onClick={() => { const fresh = initialFilters(); setDraft(fresh); setFilters(fresh); }}>الكل</Button></div>
      </form>
      {error && <p role="alert" className="admin-no-print my-4 rounded-lg bg-error-tint p-4 text-error">{error}</p>}{notice && <p role="status" className="admin-no-print my-4 rounded-lg bg-accent-tint p-4 text-accent">{notice}</p>}
      {loading ? <p role="status" className="py-16 text-center text-ink-muted">جاري إعداد الدراسة من البيانات…</p> : report && <>
        <section className="mb-5 rounded-lg border border-border bg-surface-raised p-4 text-sm"><h2 className="font-semibold text-primary">{comprehensive ? "دراسة شاملة" : "دراسة مفلترة"}</h2><p className="mt-1">المدينة: {report.filters.city === "all" ? "كل المدن" : report.filters.city} · الاشتراك: {report.filters.tier === "all" ? "كل الأنواع" : tierLabel(report.filters.tier)} · الفرع: {report.filters.stream === "all" ? "كل الفروع" : streamLabel(report.filters.stream)} · الفترة: {report.filters.from} إلى {report.filters.to}{report.filters.search && ` · الإيميل يحتوي على: ${report.filters.search}`}</p><p className="mt-1 text-xs text-ink-muted">حالات الحسابات محسوبة الآن. الفترة تُطبّق على الدفعات والحسابات الجديدة. أُعد التقرير: {new Date(report.generatedAt).toLocaleString("ar-PS")}</p></section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
          ["الطلاب", stats.total, Users], ["اشتراك فعّال", stats.active, CreditCard], ["مجاني ساري", stats.free, ClockIcon], ["غير فعّال", stats.inactive, Users],
          ["محظور إداريًا (ضمن غير الفعّال)", stats.blocked, ShieldCheck], ["ينتهي خلال 3 أيام", stats.expiring, ClockIcon], ["إيرادات حقيقية للفترة", money(stats.realCents), CreditCard], ["مبالغ تجريبية للفترة", money(stats.demoCents), BarChart3]
        ].map(([label, value, Icon]) => <Card key={label} padding="lg"><div className="flex items-center justify-between gap-3"><p className="text-sm text-ink-muted">{label}</p><Icon size={19} className="text-primary" /></div><p className="mt-3 text-3xl font-semibold text-primary">{value}</p></Card>)}</div>
        <div className="my-5 grid items-start gap-5 lg:grid-cols-2"><Card padding="lg"><h2 className="text-xl font-semibold">توزيع أنواع الاشتراكات</h2><Donut rows={report.tierCounts} /></Card><Card padding="lg"><h2 className="text-xl font-semibold">الحسابات حسب المدينة</h2><Bars rows={report.cityCounts} label="أعداد الحسابات حسب المدينة" /></Card></div>
        <Card padding="lg" className="mb-5"><h2 className="text-xl font-semibold">الحسابات حسب الفرع الدراسي</h2><Bars rows={report.streamCounts || []} label="أعداد الحسابات حسب الفرع الدراسي" /></Card>
        <Card padding="lg" className="mb-5"><h2 className="text-xl font-semibold">الاشتراكات والإيرادات عبر الأشهر</h2><MonthlyChart rows={report.monthly} /></Card>
        <section><Card padding="lg" className="mb-5"><h2 className="flex items-center gap-2 text-xl font-semibold"><BarChart3 size={21} />التحليل المكتوب</h2><ul className="mt-4 list-disc space-y-3 ps-5 text-sm leading-7">{report.notes.map((text) => <li key={text}>{text}</li>)}</ul><p className="mt-4 text-sm">الحسابات الجديدة في الفترة: <strong>{stats.newStudents}</strong> · الدفعات المكتملة: <strong>{stats.paymentCount}</strong></p></Card></section>
        <Card padding="lg" className="mb-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">الطلاب المشتركون ({report.students.length})</h2><p className="mt-1 text-xs text-ink-muted">عرض {visibleStudents.length} من {report.students.length} طالب</p></div><label className="admin-no-print w-full text-sm sm:w-80">بحث بالإيميل في قائمة الطلاب<input type="search" dir="ltr" autoComplete="off" placeholder="student@example.com" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} className={input} /><span className="mt-1 block text-xs text-ink-muted">يبحث في القائمة فقط، بدون تغيير الدراسات.</span></label></div><div className="admin-no-print mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => studentsTable.current?.scrollTo({ top: 0, behavior: "smooth" })}>أول القائمة</Button><Button size="sm" variant="outline" onClick={() => studentsTable.current?.scrollTo({ top: studentsTable.current.scrollHeight, behavior: "smooth" })}>آخر القائمة</Button></div>{!visibleStudents.length ? <p className="py-8 text-center text-ink-muted">لا توجد بيانات مطابقة للفلاتر.</p> : <div ref={studentsTable} tabIndex={0} role="region" aria-label="قائمة الطلاب القابلة للتمرير" className="scroll-table admin-table-wrap mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-ink-muted">{["الطالب والإيميل", "المدينة", "الفرع الدراسي", "الباقة / الحالة", "البداية", "النهاية", "متبقّي", "التحكم"].map((label) => <th key={label} className={`p-3 text-start ${label === "التحكم" ? "admin-no-print" : ""}`}>{label}</th>)}</tr></thead><tbody>{visibleStudents.map((student) => <tr key={student._id} className="border-b border-border"><td className="p-3"><strong>{student.fullName}</strong><span className="mt-1 block text-xs text-ink-muted" dir="ltr">{student.email}</span></td><td className="p-3">{student.city}</td><td className="p-3">{streamLabel(student.stream)}</td><td className="p-3">{tierLabel(student.subscription.tier)}<span className="mt-1 block text-xs font-semibold text-primary">{student.subscription.status}</span>{student.subscription.activationSource === "admin_gift" && <span className="mt-1 block text-xs text-accent">منحة مجانية من الإدارة</span>}{student.status === "INACTIVE" && <span className="text-xs text-error">محظور إداريًا</span>}</td><td className="p-3">{date(student.subscription.startsAt)}</td><td className="p-3">{date(student.subscription.expiresAt)}</td><td className="p-3">{student.subscription.remainingDays} يومًا</td><td className="admin-no-print p-3"><Button size="sm" variant="outline" onClick={() => { setSelected(student); setAction("grant"); setTier("monthly"); setReason(""); setConfirmEmail(""); setError(""); }}>إدارة الحساب</Button></td></tr>)}</tbody></table></div>}</Card>
        <PaymentsTable payments={report.payments} />
      </>}
      <section className="admin-no-print mt-6"><Card padding="lg"><h2 className="text-xl font-semibold">سجل الإدارة — آخر 200 عملية</h2><p className="mt-1 text-xs text-ink-muted">هذا السجل عام ومستقل عن فلاتر الدراسات.</p>{!events.length ? <p className="mt-4 text-sm text-ink-muted">لا توجد عمليات إدارية بعد.</p> : <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{events.map((event) => <div key={event._id} className="rounded-lg border border-border p-3 text-sm"><p className="font-semibold">{({ activate: "تفعيل اشتراك", grant: "منح اشتراك مجاني", delete: "حذف حساب", deactivate: "تعطيل اشتراك", block: "حظر حساب", unblock: "رفع حظر", coupon_create: "إنشاء كوبون", coupon_delete: "حذف كوبون", coupon_status: "تغيير حالة كوبون" })[event.action] || event.action} · {event.student?.email || event.details?.couponCode || event.details?.deletedEmail || "حساب غير موجود"}</p><p className="mt-1 text-ink-muted">{event.reason} · بواسطة {event.actor?.fullName || "النظام"} · {new Date(event.createdAt).toLocaleString("ar-PS")}</p></div>)}</div>}</Card></section>
      {selected && <div className="admin-no-print fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4"><form onSubmit={submitAction} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-raised p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="إدارة حساب الطالب"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">إدارة حساب الطالب</h2><button type="button" disabled={busy} aria-label="إغلاق إدارة الحساب" onClick={() => setSelected(null)}><X size={20} /></button></div><p className="my-3 break-all text-sm" dir="ltr">{selected.email}</p><label className="block text-sm">العملية<select className={input} value={action} onChange={(e) => setAction(e.target.value)}><option value="grant">منح اشتراك مجاني</option><option value="deactivate">تعطيل الاشتراك</option><option value="delete">حذف الحساب نهائيًا</option><option value="block">حظر الحساب إداريًا</option><option value="unblock">رفع الحظر الإداري</option></select></label>{action === "grant" && <label className="mt-4 block text-sm">الباقة<select className={input} value={tier} onChange={(e) => setTier(e.target.value)}>{subscriptionPlans.map((p) => <option value={p.id} key={p.id}>{p.label} — {p.days} يومًا</option>)}</select><span className="mt-2 block text-xs text-ink-muted">منحة مجانية تبدأ من الآن بدون تسجيل دفعة. يصبح الحساب فعّالًا ويُرفع حظره إن وُجد.</span></label>}{action === "delete" && <div className="mt-4 rounded-lg border border-error/30 bg-error-tint p-4"><p className="text-sm leading-6 text-error">حذف نهائي للحساب وبياناته الدراسية. تبقى سجلات الدفعات والإدارة للتوثيق. اكتب إيميل الطالب لتأكيد الحذف.</p><label className="mt-3 block text-sm">تأكيد إيميل الطالب<input type="text" dir="ltr" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className={input} autoComplete="off" /></label></div>}<label className="mt-4 block text-sm">سبب العملية (اختياري)<textarea maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-border p-3" /></label>{error && <p className="mt-2 text-sm text-error" role="alert">{error}</p>}<Button type="submit" fullWidth className="mt-4" variant={action === "delete" ? "danger" : "primary"} disabled={busy || (action === "delete" && confirmEmail.trim().toLowerCase() !== selected.email)}>{busy ? "جاري الحفظ…" : action === "grant" ? "منح الاشتراك مجانًا" : action === "delete" ? "حذف الحساب نهائيًا" : "تنفيذ وتسجيل العملية"}</Button></form></div>}
    </main>
  </div>;
}
function ClockIcon(props) { return <Clock3 {...props} />; }
