import { ApiError } from "../errors/ApiError.js";
import { palestinianCities, subscriptionPlans, effectiveSubscription, tierLabel, palestineDate } from "../../shared/subscriptions.js";
import { validDate } from "../../shared/studyPlanRules.js";
import { academicStreams, streamLabel } from "../../shared/academicStreams.js";

export function analyticsFilters(query = {}, now = new Date()) {
  const city = String(query.city || "all"), tier = String(query.tier || "all");
  const stream = String(query.stream || "all");
  const from = String(query.from || `${palestineDate(now).slice(0, 7)}-01`), to = String(query.to || palestineDate(now));
  if (!["all", "غير محددة", ...palestinianCities].includes(city) || !["all", "free", ...subscriptionPlans.map((p) => p.id)].includes(tier)
    || !["all", "unspecified", ...academicStreams.map((s) => s.value)].includes(stream)
    || !validDate(from) || !validDate(to) || from > to || Date.parse(to) - Date.parse(from) > 3660 * 86400000) throw new ApiError(400, "INVALID_FILTER", "راجع المدينة والفرع ونوع الاشتراك والفترة الزمنية");
  const search = String(query.search || "").trim().toLowerCase();
  if (search.length > 254) throw new ApiError(400, "INVALID_FILTER", "البحث طويل جدًا");
  return { city, tier, stream, from, to, search };
}
const groupCount = (rows, key) => {
  const counts = new Map(); for (const row of rows) { const value = key(row); counts.set(value, (counts.get(value) || 0) + 1); }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ar"));
};
export function buildAnalytics(allStudents, allPayments, filters, now = new Date()) {
  const students = allStudents.filter((u) => u.role !== "admin").map((u) => ({ ...u, city: u.city || "غير محددة", subscription: effectiveSubscription(u, now) }));
  const byCity = students.filter((u) => (filters.city === "all" || u.city === filters.city)
    && (!filters.stream || filters.stream === "all" || (filters.stream === "unspecified" ? !academicStreams.some((s) => s.value === u.stream) : u.stream === filters.stream)));
  const matched = byCity.filter((u) => (filters.tier === "all" || u.subscription.tier === filters.tier) && (!filters.search || u.email.toLowerCase().includes(filters.search)));
  const cityOwners = new Set(byCity.filter((u) => !filters.search || u.email.toLowerCase().includes(filters.search)).map((u) => String(u._id)));
  const inPeriod = (date) => { const value = date ? palestineDate(date) : ""; return value >= filters.from && value <= filters.to; };
  const studentById = new Map(students.map((u) => [String(u._id), u]));
  const payments = allPayments.filter((p) => p.status === "completed" && cityOwners.has(String(p.owner)) && (filters.tier === "all" || p.tier === filters.tier) && inPeriod(p.paidAt))
    .map((p) => { const student = studentById.get(String(p.owner)); return { ...p, student: student ? { id: String(student._id), fullName: student.fullName, email: student.email } : null }; })
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  const demoCents = payments.filter((p) => p.demo).reduce((sum, p) => sum + p.amountCents, 0);
  const realCents = payments.filter((p) => !p.demo).reduce((sum, p) => sum + p.amountCents, 0);
  const tierCounts = groupCount(matched, (u) => tierLabel(u.subscription.tier));
  const cityCounts = groupCount(matched, (u) => u.city);
  const streamCounts = groupCount(matched, (u) => streamLabel(u.stream));
  const monthly = new Map();
  const cursor = new Date(`${filters.from.slice(0, 7)}-01T00:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= filters.to.slice(0, 7)) {
    const month = cursor.toISOString().slice(0, 7); monthly.set(month, { month, demoCents: 0, realCents: 0, payments: 0, newStudents: 0 }); cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  for (const p of payments) { const row = monthly.get(palestineDate(p.paidAt).slice(0, 7)); if (row) { row[p.demo ? "demoCents" : "realCents"] += p.amountCents; row.payments++; } }
  for (const u of matched) if (inPeriod(u.createdAt)) { const row = monthly.get(palestineDate(u.createdAt).slice(0, 7)); if (row) row.newStudents++; }
  const stats = { total: matched.length, free: matched.filter((u) => u.subscription.status === "FREE").length,
    active: matched.filter((u) => u.subscription.status === "ACTIVE").length, inactive: matched.filter((u) => u.subscription.status === "INACTIVE").length,
    blocked: matched.filter((u) => u.status === "INACTIVE").length,
    expiring: matched.filter((u) => u.subscription.canAccess && u.subscription.remainingDays <= 3).length,
    newStudents: matched.filter((u) => inPeriod(u.createdAt)).length, paymentCount: payments.length, renewals: payments.filter((p) => p.renewal).length, demoCents, realCents };
  const notes = matched.length ? [
    `عدد الطلاب المطابقين للفلاتر: ${stats.total}. منهم ${stats.active} باشتراك فعّال و${stats.free} بتجربة مجانية سارية.`,
    `أكثر نوع اشتراك بين الحسابات الحالية: ${tierCounts[0].label} (${tierCounts[0].count} حساب، ${Math.round(tierCounts[0].count / matched.length * 100)}%).`,
    `أعلى مدينة بعدد الحسابات ضمن الفلاتر: ${cityCounts[0].label} (${cityCounts[0].count} حساب).`,
    `أكثر فرع دراسي ضمن الفلاتر: ${streamCounts[0].label} (${streamCounts[0].count} حساب، ${Math.round(streamCounts[0].count / matched.length * 100)}%).`,
    `خلال الفترة المحددة اكتملت ${payments.length} عملية دفع، منها ${stats.renewals} تجديد. الحسابات الحالية تُحسب حسب باقتها الحالية، والإيرادات حسب باقة عملية الدفع وقت إتمامها.`,
    `يوجد ${stats.expiring} اشتراك ساري ينتهي خلال 3 أيام. الحسابات المحظورة (${stats.blocked}) داخلة ضمن غير الفعّالة.`,
    "هذه نتائج وصفية من البيانات المسجلة؛ لا تفسّر أسباب اختلاف الاشتراكات بين المدن. الإيراد لا يمثل صافي الربح."
  ] : ["لا توجد بيانات مطابقة للفلاتر الحالية. لم تُستخدم بيانات توضيحية في هذا التقرير."];
  return { generatedAt: new Date(now).toISOString(), filters, stats, tierCounts, cityCounts, streamCounts, monthly: [...monthly.values()], notes, students: matched, payments };
}
// Spreadsheet applications interpret formula-prefixed cells, even inside quotes.
export function csvCell(value) {
  let text = String(value ?? ""); if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function studentsCsv(report) {
  const rows = [["الاسم", "الإيميل", "المدينة", "الفرع الدراسي", "نوع الاشتراك", "الحالة", "بداية الاشتراك", "نهاية الاشتراك", "الأيام المتبقية", "حظر إداري", "سبب التعطيل"]];
  for (const u of report.students) rows.push([u.fullName, u.email, u.city, streamLabel(u.stream), tierLabel(u.subscription.tier), u.subscription.status, u.subscription.startsAt, u.subscription.expiresAt, u.subscription.remainingDays, u.status === "INACTIVE" ? "نعم" : "لا", u.blockReason || u.subscription.reason || ""]);
  return `\uFEFF${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}`;
}
