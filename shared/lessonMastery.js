// How a student's answers to in-video questions turn into mastery of a lesson,
// and how that mastery adjusts the lesson's study activities. Shared by the API
// (which stores answers and generates plans) and the site (which shows them).
//
// Only first attempts count: a second try at the same question says little
// about what the student knew when the video stopped.

export const masteryRules = {
  version: "nipras-mastery-1",
  minAnswers: 3,      // fewer first answers than this is not enough to judge
  weakBelow: 0.5,     // under half right: more practice and a review of the mistakes
  strongFrom: 0.85,   // nearly all right: a quick review instead of the full lesson
  practiceBoost: 0.5, // weak: practice and quiz grow by this share
  reviewCut: 0.5      // strong: explanation and worked example shrink by this share
};

export const masteryLabels = { weak: "يحتاج تقوية", steady: "متوسط", strong: "متقن" };

// results: the stored first answers for one lesson, [{ checkpointId, skill, correct }].
export function lessonMastery(results = []) {
  const answered = results.length;
  const correct = results.filter((r) => r.correct).length;
  const share = answered ? correct / answered : null;
  const level = answered < masteryRules.minAnswers ? null
    : share < masteryRules.weakBelow ? "weak"
    : share >= masteryRules.strongFrom ? "strong" : "steady";
  const weakSkills = [...new Set(results.filter((r) => !r.correct && r.skill).map((r) => r.skill))];
  return { answered, correct, share, level, weakSkills };
}

// The summary stored with a generated plan, so a later answer can mark it stale.
export const masterySnapshot = (byLesson, lessonIds) => Object.fromEntries(lessonIds
  .filter((id) => byLesson?.[id]?.answered)
  .map((id) => [id, { answered: byLesson[id].answered, correct: byLesson[id].correct }]));

export function masteryChanged(snapshot = {}, byLesson = {}, lessonIds = []) {
  const now = masterySnapshot(byLesson, lessonIds);
  const ids = new Set([...Object.keys(snapshot || {}), ...Object.keys(now)]);
  return [...ids].some((id) => snapshot?.[id]?.answered !== now[id]?.answered || snapshot?.[id]?.correct !== now[id]?.correct);
}

// Whole minutes stay whole: the change is rounded and never empties an activity.
const scale = (minutes, factor) => Math.max(2, Math.round(minutes * factor));

export function adaptActivities(activities, mastery) {
  if (!mastery?.level || mastery.level === "steady") return activities;
  if (mastery.level === "weak") {
    const review = mastery.weakSkills.length ? ` راجع بالذات: ${mastery.weakSkills.join("، ")}.` : "";
    return activities.map((a) => ["practice", "quiz"].includes(a.id)
      ? { ...a, minutes: scale(a.minutes, 1 + masteryRules.practiceBoost), guidance: `${a.guidance}${review}`, adapted: "weak" }
      : a);
  }
  return activities.map((a) => ["explanation", "example"].includes(a.id)
    ? { ...a, minutes: scale(a.minutes, 1 - masteryRules.reviewCut), guidance: `مراجعة سريعة: أتقنت هذا الدرس في أسئلة الفيديو. ${a.guidance}`, adapted: "strong" }
    : a);
}

// Stored LessonResult documents → { lessonId: lessonMastery(...) }.
export const masteryByLesson = (results = []) => Object.fromEntries(results.map((r) => [r.lessonId, lessonMastery(r.answers)]));
