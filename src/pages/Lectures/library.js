import { lesson } from "../../data/mockLesson.js";

// Only published, working content is listed. The interactive lesson is not a video.
export const subjects = [{
  id: "math", name: lesson.subject,
  description: "تعلّم المفاهيم الرياضية من خلال الشرح، والرسوم البيانية، والأمثلة التفاعلية من الكتاب.",
  // Lessons NIPRAS made itself: a video that stops for questions as it explains.
  videos: [{
    id: "1-1-stickman", code: "1-1", title: "متوسط التغير — رحلة سامي على المنحنى",
    to: "/interactive/1-1-stickman", poster: "lectures/1-1-stickman/poster.jpg",
    summary: "مثال واحد من الكتاب بأربع دقائق، مع ٦ أسئلة بتوقّف الفيديو بعد كل فكرة."
  }],
  lessons: [{ code: lesson.code, title: lesson.title, to: `/lesson/${lesson.code}` }]
}, {
  id: "physics", name: "الفيزياء",
  description: "اقرأ صفحات كتاب الفيزياء نفسها، واضغط على أي شكل لتشتغل التجربة عليه: دارات، أميترات، قنطرة ويتستون، وقانونا كيرتشوف.",
  videos: [], lessons: [],
  // Books students read page by page, with the figures working in place.
  books: [{
    id: "physics-unit2", title: "الوحدة الثانية: الكهرباء المتحركة", to: "/book/physics", cover: "books/physics/unit2/p072.webp",
    summary: "عشر صفحات من الكتاب، فيها 15 تجربة تفاعلية تشتغل على الشكل نفسه، وصفحة التجربة بنفس تصميم الكتاب.", experiments: 15
  }]
}];
const normalize = value => String(value || "").trim().toLocaleLowerCase("ar").replace(/[\u064b-\u065f\u0670]/g, "").replace(/[أإآ]/g, "ا");
const matches = (text, query) => normalize(text).includes(normalize(query));
export const filterSubjects = query => subjects.filter(subject => matches(subject.name, query) || [...subject.lessons, ...subject.videos, ...(subject.books || [])].some(item => matches(item.title, query)));
export const filterLessons = (subject, query) => subject.lessons.filter(item => matches(subject.name, query) || matches(item.title, query));
