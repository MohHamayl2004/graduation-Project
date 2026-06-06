export const initialStudyTasks = [
  {
    id: 1,
    title: "Review Organic Chemistry Fundamentals",
    priority: "HIGH",
    subject: "Chemistry",
    duration: "45m",
    done: false
  },
  {
    id: 2,
    title: "Calculus II: AI Tutor Drill",
    priority: "MEDIUM",
    subject: "Math",
    duration: "30m",
    done: false
  },
  {
    id: 3,
    title: "Arabic Literature Poem Analysis",
    priority: "Completed",
    subject: "Arabic",
    duration: "25m",
    done: true
  }
];

export const weeklyScheduleBlocks = {
  Mon: ["Arabic", "Physics", "AI Drill"],
  Tue: ["Math Quiz", "History"],
  Wed: ["AI Bio Review", "Eng"],
  Thu: ["Chem Quiz", "Math II"],
  Fri: ["Physics", "AI Lang"],
  Sat: ["Mock Exam"],
  Sun: []
};
