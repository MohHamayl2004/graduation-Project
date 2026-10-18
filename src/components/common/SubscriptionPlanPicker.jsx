import { useId } from "react";
import { BookOpen, CalendarDays, Check, Crown, Sparkles } from "lucide-react";
import { money, subscriptionPlans } from "../../../shared/subscriptions";

const presentation = {
  free: { icon: Sparkles, description: "ابدأ رحلتك مع نبراس", price: "مجانًا" },
  monthly: { icon: CalendarDays, description: "خطوة جديدة نحو هدفك", period: "للشهر" },
  quarterly: { icon: BookOpen, description: "رافق دراستك طوال الفصل", period: "للفصل" },
  yearly: { icon: Crown, description: "رحلتك الدراسية على مدار العام", period: "للسنة" }
};

export default function SubscriptionPlanPicker({ value, onChange, disabled = false, includeFree = false, compact = false }) {
  const group = useId();
  const plans = includeFree ? [{ id: "free", label: "مجاني" }, ...subscriptionPlans] : subscriptionPlans;
  return <fieldset dir="rtl">
    <legend className="sr-only">اختيار باقة الاشتراك</legend>
    <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "md:grid-cols-3"}`}>
      {plans.map((plan) => {
        const selected = value === plan.id;
        const { icon: Icon, description, price, period } = presentation[plan.id];
        return <label key={plan.id} className={`group relative flex cursor-pointer ${disabled ? "cursor-wait opacity-60" : ""}`}>
          <input type="radio" name={group} value={plan.id} checked={selected} disabled={disabled} onChange={() => onChange(plan.id)} aria-label={`اشتراك ${plan.label}`} className="peer sr-only" />
          <span className={`flex w-full flex-col overflow-hidden rounded-xl border-2 transition duration-200 peer-focus-visible:ring-4 peer-focus-visible:ring-primary/25 motion-reduce:transition-none ${compact ? "p-4" : "p-6"} ${selected ? "border-primary bg-primary text-white shadow-md" : "border-border bg-surface-raised text-ink hover:border-primary/40 hover:shadow-md"}`}>
            <span className="flex items-center justify-between gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${selected ? "bg-white/15 text-white" : "bg-primary-tint text-primary"}`}><Icon size={21} aria-hidden="true" /></span>
              <span aria-hidden="true" className={`grid h-6 w-6 place-items-center rounded-full border ${selected ? "border-white bg-white text-primary" : "border-border-strong"}`}>{selected && <Check size={15} strokeWidth={3} />}</span>
            </span>
            <span className="mt-4 text-xl font-semibold">{plan.label}</span>
            <span className={`mt-1 text-xs leading-6 ${selected ? "text-white/80" : "text-ink-muted"}`}>{description}</span>
            <span className="mt-5 flex flex-wrap items-baseline gap-2"><span className={`${compact ? "text-2xl" : "text-4xl"} font-semibold tracking-tight`} dir={price ? undefined : "ltr"}>{price || money(plan.cents)}</span>{period && <span className={`text-xs ${selected ? "text-white/75" : "text-ink-muted"}`}>{period}</span>}</span>
            <span className={`mt-5 flex items-center gap-2 border-t pt-4 text-xs ${selected ? "border-white/20 text-white/90" : "border-border text-ink-muted"}`}><Check size={15} className={selected ? "text-white" : "text-accent"} aria-hidden="true" />جميع مزايا نبراس</span>
          </span>
        </label>;
      })}
    </div>
  </fieldset>;
}
