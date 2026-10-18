import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CreditCard, CheckCircle2, Clock3, LogOut, ArrowRight } from "lucide-react";
import Logo from "../../components/common/Logo";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import SubscriptionPlanPicker from "../../components/common/SubscriptionPlanPicker";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";
import { effectiveSubscription, nextSubscriptionPeriod, palestinianCities, subscriptionPlans, tierLabel, money } from "../../../shared/subscriptions";

const field = "mt-2 h-11 w-full rounded-lg border border-border bg-surface-raised px-3 text-sm";
const date = (value) => value ? new Date(value).toLocaleString("ar-PS") : "لم يبدأ بعد";
export default function Subscription() {
  const { auth, updateUser, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const checkout = location.pathname === "/subscription/checkout";
  const requestedPlan = new URLSearchParams(location.search).get("plan");
  const token = auth.token;
  const [data, setData] = useState(null);
  const [tier, setTier] = useState(subscriptionPlans.some((p) => p.id === requestedPlan) ? requestedPlan : subscriptionPlans.some((p) => p.id === auth.user.subscription?.tier) ? auth.user.subscription.tier : "monthly");
  const [city, setCity] = useState(palestinianCities.includes(auth.user.city) ? auth.user.city : "");
  const [code, setCode] = useState(auth.user.schoolBenefit?.code || "");
  const [coupon, setCoupon] = useState(auth.user.schoolBenefit?.code || "");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [notice, setNotice] = useState(location.state?.billingNotice || "");
  const [confirmPackage, setConfirmPackage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const paymentKey = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };
  const sub = effectiveSubscription(auth.user);
  const planned = nextSubscriptionPeriod(auth.user, tier);
  const needsCity = !palestinianCities.includes(auth.user.city);
  useEffect(() => { if (subscriptionPlans.some((p) => p.id === requestedPlan)) setTier(requestedPlan); }, [requestedPlan]);
  useEffect(() => { if (location.state?.billingNotice) setNotice(location.state.billingNotice); }, [location.state]);
  const openCheckout = () => navigate(`/subscription/checkout?plan=${tier}`);
  const continuePurchase = () => { if (sub.canAccess || sub.queuedPlans.length) setConfirmPackage(true); else openCheckout(); };
  useEffect(() => {
    let cancelled = false;
    apiRequest("/billing", { headers }).then((response) => { if (!cancelled) { setData(response); updateUser(response.user); setError(""); } }).catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [token, retry]);
  useEffect(() => {
    let cancelled = false;
    setQuote(null); setQuoteError(""); paymentKey.current = null;
    if (!checkout) return undefined;
    apiRequest("/billing/quote", { method: "POST", headers, body: JSON.stringify({ tier, couponCode: coupon }) })
      .then((response) => !cancelled && setQuote(response)).catch((e) => !cancelled && setQuoteError(e.message));
    return () => { cancelled = true; };
  }, [tier, coupon, token, checkout]);
  async function saveCity() {
    setBusy(true); setError("");
    try {
      const { user } = await apiRequest("/billing/city", { method: "PATCH", headers, body: JSON.stringify({ city }) });
      updateUser(user); setNotice("تم حفظ مدينتك.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function pay() {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    if (!paymentKey.current) paymentKey.current = crypto.randomUUID();
    try {
      const { user, payment } = await apiRequest("/billing/demo-payment", { method: "POST", headers, body: JSON.stringify({ tier, couponCode: coupon, key: paymentKey.current }) });
      const scheduled = user.subscription.queuedPlans?.some((p) => p.paymentId === payment._id);
      const message = scheduled ? `تم الدفع التجريبي وحجز باقة ${tierLabel(tier)}. ستبدأ تلقائيًا بتاريخ ${date(payment.subscriptionStartsAt)} بعد انتهاء الحزم السابقة.` : `تم الدفع التجريبي وتفعيل اشتراكك. رقم العملية: ${payment.reference}`;
      updateUser(user); setNotice(message); navigate("/subscription", { replace: true, state: { billingNotice: message } });
      paymentKey.current = null; setRetry((v) => v + 1);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="app-min-screen bg-surface text-ink" dir="rtl">
    <header className="border-b border-border bg-surface-raised"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5"><Logo height={30} /><div className="flex gap-2">{sub.canAccess && auth.user.city && <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}><ArrowRight size={16} />للدراسة</Button>}<Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/login"); }}><LogOut size={16} />تسجيل الخروج</Button></div></div></header>
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-4xl font-semibold">{checkout ? "إتمام طلب الحزمة" : "اشتراكي"}</h1><p className="mt-2 text-ink-muted">أهلًا {auth.user.fullName}، تابع اشتراكك أو أضف حزمة لوقتك القادم.</p>
      {error && <div role="alert" className="my-4 rounded-lg bg-error-tint p-4 text-error">{error}{!data && <Button variant="outline" className="ms-3" onClick={() => setRetry((v) => v + 1)}>إعادة المحاولة</Button>}</div>}
      {notice && <p role="status" className="my-4 flex items-start gap-2 rounded-lg bg-accent-tint p-4 text-accent"><CheckCircle2 className="shrink-0" size={19} />{notice}</p>}
      <Card className="mt-6" padding="lg"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold">{sub.canAccess && <CheckCircle2 size={23} className="text-accent" />}{sub.canAccess ? "اشتراكك ساري" : "لا يوجد اشتراك ساري"}</h2><p className="mt-2 text-sm text-ink-muted">الباقة الحالية: {tierLabel(sub.tier)}{sub.activationSource === "admin_gift" && " — منحة مجانية من الإدارة"}</p></div><span className="flex items-center gap-2 rounded-full bg-accent-tint px-4 py-2 text-sm font-semibold text-accent"><Clock3 size={18} />متبقّي {sub.remainingDays} يومًا</span></div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-ink-muted">بداية الاشتراك</dt><dd className="mt-1">{date(sub.startsAt)}</dd></div><div><dt className="text-ink-muted">نهاية الاشتراك</dt><dd className="mt-1">{date(sub.expiresAt)}</dd></div></dl>
        {!sub.canAccess ? <p className="mt-4 rounded-lg bg-warning-tint p-3 text-sm text-warning">{sub.reason === "awaiting_payment" ? "اختَر باقتك وأكمل الدفع التجريبي لتفعيل حسابك." : "اشتراكك غير فعّال. مزايا الدراسة بتتوفر بعد التجديد."}</p> : sub.remainingDays <= 3 && <p className="mt-4 text-sm text-warning">اشتراكك قرب ينتهي. التجديد المبكر بيحافظ على أيامك المتبقية.</p>}
      </Card>
      <section className="mt-5 space-y-3" aria-label="الحزم القادمة">{sub.queuedPlans.map((plan) => <Card key={plan.paymentId || plan.startsAt} padding="lg"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">حزمة {tierLabel(plan.tier)} القادمة</h2><span className="rounded-full bg-primary-tint px-3 py-1 text-xs font-semibold text-primary">محجوزة — تبدأ تلقائيًا</span></div><p className="mt-3 text-sm leading-7 text-ink-muted">تبدأ {date(plan.startsAt)} وتنتهي {date(plan.expiresAt)} بعد انتهاء الحزم السابقة.</p></Card>)}</section>
      {needsCity && <Card className="mt-5" padding="lg"><h2 className="text-xl font-semibold">أكمل مدينتك مرة واحدة</h2><p className="mt-1 text-sm text-ink-muted">اختَر المدينة لمعلومات حسابك وإحصائيات الاشتراكات.</p><div className="mt-3 flex flex-wrap items-end gap-3"><label className="min-w-[200px] flex-1 text-sm">المدينة<select className={field} value={city} onChange={(e) => setCity(e.target.value)}><option value="">اختر المدينة</option>{palestinianCities.map((c) => <option key={c}>{c}</option>)}</select></label><Button disabled={busy || !city} onClick={saveCity}>حفظ المدينة</Button></div></Card>}
      {!checkout && <><h2 className="mb-2 mt-8 text-2xl font-semibold">اختَر الباقة المناسبة إلك</h2>
      <p className="mb-5 text-sm text-ink-muted">كل الباقات بتفتح لك مزايا نبراس. اختَر اللي بناسب رحلتك الدراسية.</p>
      <SubscriptionPlanPicker value={tier} onChange={setTier} disabled={busy} /><div className="mt-5 flex justify-end"><Button disabled={busy || needsCity} onClick={continuePurchase}>{sub.canAccess ? "متابعة إضافة الحزمة" : "متابعة للاشتراك"}<ArrowRight size={17} className="rotate-180" /></Button></div></>}
      {checkout && <><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">حزمة {tierLabel(tier)}</h2><Button variant="outline" onClick={() => navigate("/subscription")}>تغيير الحزمة</Button></div><p className="mt-3 rounded-lg border border-primary/15 bg-primary-tint p-4 text-sm leading-7 text-primary">تبدأ هذه الحزمة بتاريخ {date(quote?.subscriptionStartsAt || planned.startsAt)} وتنتهي بتاريخ {date(quote?.subscriptionExpiresAt || planned.expiresAt)}.{sub.canAccess && " اشتراكك الحالي يبقى ساريًا حتى نهايته."}</p><div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <Card padding="lg"><h2 className="text-xl font-semibold">تفاصيل السعر</h2><div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-[150px] flex-1 text-sm">كوبون المدرسة (اختياري)<input className={field} dir="ltr" value={code} disabled={busy} onChange={(e) => setCode(e.target.value)} /></label><Button variant="outline" disabled={busy} onClick={() => setCoupon(code.trim())}>تطبيق الرمز</Button></div>
          {quoteError ? <p role="alert" className="mt-3 text-sm text-error">{quoteError}</p> : quote ? <dl className="mt-5 space-y-3"><div className="flex justify-between"><dt>السعر الأصلي</dt><dd dir="ltr">{money(quote.baseCents)}</dd></div><div className="flex justify-between"><dt>الخصم</dt><dd>{quote.discountPercent}%</dd></div><div className="flex justify-between border-t border-border pt-3 text-lg font-semibold"><dt>المبلغ النهائي</dt><dd dir="ltr">{money(quote.amountCents)}</dd></div></dl> : <p className="mt-4 text-sm text-ink-muted">جاري حساب السعر…</p>}
          <p className="mt-4 text-xs leading-6 text-ink-muted">الحزمة الجديدة تبدأ بعد انتهاء اشتراكك الساري وأي حزم محجوزة قبله، بدون استبدال الباقة الحالية.</p>
        </Card>
        <Card padding="lg"><h2 className="flex items-center gap-2 text-xl font-semibold"><CreditCard size={22} />الدفع عن طريق Visa — تجريبي</h2><p className="mt-2 rounded-lg bg-warning-tint p-3 text-sm leading-7 text-warning">محاكاة فقط، بدون خصم أموال. المعلومات الوهمية ثابتة ولا تُدخل بيانات بطاقة حقيقية.</p>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="radio" checked readOnly name="payment-method" />Visa تجريبية</label>
          <div className="mt-4 space-y-3"><label className="block text-sm">اسم حامل البطاقة<input readOnly value="NIPRAS DEMO STUDENT" className={field} dir="ltr" /></label><label className="block text-sm">رقم البطاقة الوهمي<input readOnly value="4242 4242 4242 4242" className={field} dir="ltr" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm">الانتهاء<input readOnly value="12/30" className={field} dir="ltr" /></label><label className="text-sm">CVV وهمي<input readOnly value="123" className={field} dir="ltr" /></label></div></div>
          <Button fullWidth className="mt-5" disabled={busy || !quote || !data?.demoEnabled || !palestinianCities.includes(auth.user.city)} onClick={pay}>{busy ? "جاري التنفيذ…" : "إتمام الدفع التجريبي وتأكيد الحزمة"}</Button>
          {!palestinianCities.includes(auth.user.city) && <p className="mt-2 text-sm text-warning">احفظ مدينتك أولًا.</p>}
          {data && !data.demoEnabled && <p className="mt-2 text-sm text-warning">الدفع التجريبي متوقف في هذه البيئة.</p>}
        </Card>
      </div></>}
      <Card className="mt-6" padding="lg"><h2 className="text-xl font-semibold">سجل الدفعات</h2>{!data ? <p className="mt-4 text-ink-muted">جاري تحميل السجل…</p> : !data.payments.length ? <p className="mt-4 text-ink-muted">لا توجد دفعات بعد.</p> : <div tabIndex={0} role="region" aria-label="جدول قابل للتمرير أفقيًا" className="mt-4 scroll-table overflow-x-auto"><table className="min-w-[640px] w-full text-start text-sm"><thead><tr className="border-b border-border text-ink-muted">{["الباقة", "المبلغ", "التاريخ", "النوع", "المرجع"].map((t) => <th key={t} className="p-3 text-start">{t}</th>)}</tr></thead><tbody>{data.payments.map((p) => <tr key={p._id} className="border-b border-border"><td className="p-3">{tierLabel(p.tier)}</td><td className="p-3" dir="ltr">{money(p.amountCents)}</td><td className="p-3">{date(p.paidAt)}</td><td className="p-3">{p.demo ? "تجريبي" : "حقيقي"}</td><td className="max-w-[230px] break-all p-3 text-xs" dir="ltr">{p.reference}</td></tr>)}</tbody></table></div>}</Card>
    {confirmPackage && <div data-dialog-layer className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="package-confirm-title" className="w-full max-w-lg rounded-xl bg-surface-raised p-6 shadow-lg"><h2 id="package-confirm-title" className="text-xl font-semibold text-primary">{sub.canAccess ? "اشتراكك الحالي ما زال ساريًا" : "عندك حزم محجوزة"}</h2><p className="mt-4 text-sm leading-8 text-ink-muted">{sub.canAccess && <>اشتراكك الحالي ينتهي بتاريخ {date(sub.expiresAt)}. </>}باقة {tierLabel(tier)} الجديدة لن تستبدل اشتراكك الحالي؛ ستبدأ تلقائيًا بتاريخ {date(planned.startsAt)} بعد انتهاء الحزم السابقة. هل تريد المتابعة إلى الدفع؟</p><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => { setConfirmPackage(false); openCheckout(); }}>متابعة إلى الدفع</Button><Button variant="outline" onClick={() => setConfirmPackage(false)}>رجوع</Button></div></section></div>}
    </main>
  </div>;
}
