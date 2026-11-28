// What NIPRAS really has for each study-plan lesson (shared/studyPlanCatalog.js),
// by plan activity: explanation, example, practice, quiz, summary. The study plan
// links its cards here; a lesson or activity missing from this list stays a preview.
//
// kinds: video · lesson (interactive lesson) · book (interactive book page) · quiz

const book = (page, title, tryId) => ({ kind: "book", title, to: `/book/physics?page=${page}${tryId ? `&try=${tryId}` : ""}` });

export const studyResources = {
  // الرياضيات · التفاضل والتكامل · متوسط التغير
  "math-u1-l1": {
    explanation: [
      { kind: "video", title: "فيديو: متوسط التغير — رحلة سامي على المنحنى", to: "/interactive/1-1-stickman", poster: "lectures/1-1-stickman/poster.jpg", note: "٤ دقائق، يتوقف لأسئلة بعد كل فكرة" },
      { kind: "lesson", title: "الدرس التفاعلي: متوسط التغير", to: "/lesson/1-1" }
    ],
    example: [{ kind: "lesson", title: "درس الشرائح: مثال ١ خطوة بخطوة", to: "/lesson/1-1" }, { kind: "lesson", title: "الكتاب التفاعلي: أمثلة الدرس", to: "/lesson-book/1-1" }],
    practice: [{ kind: "lesson", title: "الوحدة الأولى كاملة: أنشطة وتمارين متوسط التغير", to: "/math-unit" }],
    quiz: [{ kind: "quiz", title: "اختبار: متوسط التغير — ضع دائرة (١٠ أسئلة)", to: "/quizzes?quiz=rate-of-change" }],
    summary: [{ kind: "lesson", title: "الكتاب التفاعلي: تعريف متوسط التغير وقانونه", to: "/lesson-book/1-1" }]
  },
  // الفيزياء · التيار الكهربائي · المقاومة والقوة الدافعة الكهربائية
  "physics-u4-l1": {
    explanation: [book(58, "الكتاب التفاعلي: التيار الكهربائي (صفحة ٥٨)"), book(62, "الكتاب التفاعلي: المقاومة وقانون أوم (صفحة ٦٢)")],
    example: [book(74, "الكتاب التفاعلي: مثال (1) على القوة الدافعة (صفحة ٧٤)", "example1")],
    practice: [book(58, "تجربة: إضاءة مصباح كهربائي (نشاط 4-1)", "lamp"), book(62, "تجربة: دارة لإيجاد مقاومة سلك (نشاط 4-2)", "ohm"), book(64, "تجربة: منحنى المقاومة الأومية واللاأومية", "iv")],
    summary: [book(64, "الكتاب التفاعلي: المقاومة الأومية واللاأومية (صفحة ٦٤)")]
  },
  // الفيزياء · التيار الكهربائي · الدارة البسيطة والقدرة الكهربائية
  "physics-u4-l2": {
    explanation: [book(74, "الكتاب التفاعلي: القوة الدافعة والدارة البسيطة (صفحة ٧٤)")],
    example: [book(74, "الكتاب التفاعلي: مثال (1) — شغّل الدارة وقِس التيارات", "example1")],
    practice: [book(59, "تجربة: التيار الاصطلاحي وحركة الإلكترونات", "conventional")]
  },
  // الفيزياء · التيار الكهربائي · توصيل المقاومات وقاعدتا كيرشوف
  "physics-u4-l3": {
    explanation: [book(68, "الكتاب التفاعلي: طرق توصيل المقاومات (صفحة ٦٨)"), book(84, "الكتاب التفاعلي: قانونا كيرشوف (صفحة ٨٤)")],
    example: [book(69, "الكتاب التفاعلي: مثال (8) على المقاومة المكافئة", "example8"), book(85, "الكتاب التفاعلي: مثال (10) على كيرشوف", "example10")],
    practice: [book(68, "تجربة: التوصيل على التوالي والتوازي (نشاط 4-4)", "series"), book(84, "تجربة: القانون الأول لكيرشوف (نشاط 5-1)", "kirchhoff1"), book(85, "تجربة: القانون الثاني لكيرشوف (نشاط 5-2)", "kirchhoff2"), book(82, "تجربة: قنطرة ويتستون", "wheatstone")],
    quiz: [book(69, "سؤال: احسب المقاومة المكافئة (صفحة ٦٩)", "question69")]
  }
};

export const resourcesFor = (lessonId, activityId) => studyResources[lessonId]?.[activityId] || [];
