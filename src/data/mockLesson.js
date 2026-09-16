// ============================================================
// Lesson 1-1 · متوسط التغير  (Rate of Change)
//
// Real content, extracted from the ministry textbook and verified
// against the worked solution — see Nipras_Ai_Models/data/eval/
// gold_lesson1_page1.json.
//
// The curve points come from tracing the textbook's own graph;
// they check out against the two values the book states
// (ق(١)=٢ and ق(٣)=٥), so the "visual" layer shows the student
// the same curve their book does, not a redrawn approximation.
// ============================================================

export const lesson = {
  code: "1-1",
  unit: 1,
  number: 1,
  title: "متوسط التغير",
  titleEn: "Rate of Change",
  subject: "الرياضيات",
  progress: 40,

  // The four VARK presentations. Every one is available to every
  // student — the framework is used to vary presentation, not to
  // label a student and hide the rest from them.
  modes: [
    { id: "read", label: "اقرأ", en: "Read", icon: "BookOpen" },
    { id: "visual", label: "شاهد", en: "Visual", icon: "LineChart" },
    { id: "aural", label: "استمع", en: "Aural", icon: "Volume2" },
    { id: "kinesthetic", label: "جرّب", en: "Practice", icon: "MousePointerClick" }
  ],

  definition: {
    title: "تعريف متوسط التغير",
    body: [
      "إذا كان ص = ق(س) اقتراناً وتغيرت س من س₁ إلى س₂ ، حيث س₁ ≠ س₂ ، فإن:",
      "• التغير في س يساوي س₂ − س₁ ، ونرمز له بالرمز Δس ويُقرأ «دلتا س».",
      "• التغير في الاقتران ق(س) يساوي ق(س₂) − ق(س₁) ، ويرمز له بالرمز Δص.",
      "• متوسط التغير يساوي Δص ÷ Δس."
    ],
    formula: "Δص / Δس = ( ق(س₂) − ق(س₁) ) / ( س₂ − س₁ )"
  },

  example: {
    title: "مثال ١",
    statement: "إذا كان ص = ق(س) = س³ − ٥س + ٣ ، جد متوسط التغير عندما تتغير س من ⁻١ إلى ٢.",
    steps: [
      {
        id: "s1",
        math: "بما أن س₁ = ⁻١ ، س₂ = ٢ ، فإن Δس = س₂ − س₁ = ٣",
        speech: "بما أن س واحد تساوي سالب واحد، و س اثنين تساوي اثنين، فإن دلتا س تساوي ثلاثة."
      },
      {
        id: "s2",
        math: "Δص = ق(س₂) − ق(س₁) = ق(٢) − ق(⁻١) = ١ − ٧ = ⁻٦",
        speech: "دلتا ص تساوي ق من اثنين ناقص ق من سالب واحد، تساوي واحد ناقص سبعة، تساوي سالب ستة.",
        // The stuck points a teacher already knows students hit here.
        // Generated once, reviewed, then served to every student who
        // reports the same gap — no model call after the first.
        gaps: [
          {
            id: "seven",
            question: "من وين إجت الـ ٧ ؟",
            lead: "الـ ٧ هي قيمة الاقتران عند س = ⁻١ . نرجع للاقتران ونعوّض:",
            subject: "ق(س) = س³ − ٥س + ٣ ، نضع مكان كل «س» القيمة ⁻١",
            work: [
              ["(⁻١)³ = ⁻١", "الأس فردي، فالإشارة تبقى سالبة"],
              ["⁻٥ × (⁻١) = +٥", "سالب × سالب = موجب"],
              ["+٣", "يبقى كما هو"]
            ],
            result: "⁻١ + ٥ + ٣ = ٧",
            pitfall: "أكثر خطأ شائع: حساب (⁻١)³ كأنها +١ . الأس الفردي يحافظ على الإشارة.",
            speech:
              "الـ سبعة هي قيمة الاقتران عند س تساوي سالب واحد. نعوّض: سالب واحد تكعيب تساوي سالب واحد، لأن الأس فردي. وسالب خمسة في سالب واحد تساوي زائد خمسة. وزائد ثلاثة تبقى. المجموع سالب واحد زائد خمسة زائد ثلاثة يساوي سبعة.",
            alternate:
              "خلينا نجرّبها بطريقة ثانية — شوف الرسم البياني: النقطة عند س = ⁻١ مرتفعة، قيمتها ٧ . وعند س = ٢ نزلت إلى ١ . الفرق بينهما هو ما نسميه Δص."
          },
          {
            id: "minus",
            question: "ليش طرحنا مش جمعنا؟",
            lead: "لأن Δص معناها «مقدار التغيّر» — والتغيّر دائماً هو النهاية ناقص البداية:",
            subject: "Δص = القيمة عند النهاية − القيمة عند البداية",
            work: [
              ["النهاية: ق(٢) = ١", "س انتهت عند ٢"],
              ["البداية: ق(⁻١) = ٧", "س بدأت من ⁻١"],
              ["١ − ٧ = ⁻٦", "أي أن ص نقصت ٦ وحدات"]
            ],
            result: "Δص = ⁻٦",
            pitfall: "لو جمعنا لحصلنا على ٨ ، وهذا لا يعني شيئاً. الطرح هو ما يقيس التغيّر، والجمع يقيس المجموع.",
            speech:
              "دلتا ص معناها مقدار التغير، وهو دائماً النهاية ناقص البداية. النهاية ق من اثنين تساوي واحد، والبداية ق من سالب واحد تساوي سبعة. واحد ناقص سبعة يساوي سالب ستة.",
            alternate:
              "فكّر فيها كأنها كتلة: كنت ٧ كيلو وصرت ١ كيلو. التغيّر = ١ − ٧ = ⁻٦ ، أي نقصت ٦ . لو جمعت لطلع ٨ ، وهذا ليس وزنك ولا تغيّرك."
          },
          {
            id: "delta",
            question: "شو معنى Δص أصلاً؟",
            lead: "Δ حرف يوناني يُقرأ «دِلتا» ، ومعناه في الرياضيات: مقدار التغيّر.",
            subject: "Δص = التغيّر في ص   ·   Δس = التغيّر في س",
            work: [
              ["Δس = ٢ − (⁻١) = ٣", "س زادت ٣ وحدات"],
              ["Δص = ١ − ٧ = ⁻٦", "ص نقصت ٦ وحدات"]
            ],
            result: "فكأن Δ تسأل: كم تغيّر؟",
            pitfall: "Δ ليست عدداً يُضرب. Δس شيء واحد — لا تقرأها «دلتا × س».",
            speech:
              "دلتا حرف يوناني معناه مقدار التغير. دلتا س هي التغير في س، ودلتا ص هي التغير في ص.",
            alternate:
              "على الرسم: Δس هي المسافة الأفقية بين النقطتين، و Δص هي المسافة الرأسية بينهما. متوسط التغير هو ميل الخط الواصل بينهما."
          }
        ]
      },
      {
        id: "s3",
        math: "متوسط التغير = Δص / Δس = ⁻٦ / ٣ = ⁻٢",
        speech: "متوسط التغير يساوي دلتا ص على دلتا س، يساوي سالب ستة على ثلاثة، يساوي سالب اثنين."
      }
    ]
  },

  // Mid-lecture focus check. Pre-generated with the lesson.
  checkpoint: {
    prompt: "قبل ما نكمل — لو تغيرت س من ٠ إلى ٢ ، شو بيصير متوسط التغير؟",
    options: [
      { id: "a", text: "⁻١", correct: true, why: "ق(٠) = ٣ و ق(٢) = ١ ، فيكون (١ − ٣) ÷ ٢ = ⁻١" },
      { id: "b", text: "⁻٢", correct: false, why: "هذه نتيجة المثال السابق، من ⁻١ إلى ٢ . هنا البداية ٠ ." },
      { id: "c", text: "٢", correct: false, why: "الإشارة سالبة — ص نقصت ولم تزد." }
    ]
  },

  // Traced from the textbook's own figure (نشاط ٢) and checked
  // against the two values the book prints.
  curve: {
    caption: "مبيع شركة سيارات بالملايين خلال س شهراً",
    xLabel: "س (الشهر)",
    yLabel: "ص (المبيع بالملايين)",
    points: [
      [1, 2.0], [1.5, 2.39], [2, 3.11], [2.5, 3.86], [3, 4.86],
      [3.5, 5.21], [4, 5.8], [4.5, 6.19], [5, 5.32], [5.5, 3.84],
      [6, 3.05], [6.5, 3.12], [7, 4.09]
    ],
    verified: [
      { x: 1, y: 2, note: "يذكرها الكتاب" },
      { x: 3, y: 5, note: "يذكرها الكتاب" }
    ],

    // نشاط ٢ from the book. The textbook works the first part out and
    // leaves the second as a blank for the student — which is exactly
    // what the draggable graph is for.
    activity: {
      worked:
        "أراد عمر من الرسم إيجاد متوسط التغير في المبيع عندما تتغير س من ١ إلى ٣ ، فكتب: Δص / Δس = ( ق(٣) − ق(١) ) / ( ٣ − ١ ) = ( ٥ − ٢ ) / ٢ = ٣/٢",
      prompt: "والآن أكمل: متوسط التغير عندما تتغير س من ٣ إلى ٧ يساوي ...",
      hint: "حرّك النقطتين على الرسم إلى ٣ و ٧ ، واقرأ الناتج تحت الرسم.",
      answer: -0.19,
      tolerance: 0.35
    }
  }
};

export default lesson;
