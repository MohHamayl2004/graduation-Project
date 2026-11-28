import { useState } from "react";
import { ArrowRight, BookOpen, BookOpenCheck, ChevronLeft, FlaskConical, Play, SearchX, Sigma, Video, Zap } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import { subjects, filterSubjects, filterLessons } from "./library";
import mathThumbnail from "./math-thumbnail.svg";
import physicsThumbnail from "./physics-thumbnail.svg";
import "./lectures.css";

const subjectLink = subject => `/lectures?${new URLSearchParams({ subject: subject.id })}`;
const number = value => new Intl.NumberFormat("ar").format(value);
const look = { math: { thumbnail: mathThumbnail, Icon: Sigma }, physics: { thumbnail: physicsThumbnail, Icon: Zap } };
const lookOf = (subject) => look[subject.id] || look.math;
const thumbnail = mathThumbnail;
function Counts({ subject }) {
  const books = subject.books || [];
  if (books.length && !subject.videos.length && !subject.lessons.length) {
    return <div className="library-counts"><span><BookOpenCheck size={15} />{number(books.length)} كتاب تفاعلي</span><span><FlaskConical size={15} />{number(books.reduce((n, b) => n + b.experiments, 0))} تجربة</span></div>;
  }
  return <div className="library-counts"><span><Video size={15} />{number(subject.videos.length)} فيديو</span><span><BookOpen size={15} />{number(subject.lessons.length)} درس تفاعلي</span></div>;
}
function SubjectCard({ subject, featured = false }) {
  const { thumbnail: image, Icon } = lookOf(subject);
  return <Link to={subjectLink(subject)} className={`library-subject${featured ? " library-featured" : ""}`}>
    <div className="library-thumbnail"><img src={image} alt="" loading={featured ? "eager" : "lazy"} width="960" height="540" /><span className="library-play" aria-hidden="true"><Play size={23} fill="currentColor" /></span></div>
    <div className="library-card-body">
      {featured && <span className="library-eyebrow">المادة المميزة</span>}
      <h2><span className="library-subject-icon"><Icon size={23} /></span>{subject.name}<ChevronLeft className="library-card-arrow" size={20} aria-hidden="true" /></h2>
      <p>{subject.description}</p><Counts subject={subject} />
    </div>
  </Link>;
}

export default function Lectures() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const subjectId = params.get("subject");
  const subject = subjects.find(item => item.id === subjectId);
  const visible = filterSubjects(query);
  const featured = visible.find(item => item.name === "الكيمياء") || visible[0];
  const lessons = subject ? filterLessons(subject, query) : [];
  return <div className="app-screen library-screen bg-surface text-ink" dir="rtl">
    <div className="mx-auto flex h-full max-w-[1600px]">
      <Sidebar activeItem="lectures" />
      <div className="library-main">
        <Navbar searchPlaceholder="ابحث عن مادة أو فيديو..." searchValue={query} onSearchChange={setQuery} />
        <main className="library-content">
          {subjectId && <Link className="library-back" to="/lectures" onClick={() => setQuery("")}><ArrowRight size={17} />العودة إلى مكتبة المواد</Link>}
          <header className="library-heading"><span className="library-heading-icon"><Video size={26} /></span><div>
            <h1>{subjectId ? subject?.name || "المادة غير متاحة" : "مكتبة الفيديو التعليمية"}</h1>
            <p>{subjectId ? "تصفّح محتوى المادة المتاح، وابدأ من الدرس المناسب لك." : "اكتشف مجموعة واسعة من الفيديوهات التعليمية لجميع المواد."}</p>
          </div></header>
          {!subjectId ? <>
            {featured && <SubjectCard subject={featured} featured />}
            <div className="library-section-heading"><h2>المواد المتاحة</h2><span role="status">{number(visible.length)} مادة</span></div>
            {visible.length ? <div className="library-grid">{visible.map(item => <SubjectCard key={item.id} subject={item} />)}</div> : <div className="library-empty" role="status"><SearchX size={34} /><h2>لا توجد نتائج مطابقة</h2><p>جرّب اسم مادة أو عنوان درس آخر.</p></div>}
          </> : subject ? <>
            <div className="library-collection-summary"><Counts subject={subject} /><p>{subject.description}</p></div>
            {subject.books?.length > 0 && <>
              <div className="library-section-heading"><h2>الكتاب التفاعلي</h2><span role="status">{number(subject.books.length)} كتاب</span></div>
              <div className="library-grid">{subject.books.map(item => <Link key={item.id} to={item.to} className="library-subject library-book">
                <div className="library-thumbnail"><img src={`${import.meta.env.BASE_URL}${item.cover}`} alt="" loading="lazy" width="1453" height="1878" /><span className="library-play" aria-hidden="true"><BookOpenCheck size={23} /></span></div>
                <div className="library-card-body"><span className="library-eyebrow">كتاب تفاعلي · {number(item.experiments)} تجربة</span><h2>{item.title}<ChevronLeft size={20} className="library-card-arrow" aria-hidden="true" /></h2><p>{item.summary}</p></div>
              </Link>)}</div>
            </>}
            {subject.books?.length && !subject.videos.length && !subject.lessons.length ? null : <>
            {subject.videos.length ? <>
              <div className="library-section-heading"><h2>فيديوهات تفاعلية</h2><span role="status">{number(subject.videos.length)} فيديو</span></div>
              <div className="library-grid">{subject.videos.map(item => <Link key={item.id || item.code} to={item.to} className="library-subject">
                <div className="library-thumbnail"><img src={item.poster ? `${import.meta.env.BASE_URL}${item.poster}` : thumbnail} alt="" loading="lazy" width="960" height="540" /><span className="library-play" aria-hidden="true"><Play size={23} fill="currentColor" /></span></div>
                <div className="library-card-body"><span className="library-eyebrow">فيديو بأسئلة تفاعلية</span><h2>{item.title}<ChevronLeft size={20} className="library-card-arrow" aria-hidden="true" /></h2><p>{item.summary}</p></div>
              </Link>)}</div>
            </> : <section className="library-empty"><Video size={34} /><h2>لا توجد فيديوهات متاحة لهذه المادة حاليًا.</h2><p>يمكنك الاستفادة من الدروس التفاعلية المتاحة أدناه.</p></section>}
            <div className="library-section-heading"><h2>الدروس التفاعلية المتاحة</h2><span role="status">{number(lessons.length)} درس</span></div>
            <div className="library-grid">{lessons.map(item => <Link key={item.code} to={item.to} className="library-subject">
              <div className="library-thumbnail"><img src={thumbnail} alt="" loading="lazy" width="960" height="540" /><span className="library-play" aria-hidden="true"><BookOpen size={23} /></span></div>
              <div className="library-card-body"><span className="library-eyebrow">شرح وتطبيق تفاعلي</span><h2>{item.title}<ChevronLeft size={20} className="library-card-arrow" aria-hidden="true" /></h2><p>افتح الدرس واستكشف الشرح والأمثلة والرسوم البيانية.</p></div>
            </Link>)}</div>
            {!lessons.length && <p className="library-no-results" role="status">لا توجد دروس مطابقة لبحثك.</p>}
            </>}
          </> : <div className="library-empty" role="status"><SearchX size={34} /><h2>هذه المادة غير متاحة حاليًا.</h2><p>ارجع للمكتبة لاختيار إحدى المواد المتاحة.</p></div>}
        </main>
      </div>
    </div>
  </div>;
}
