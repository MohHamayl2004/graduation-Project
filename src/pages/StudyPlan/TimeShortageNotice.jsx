import Button from "../../components/common/Button";

const remainingGuidance = {
  explanation: "إكمال فهم فكرة الدرس وشرحها.",
  example: "متابعة خطوات المثال المحلول.",
  practice: "إكمال حل التمارين والتطبيق.",
  quiz: "اختبار فهمك، ثم مراجعة الأخطاء وتصحيحها.",
  summary: "تلخيص أهم الأفكار والقوانين ومراجعتها."
};

export default function TimeShortageNotice({ schedule: g, onEdit }) {
  return <section aria-label="توضيح الوقت والدروس المتبقية" className="mt-5 rounded-xl border border-warning/30 bg-warning-tint p-4 sm:p-5">
    <h4 className="text-lg font-bold text-warning">جزء من الدراسة لم يدخل في الجدول</h4>
    <p className="mt-2 text-sm leading-7">وزّعنا ما يتّسع له وقتك بدون تقصير الدروس. بقيت <strong>{g.remainingStudyMinutes} دقيقة دراسة</strong> خارج الجدول، وموضّح تحت شو الأنشطة المتبقية.</p>
    <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        ["الوقت الذي حجزته", g.availableMinutes, "يشمل الدراسة والاستراحات"],
        ["دراسة داخل الجدول", g.scheduledStudyMinutes, "تم توزيعها على جلسات"],
        ["استراحات داخل الجدول", g.breakMinutes, "محسوبة من وقتك المحجوز"],
        ["دراسة خارج الجدول", g.remainingStudyMinutes, "لم نجد لها وقتًا كافيًا"]
      ].map(([label, minutes, detail]) => <div key={label} className="rounded-lg border border-warning/15 bg-surface-raised p-3"><dt className="text-xs font-medium text-ink-muted">{label}</dt><dd className="mt-2 text-xl font-bold text-ink">{minutes} <span className="text-sm font-normal">دقيقة</span></dd><dd className="mt-1 text-xs leading-5 text-ink-muted">{detail}</dd></div>)}
    </dl>
    <p className="mt-4 text-sm leading-7"><strong>كل الدروس التي اخترتها تحتاج تقريبًا {g.requiredStudyMinutes} دقيقة دراسة.</strong> وقد تحتاج حوالي {g.requiredBreakMinutes} دقيقة استراحات إذا درستها بشكل متصل؛ الاستراحات الفعلية تعتمد على فتراتك.</p>
    <div className="mt-4 rounded-lg border border-warning/20 bg-surface-raised p-4">
      <h5 className="font-bold">شو تعمل عشان تكمل الخطة؟</h5>
      <ol className="mt-2 list-inside list-decimal space-y-2 text-sm leading-7">
        <li>افتح «تعديل الأوقات أو الدروس».</li>
        <li>زِد وقت الدراسة ليغطي المتبقي، مع استراحات عند الحاجة، أو قلّل عدد دروس هذا اليوم.</li>
        <li>احفظ الاختيارات، ثم اضغط «إعادة توليد الخطة» لتحديث الجدول.</li>
      </ol>
      {onEdit && <Button variant="outline" size="sm" className="mt-4" onClick={onEdit}>تعديل الأوقات أو الدروس</Button>}
    </div>
    <h5 className="mt-5 font-bold">شو بقي من كل درس؟</h5>
    <div className="mt-3 space-y-3">{g.remaining.map((lesson) => {
      const started = g.sessions.some((s) => s.lessonId === lesson.lessonId);
      return <article key={lesson.lessonId} className="rounded-lg border border-warning/20 bg-surface-raised p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs text-ink-muted">{lesson.subjectTitle}</p><h6 className="mt-1 font-bold">{lesson.lessonTitle}</h6></div><span className="rounded-full bg-warning-tint px-3 py-1 text-xs font-semibold text-warning">باقي {lesson.minutes} دقيقة دراسة</span></div><p className="mt-2 text-xs leading-6 text-ink-muted">{started ? "جزء من هذا الدرس موجود في الجدول؛ التالي هو المتبقي فقط، ولا تحتاج تكرار ما قبله." : "هذا الدرس لم يدخل في الجدول؛ أنشطته التالية ما زالت بحاجة لوقت."}</p><ul className="mt-3 space-y-3">{lesson.activities.map((activity) => <li key={activity.id} className="border-t border-border pt-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{activity.title}</strong><span>{activity.minutes} دقائق متبقية</span></div><p className="mt-1 text-xs leading-6 text-ink-muted">{remainingGuidance[activity.id]}</p></li>)}</ul></article>;
    })}</div>
  </section>;
}
