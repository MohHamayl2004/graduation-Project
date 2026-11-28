import { Link } from "react-router-dom";
import { Play, BookOpen, FileText, PencilLine, ClipboardCheck, ArrowLeft, BookOpenCheck, FlaskConical, Video, ListChecks } from "lucide-react";
import { resourcesFor } from "../../data/studyResources";

const icons = { explanation: Play, example: BookOpen, practice: PencilLine, quiz: ClipboardCheck, summary: FileText };
const titles = { explanation: "شرح", example: "مثال محلول على", practice: "تدريبات", quiz: "اختبر فهمك في", summary: "ملخص" };
const kindIcon = { video: Video, lesson: BookOpen, book: BookOpenCheck, quiz: ListChecks };
const kindLabel = { video: "فيديو تفاعلي", lesson: "درس تفاعلي", book: "الكتاب التفاعلي", quiz: "اختبار" };
const open = { video: "شاهد الفيديو", lesson: "افتح الدرس", book: "افتح في الكتاب", quiz: "ابدأ الاختبار" };

function Minutes({ activity }) {
  return <p className="mt-3 text-xs font-semibold text-primary">{activity.minutes} دقائق مخصصة{activity.offsetMinutes > 0 && " · متابعة نشاط سابق"}{activity.highlighted && " · إبراز حسب تفضيلاتك"}{activity.adapted === "weak" && " · وقت إضافي حسب نتائجك"}{activity.adapted === "strong" && " · مراجعة سريعة حسب نتائجك"}</p>;
}

// One activity of a plan session. When NIPRAS has real content for it (a video,
// an interactive lesson, a book page, a quiz) the card opens that content;
// otherwise it stays a preview until the content exists.
export default function ResourceCard({ activity, session, onPreview }) {
  const Icon = icons[activity.id];
  const links = resourcesFor(session.lessonId, activity.id);
  const frame = `overflow-hidden rounded-xl border text-start transition hover:shadow-md ${activity.highlighted ? "border-primary/40 bg-primary-tint/30" : "border-border bg-surface-raised"}`;
  if (!links.length) return <button type="button" onClick={onPreview} className={`${frame} focus-visible:ring-2 focus-visible:ring-primary`}>
    {activity.id === "explanation" && <div className="relative flex h-28 items-center justify-between overflow-hidden bg-gradient-to-br from-primary to-teal-700 p-4 text-white"><div className="absolute -left-4 -top-8 h-32 w-32 rounded-full border-[15px] border-white/10" /><span className="relative max-w-[75%] font-bold">{session.lessonTitle}</span><Play size={32} className="relative rounded-full border border-white/40 p-1" /></div>}
    <div className="p-4"><div className="flex items-center justify-between gap-2"><Icon size={21} className="text-primary" /><span className="rounded-full bg-surface-alt px-2 py-1 text-[10px] text-ink-muted">معاينة تجريبية</span></div><h5 className="mt-3 font-bold">{titles[activity.id]} {session.lessonTitle}</h5><p className="mt-2 text-xs leading-6 text-ink-muted">{activity.guidance}</p><Minutes activity={activity} /><span className="mt-3 block text-xs underline">فتح المعاينة</span></div>
  </button>;
  const [main, ...more] = links;
  const KindIcon = kindIcon[main.kind];
  return <article className={`${frame} border-accent/40`}>
    {main.kind === "video" && main.poster ? <Link to={main.to} className="group relative block aspect-video overflow-hidden bg-ink" aria-label={`${open.video}: ${main.title}`}>
      <img src={`${import.meta.env.BASE_URL}${main.poster}`} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
      <span className="absolute inset-0 grid place-items-center bg-ink/20"><Play size={40} className="rounded-full bg-white/90 p-2 text-primary" fill="currentColor" /></span>
    </Link> : null}
    <div className="p-4">
      <div className="flex items-center justify-between gap-2"><Icon size={21} className="text-primary" /><span className="inline-flex items-center gap-1 rounded-full bg-accent-tint px-2 py-1 text-[10px] font-semibold text-accent"><KindIcon size={12} />{kindLabel[main.kind]} · متوفر في نبراس</span></div>
      <h5 className="mt-3 font-bold">{titles[activity.id]} {session.lessonTitle}</h5>
      <p className="mt-1 text-sm font-semibold text-ink">{main.title}</p>
      {main.note && <p className="mt-1 text-xs text-ink-muted">{main.note}</p>}
      <p className="mt-2 text-xs leading-6 text-ink-muted">{activity.guidance}</p>
      <Minutes activity={activity} />
      <Link to={main.to} className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-hover">{open[main.kind]}<ArrowLeft size={15} /></Link>
      {more.length > 0 && <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
        {more.map((r) => { const I = r.kind === "book" && /تجربة/.test(r.title) ? FlaskConical : kindIcon[r.kind];
          return <li key={r.to}><Link to={r.to} className="inline-flex items-center gap-1.5 font-semibold text-link hover:underline"><I size={13} />{r.title}</Link></li>; })}
      </ul>}
    </div>
  </article>;
}
