import { ReceiptText } from "lucide-react";
import Card from "../../components/common/Card";
import { money, tierLabel } from "../../../shared/subscriptions";

export default function PaymentsTable({ payments }) {
  return <Card padding="lg" className="mb-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><ReceiptText size={22} className="text-primary" />سجل دفعات الطلاب</h2><p className="mt-2 text-sm text-ink-muted">صاحب كل دفعة وتفاصيلها حسب الفلاتر المختارة، من الأحدث للأقدم.</p></div><span className="rounded-full bg-primary-tint px-4 py-2 text-sm font-semibold text-primary">{payments.length} عملية دفع</span></div>
    {!payments.length ? <p className="py-10 text-center text-ink-muted">لا توجد دفعات مطابقة للفلاتر.</p> : <div role="region" aria-label="سجل دفعات الطلاب القابل للتمرير" tabIndex={0} className="scroll-table admin-table-wrap mt-5 rounded-lg border border-border">
      <table className="payments-table w-full text-sm" dir="rtl">
        <colgroup><col style={{ width: "28%" }} /><col style={{ width: "11%" }} /><col style={{ width: "13%" }} /><col style={{ width: "17%" }} /><col style={{ width: "12%" }} /><col style={{ width: "19%" }} /></colgroup>
        <thead><tr>{["الطالب والإيميل", "الباقة", "المبلغ المدفوع", "تاريخ الدفع", "نوع الدفع", "رقم العملية"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{payments.map((payment) => <tr key={payment._id || payment.reference}>
          <td><strong className="block text-ink">{payment.student?.fullName || "غير متوفر"}</strong><span dir="ltr" className="mt-1 block break-words text-right text-xs leading-5 text-ink-muted">{payment.student?.email || "—"}</span></td>
          <td><span className="inline-block rounded-lg bg-surface-alt px-3 py-1 text-xs font-semibold text-primary">{tierLabel(payment.tier)}</span></td>
          <td><span dir="ltr" className="inline-block whitespace-nowrap font-bold tabular-nums text-primary">{money(payment.amountCents)}</span></td>
          <td>{payment.paidAt ? <time dateTime={new Date(payment.paidAt).toISOString()}><span className="block whitespace-nowrap">{new Date(payment.paidAt).toLocaleDateString("ar-PS")}</span><span dir="ltr" className="mt-1 inline-block text-xs tabular-nums text-ink-muted">{new Date(payment.paidAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}</span></time> : "—"}</td>
          <td><span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${payment.demo ? "bg-warning-tint text-warning" : "bg-accent-tint text-accent"}`}>{payment.demo ? "تجريبي" : "حقيقي"}</span></td>
          <td><code dir="ltr" className="inline-block max-w-full select-all break-all text-xs leading-5 text-ink-muted">{payment.reference}</code></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <p className="mt-3 text-xs text-ink-muted">الدفعات التجريبية محاكاة فقط وبدون خصم أموال فعلية.</p>
  </Card>;
}
