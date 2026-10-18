import { useEffect, useRef, useState } from "react";
import { Plus, CalendarDays, ChevronDown, CheckCircle2, Trash2, Sparkles, PencilLine } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { apiRequest } from "../../services/api";
import PlanBuilder, { PlanSummary } from "./PlanBuilder";
import GeneratedPlan from "./GeneratedPlan";
import { formatDuration } from "../../../shared/studyPlanRules";

export default function SavedPlans({ token }) {
  const [plans, setPlans] = useState([]), [building, setBuilding] = useState(false), [editing, setEditing] = useState(null);
  const [weeklyContext, setWeeklyContext] = useState(null), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState(null), [busy, setBusy] = useState(false), [deleteError, setDeleteError] = useState("");
  const [replace, setReplace] = useState(null), [openId, setOpenId] = useState(null);
  const generationKeys = useRef({}), lock = useRef(false);
  const headers = { Authorization: `Bearer ${token}` };
  const updatePlan = (plan) => setPlans((old) => old.some((p) => p._id === plan._id) ? old.map((p) => p._id === plan._id ? plan : p) : [plan, ...old]);
  function prepareDay(plan, day) {
    const existing = plans.find((p) => p.type === "daily" && p.parentWeeklyId === plan._id && p.periodStart === day.date);
    setEditing(existing || null); setWeeklyContext({ plan, date: day.date, lessonIds: day.lessonIds }); setBuilding(true); setNotice("");
  }
  function editPlan(plan) {
    const parent = plans.find((p) => p._id === plan.parentWeeklyId);
    setWeeklyContext(parent ? { plan: parent, date: plan.periodStart } : null);
    setEditing(plan); setBuilding(true); setNotice("");
  }
  async function generate(plan, confirmed = false) {
    if (lock.current) return;
    if (plan.generated && !confirmed) { setReplace(plan); return; }
    lock.current = true; setBusy(true); setError("");
    const keyId = `${plan._id}:${plan.generationRevision || 0}`; generationKeys.current[keyId] ||= crypto.randomUUID();
    try {
      const result = await apiRequest(`/study-plan/plans/${plan._id}/generate`, { method: "POST", headers, body: JSON.stringify({ replace: confirmed, expectedRevision: plan.generationRevision || 0, requestKey: generationKeys.current[keyId] }) });
      updatePlan(result.plan); setOpenId(plan._id); setReplace(null); setNotice("تم توليد الخطة وحفظ الجلسات بنجاح."); delete generationKeys.current[keyId];
    } catch (e) { setError(e.message); }
    finally { setBusy(false); lock.current = false; }
  }
  async function removePlan() {
    if (busy || !deleting) return;
    setBusy(true); setDeleteError("");
    try {
      await apiRequest(`/study-plan/plans/${deleting._id}`, { method: "DELETE", headers });
      setPlans((old) => old.filter((p) => p._id !== deleting._id).map((p) => p.parentWeeklyId === deleting._id ? { ...p, parentWeeklyId: null } : p));
      setDeleting(null); setNotice("تم حذف الاختيارات.");
    } catch (e) { setDeleteError(e.message); } finally { setBusy(false); }
  }
  useEffect(() => {
    let cancelled = false; setLoading(true); setError("");
    apiRequest("/study-plan/plans", { headers }).then(({ plans }) => { if (!cancelled) { setPlans(plans); setLoading(false); } }).catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [token, reload]);
  if (building) return <PlanBuilder existingPlan={editing} weeklyContext={weeklyContext} token={token} onCancel={() => setBuilding(false)} onSaved={(plan) => { updatePlan(plan); setOpenId(plan._id); setBuilding(false); setNotice("تم حفظ الاختيارات. اضغط توليد الخطة الدراسية لتجهيز جدولك."); }} />;
  return <section className="mt-7 min-w-0" aria-label="اختيارات الدراسة المحفوظة">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold">اختياراتي وخططي الدراسية</h2><Button disabled={loading || busy} onClick={() => { setNotice(""); setWeeklyContext(null); setEditing(null); setBuilding(true); }}><Plus size={17} />بدء الاختيارات</Button></div>
    {notice && <p role="status" className="mt-4 flex items-start gap-2 rounded-lg bg-accent-tint p-4 text-sm leading-7 text-accent"><CheckCircle2 className="mt-1 shrink-0" size={18} />{notice}</p>}
    {error && <div role="alert" className="mt-4 rounded-lg bg-error-tint p-4 text-sm text-error">{error}<Button className="ms-3" size="sm" variant="outline" disabled={busy} onClick={() => { setReplace(null); setReload((n) => n + 1); }}>تحديث القائمة وإعادة المحاولة</Button></div>}
    {loading ? <p role="status" className="mt-4 text-ink-muted">جاري تحميل اختياراتك وخططك…</p> : !plans.length ? <Card className="mt-4 text-center" padding="lg"><CalendarDays size={30} className="mx-auto text-primary" /><p className="mt-3 font-semibold">جاهز تختار شو بدك تدرس؟</p><p className="mt-2 text-sm text-ink-muted">اختَر أيامك ودروسك، ثم ولّد خطتك. اليومية تستخدم فترات فراغك، والأسبوعية تبدأ بتوزيع مبدئي بدون ساعات.</p></Card> : <div className="mt-4 space-y-4">{plans.map((plan) => <details key={plan._id} open={openId === plan._id} onToggle={(e) => { if (e.currentTarget.open) setOpenId(plan._id); else setOpenId((current) => current === plan._id ? null : current); }} className="rounded-xl border border-border bg-surface-raised p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center gap-3"><CalendarDays size={23} className="shrink-0 text-primary" /><span className="min-w-0 flex-1"><strong className="block">{plan.type === "daily" ? "خطة يومية" : "خطة أسبوعية"} · {plan.periodStart}</strong><span className="text-xs text-ink-muted">{plan.selections.length} درسًا · {plan.type === "weekly" ? "بدون ساعات محددة" : formatDuration(plan.totalMinutes)} · {plan.generated ? plan.generatedStale ? "تحتاج إعادة توليد" : "خطة مولّدة محفوظة" : "اختيارات محفوظة"}</span></span><ChevronDown size={19} className="shrink-0" /></summary>
      <div className="mt-5 border-t border-border pt-5"><div className="mb-5 flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={() => generate(plan)}><Sparkles size={16} />{busy ? "جاري المعالجة…" : plan.generated ? "إعادة توليد الخطة" : "توليد الخطة الدراسية"}</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => editPlan(plan)}><PencilLine size={16} />تعديل الاختيارات</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => { setDeleteError(""); setDeleting(plan); }}><Trash2 size={16} />حذف الاختيارات</Button></div>
      {plan.generated ? <GeneratedPlan plan={plan} onEdit={() => editPlan(plan)} onPrepareDay={(day) => prepareDay(plan, day)} /> : <PlanSummary plan={plan} />}
      {plan.type === "weekly" && !plan.generated && <p className="mt-4 rounded-lg bg-primary-tint p-3 text-sm leading-7 text-primary">ولّد الخطة الأسبوعية أولًا لتوزيع الدروس على الأيام، ثم جهّز اليومية بالأوقات المناسبة لك.</p>}
      {plan.parentWeeklyId && <p className="mt-4 text-xs text-ink-muted">يومية مرتبطة باختيارات أسبوعية محفوظة؛ تعديل دروسها متاح ضمن دروس الأسبوع.</p>}</div></details>)}</div>}
    {replace && <div data-dialog-layer className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><section role="dialog" aria-modal="true" aria-label="استبدال الخطة المولّدة" className="w-full max-w-md rounded-xl bg-surface-raised p-6 shadow-xl"><h3 className="text-xl font-semibold">استبدال الخطة المولّدة؟</h3><p className="mt-4 text-sm leading-7">سيُعاد حساب الجدول من الاختيارات المحفوظة ونتيجة فارك الحالية. تبقى النسخة السابقة إذا فشل التوليد. اليوميات المرتبطة تبقى محفوظة بشكل مستقل.</p>{error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}<div className="mt-5 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => generate(replace, true)}>{busy ? "جاري التوليد…" : "تأكيد وإعادة التوليد"}</Button><Button variant="outline" disabled={busy} autoFocus onClick={() => setReplace(null)}>إلغاء</Button></div></section></div>}
    {deleting && <div data-dialog-layer className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><section role="dialog" aria-modal="true" aria-label="حذف الاختيارات المحفوظة" className="w-full max-w-md rounded-xl bg-surface-raised p-6 shadow-xl"><h3 className="text-xl font-semibold">حذف الاختيارات والخطة؟</h3><p className="mt-4 leading-7">سيتم حذف اختيارات {deleting.periodStart} والخطة المولّدة التابعة لها نهائيًا.{deleting.type === "weekly" && " اليوميات المرتبطة تبقى كخطط مستقلة."} نتيجة فارك تبقى محفوظة.</p>{deleteError && <p role="alert" className="mt-3 text-sm text-error">{deleteError}</p>}<div className="mt-5 flex gap-3"><Button variant="danger" disabled={busy} onClick={removePlan}>{busy ? "جاري الحذف…" : "تأكيد الحذف"}</Button><Button variant="outline" disabled={busy} autoFocus onClick={() => setDeleting(null)}>إلغاء</Button></div></section></div>}
  </section>;
}
