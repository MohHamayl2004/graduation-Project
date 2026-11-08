import { lesson } from "../../data/mockLesson.js";

// Only published, working content is listed. The interactive lesson is not a video.
export const subjects = [{
  id: "math", name: lesson.subject,
  description: "تعلّم المفاهيم الرياضية من خلال الشرح، والرسوم البيانية، والأمثلة التفاعلية من الكتاب.",
  videos: [],
  lessons: [{ code: lesson.code, title: lesson.title, to: `/lesson/${lesson.code}` }]
}];
const normalize = value => String(value || "").trim().toLocaleLowerCase("ar").replace(/[\u064b-\u065f\u0670]/g, "").replace(/[أإآ]/g, "ا");
const matches = (text, query) => normalize(text).includes(normalize(query));
export const filterSubjects = query => subjects.filter(subject => matches(subject.name, query) || [...subject.lessons, ...subject.videos].some(item => matches(item.title, query)));
export const filterLessons = (subject, query) => subject.lessons.filter(item => matches(subject.name, query) || matches(item.title, query));
