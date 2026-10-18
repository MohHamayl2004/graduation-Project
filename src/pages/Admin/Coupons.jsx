import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TicketPercent, Plus, RefreshCw, LogOut, Trash2 } from "lucide-react";
import Logo from "../../components/common/Logo";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";

const blank = { schoolName: "", code: "", discountPercent: "", durationDays: "" };
const labels = { schoolName: "اسم المدرسة", code: "رمز الكوبون", discountPercent: "نسبة الخصم (%)", durationDays: "مدة الصلاحية بالأيام" };
const states = { active: "ساري", expired: "منتهي", disabled: "معطّل" };
const date = (value) => value ? new Date(value).toLocaleString("ar-PS") : "بدون انتهاء";
export default function Coupons() {
  const { auth, signOut } = useAuth();
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const headers = { Authorization: `Bearer ${auth.token}` };
  async function refresh() {
    try { const response = await apiRequest("/admin/coupons", { headers }); setCoupons(response.coupons); setError(""); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 60000); return () => clearInterval(timer); }, [auth.token]);
  async function create(event) {
    event.preventDefault(); if (busy) return;
    const next = {};
    if (form.schoolName.trim().length < 2 || form.schoolName.trim().length > 160) next.schoolName = "اكتب اسم المدرسة بين حرفين و160 حرفًا";
    if (!/^[\p{L}\p{N}_-]{3,64}$/u.test(form.code.trim())) next.code = "اكتب رمزًا من 3 إلى 64 حرفًا أو رقمًا بدون مسافات";
    if (+form.discountPercent < 1 || +form.discountPercent > 100 || !Number.isFinite(+form.discountPercent)) next.discountPercent = "اختَر نسبة بين 1 و100";
    if (!Number.isInteger(+form.durationDays) || +form.durationDays < 1 || +form.durationDays > 3650) next.durationDays = "اختَر عدد أيام صحيحًا بين 1 و3650";
    setErrors(next); setNotice(""); setError("");
    if (Object.keys(next).length) { document.getElementById(`coupon-${Object.keys(next)[0]}`)?.focus(); return; }
    setBusy(true);
    try {
      const { coupon } = await apiRequest("/admin/coupons", { method: "POST", headers, body: JSON.stringify(form) });
      setCoupons((previous) => [coupon, ...previous]); setForm(blank); setNotice(`تم إنشاء الكوبون ${coupon.code} بخصم ${coupon.discountPercent}%.`); setFilter("all"); setSearch("");
    } catch (e) {
      const field = ({ COUPON_EXISTS: "code", COUPON_CODE_INVALID: "code", COUPON_SCHOOL_INVALID: "schoolName", COUPON_DISCOUNT_INVALID: "discountPercent", COUPON_DURATION_INVALID: "durationDays" })[e.code];
      if (field) { setErrors({ [field]: e.message }); requestAnimationFrame(() => document.getElementById(`coupon-${field}`)?.focus()); } else setError(e.message);
    } finally { setBusy(false); }
  }
  async function removeCoupon() {
    if (busy || !deleting) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`/admin/coupons/${deleting._id}`, { method: "DELETE", headers });
      setCoupons((previous) => previous.filter((c) => c._id !== deleting._id));
      setNotice(`تم حذف الكوبون ${deleting.code}.`); setDeleting(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function toggle(coupon) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await apiRequest(`/admin/coupons/${coupon._id}`, { method: "PATCH", headers, body: JSON.stringify({ active: !coupon.active }) });
      setCoupons((previous) => previous.map((c) => c._id === coupon._id ? response.coupon : c)); setNotice(`تم ${response.coupon.active ? "تفعيل" : "تعطيل"} الكوبون ${coupon.code}.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const shown = coupons.filter((c) => (filter === "all" || c.state === filter) && `${c.code} ${c.schoolName}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div dir="rtl" className="app-min-screen bg-surface text-ink">
    <header className="border-b border-border bg-surface-raised"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5"><Logo height={30} /><Link to="/admin" className="flex items-center gap-2 text-sm font-semibold text-primary"><ArrowRight size={17} />دراسات الاشتراكات</Link><Button variant="ghost" size="sm" onClick={signOut}><LogOut size={16} />تسجيل الخروج</Button></div></header>
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="flex items-center gap-3 text-3xl font-bold text-primary"><TicketPercent size={30} />كوبونات الخصم</h1><p className="mt-2 text-ink-muted">أضف خصمًا لمدرسة وحدد صلاحيته. الخصم يُطبّق على سعر الاشتراك وقت الدفع.</p>
      <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["كل الكوبونات", coupons.length], ...Object.entries(states).map(([state, label]) => [label, coupons.filter((c) => c.state === state).length])].map(([label, count]) => <Card key={label}><p className="text-sm text-ink-muted">{label}</p><p className="mt-2 text-3xl font-bold text-primary">{count}</p></Card>)}</div>
      {error && <p role="alert" className="my-4 rounded-lg bg-error-tint p-4 text-error">{error}</p>}{notice && <p role="status" className="my-4 rounded-lg bg-accent-tint p-4 text-accent">{notice}</p>}
      <Card padding="lg"><h2 className="text-xl font-semibold">إضافة كوبون مدرسة</h2><form onSubmit={create} noValidate><fieldset disabled={busy} className="mt-2 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(labels).map(([key, label]) => <div key={key}><div className="mb-2 flex h-10 items-end"><p id={`coupon-error-${key}`} className="text-xs leading-5 text-error">{errors[key] || "\u00a0"}</p></div><label htmlFor={`coupon-${key}`} className="text-sm font-medium">{label}</label><input id={`coupon-${key}`} type={["discountPercent", "durationDays"].includes(key) ? "number" : "text"} min="1" max={key === "discountPercent" ? 100 : key === "durationDays" ? 3650 : undefined} step={key === "discountPercent" ? "0.1" : "1"} dir={key === "schoolName" ? "rtl" : "ltr"} value={form[key]} onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setErrors((previous) => ({ ...previous, [key]: "" })); }} aria-invalid={Boolean(errors[key])} aria-describedby={`coupon-error-${key}`} className="mt-2 h-11 w-full rounded-lg border border-border-strong px-3 text-sm aria-[invalid=true]:border-error" /></div>)}
        <div className="mt-5 flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-4"><Button type="submit" disabled={busy}><Plus size={18} />{busy ? "جاري الحفظ…" : "إضافة الكوبون"}</Button><p className="text-xs text-ink-muted">الصلاحية تبدأ من وقت الإنشاء، وينتهي قبول الكوبون تلقائيًا بموعد انتهائه.</p></div>
      </fieldset></form></Card>
      <Card padding="lg" className="mt-6"><div className="flex flex-wrap items-end justify-between gap-4"><h2 className="text-xl font-semibold">الكوبونات الحالية</h2><div className="flex flex-wrap gap-3"><label className="text-sm">الحالة<select value={filter} onChange={(e) => setFilter(e.target.value)} className="ms-2 h-10 rounded-lg border border-border px-3"><option value="all">الكل</option>{Object.entries(states).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm">بحث<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="رمز أو اسم المدرسة" className="ms-2 h-10 rounded-lg border border-border px-3" /></label><Button size="sm" variant="outline" disabled={busy} onClick={refresh}><RefreshCw size={15} />تحديث</Button></div></div>
        {loading ? <p role="status" className="py-8 text-center">جاري تحميل الكوبونات…</p> : !shown.length ? <p className="py-8 text-center text-ink-muted">لا توجد كوبونات مطابقة.</p> : <div tabIndex={0} role="region" aria-label="جدول قابل للتمرير أفقيًا" className="mt-5 scroll-table overflow-x-auto"><table className="min-w-[850px] w-full text-sm"><thead><tr className="border-b border-border text-ink-muted">{["المدرسة / الرمز", "الخصم", "بداية الصلاحية", "نهاية الصلاحية", "متبقّي", "الحالة", "التحكم"].map((label) => <th key={label} className="p-3 text-start">{label}</th>)}</tr></thead><tbody>{shown.map((c) => <tr key={c._id} className="border-b border-border"><td className="p-3"><strong>{c.schoolName}</strong><span dir="ltr" className="mt-2 block select-all font-semibold text-primary">{c.code}</span></td><td className="p-3 font-semibold">{c.discountPercent}%</td><td className="p-3">{date(c.createdAt)}</td><td className="p-3">{date(c.expiresAt)}</td><td className="p-3">{c.remainingDays === null ? "غير محدد" : `${c.remainingDays} يومًا`}</td><td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${c.state === "active" ? "bg-accent-tint text-accent" : c.state === "expired" ? "bg-warning-tint text-warning" : "bg-surface-alt text-ink-muted"}`}>{states[c.state]}</span></td><td className="p-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant={c.active ? "outline" : "accent"} disabled={busy || c.state === "expired" || Boolean(!c.active && c.expiresAt && new Date(c.expiresAt) <= new Date())} onClick={() => toggle(c)}>{c.active ? "تعطيل" : "تفعيل"}</Button><Button size="sm" variant="danger" disabled={busy} onClick={() => { setError(""); setDeleting(c); }} aria-label={`حذف الكوبون ${c.code}`}><Trash2 size={15} />حذف</Button></div></td></tr>)}</tbody></table></div>}
      </Card>
      {deleting && <div data-dialog-layer className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="delete-coupon-title" className="w-full max-w-md rounded-2xl bg-surface-raised p-6 shadow-xl"><h2 id="delete-coupon-title" className="text-xl font-bold">حذف الكوبون؟</h2><p className="mt-4 leading-7">سيتم حذف كوبون مدرسة {deleting.schoolName} بالرمز <bdi className="font-semibold">{deleting.code}</bdi> نهائيًا، ولن يمكن استخدامه للخصم. تبقى الدفعات السابقة محفوظة.</p>{error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}<div className="mt-6 flex flex-wrap gap-3"><Button variant="danger" disabled={busy} onClick={removeCoupon}><Trash2 size={16} />{busy ? "جاري الحذف…" : "تأكيد الحذف"}</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)} autoFocus>إلغاء</Button></div></section></div>}
    </main>
  </div>;
}
