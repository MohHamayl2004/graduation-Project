// Ten pages of unit 2 (الكهرباء المتحركة) of the Palestinian grade-12 physics
// book, shown as the printed pages. Each hotspot marks a figure or activity on
// the page; clicking it brings that figure to life in place.
//
// `rect` is in PDF points of the page (581.1 × 751.2), the same box the figure
// occupies in the book, so the overlay covers the printed drawing exactly.
import * as circuits from "./physicsUnit2Circuits.js";

export const PAGE_SIZE = [581.1, 751.18];

export const physicsUnit2 = {
  id: "physics-unit2",
  title: "الفيزياء · الوحدة الثانية: الكهرباء المتحركة",
  source: "كتاب الفيزياء للصف الثاني عشر — وزارة التربية والتعليم الفلسطينية، طبعة 2018/2019",
  pages: [
    { pdfPage: 62, bookPage: 58, image: "books/physics/unit2/p062.webp", title: "التيار الكهربائي", hotspots: [
      { id: "lamp", kind: "lamp", rect: [57, 204, 231, 307], label: "نشاط (4-1): إضاءة مصباح كهربائي" }
    ] },
    { pdfPage: 63, bookPage: 59, image: "books/physics/unit2/p063.webp", title: "شدة التيار والتيار الاصطلاحي", hotspots: [
      { id: "conventional", kind: "conventional", rect: [74, 173, 186, 254], circuit: "lampLoop", label: "التيار الاصطلاحي وحركة الإلكترونات" },
      { id: "ranking", kind: "ranking", rect: [57, 533, 267, 599], label: "سؤال: رتّب المقاطع حسب شدة التيار" }
    ] },
    { pdfPage: 66, bookPage: 62, image: "books/physics/unit2/p066.webp", title: "المقاومة الكهربائية وقانون أوم", hotspots: [
      { id: "ohm", kind: "ohmLab", noZoom: true, rect: [78, 213, 524, 235], circuit: "ohmLab", label: "نشاط (4-2): صمّم دارة لإيجاد مقاومة سلك" },
      { id: "drift", kind: "drift", rect: [57, 505, 245, 629], label: "نشاط (4-3): كثافة التيار" }
    ] },
    { pdfPage: 68, bookPage: 64, image: "books/physics/unit2/p068.webp", title: "المقاومة الأومية واللاأومية", hotspots: [
      { id: "iv", kind: "ivCurves", rect: [120, 467, 476, 599], label: "شكل (4-3): منحنى التيار والجهد" }
    ] },
    { pdfPage: 72, bookPage: 68, image: "books/physics/unit2/p072.webp", title: "طرق توصيل المقاومات", hotspots: [
      { id: "series", kind: "resistors", mode: "series", rect: [57, 391, 245, 479], circuit: "series", label: "نشاط (4-4): التوصيل على التوالي" },
      { id: "parallel", kind: "resistors", mode: "parallel", rect: [57, 541, 186, 647], circuit: "parallel", label: "نشاط (4-4): التوصيل على التوازي" }
    ] },
    { pdfPage: 73, bookPage: 69, image: "books/physics/unit2/p073.webp", title: "المقاومة المكافئة", hotspots: [
      { id: "example8", kind: "equivalent", rect: [57, 248, 205, 349], circuit: "example8", answer: 16, solved: true, label: "مثال (8): تحقّق من الحل",
        steps: ["6 Ω و 3 Ω على التوازي: 1/R = 1/3 + 1/6 ← R = 2 Ω", "2 Ω مع 4 Ω و 10 Ω على التوالي: R = 2 + 4 + 10 = 16 Ω"] },
      { id: "question69", kind: "equivalent", rect: [57, 396, 205, 521], circuit: "question69", answer: 2, label: "سؤال: احسب المقاومة المكافئة",
        steps: ["1 Ω و 2 Ω (العلوية) على التوالي = 3 Ω", "3 Ω مع 6 Ω على التوازي = 2 Ω", "2 Ω مع 2 Ω (اليمنى) على التوالي = 4 Ω", "4 Ω مع 4 Ω (السفلية) على التوازي = 2 Ω"] }
    ] },
    { pdfPage: 78, bookPage: 74, image: "books/physics/unit2/p078.webp", title: "القوة الدافعة والدارة البسيطة", hotspots: [
      { id: "example1", kind: "live", rect: [57, 495, 212, 605], circuit: "example1", label: "مثال (1): شغّل الدارة وقِس التيارات",
        checks: [
          { label: "التيار الكلي I", book: 2, bookText: "2 A", unit: "A", get: (s) => s.current.battery },
          { label: "تيار 4 Ω", book: 1.5, bookText: "1.5 A", unit: "A", get: (s) => s.current.R4 },
          { label: "تيار 48 Ω", book: 1 / 8, bookText: "1/8 A", unit: "A", get: (s) => s.current.R48 },
          { label: "تيار 16 Ω", book: 3 / 8, bookText: "3/8 A", unit: "A", get: (s) => s.current.R16 }
        ] }
    ] },
    { pdfPage: 86, bookPage: 82, image: "books/physics/unit2/p086.webp", title: "قنطرة ويتستون", hotspots: [
      { id: "wheatstone", kind: "wheatstone", rect: [57, 259, 205, 404], circuit: "wheatstone", label: "قنطرة ويتستون: اتزن القنطرة وجد Rx" }
    ] },
    { pdfPage: 88, bookPage: 84, image: "books/physics/unit2/p088.webp", title: "القانون الأول لكيرتشوف", hotspots: [
      { id: "kirchhoff1", kind: "kirchhoff1", rect: [57, 171, 208, 290], circuit: "kirchhoff1", label: "نشاط (5-1): القانون الأول لكيرتشوف" }
    ] },
    { pdfPage: 89, bookPage: 85, image: "books/physics/unit2/p089.webp", title: "القانون الثاني لكيرتشوف", hotspots: [
      { id: "kirchhoff2", kind: "kirchhoff2", rect: [57, 216, 175, 327], circuit: "kirchhoff2", label: "نشاط (5-2): القانون الثاني لكيرتشوف" },
      { id: "example10", kind: "live", rect: [57, 398, 205, 492], circuit: "example10", label: "مثال (10): تحقّق من الحل بالدارة نفسها",
        readingOffset: { R10left: 0, R20: -0.1, R10top: -0.12, R30: 0.1 },
        checks: [
          { label: "I (في 10 Ω و 20 Ω)", book: 2 / 3, bookText: "2/3 A", unit: "A", get: (s) => s.current.R10left },
          { label: "I₁ (في 30 Ω)", book: 2 / 3, bookText: "2/3 A", unit: "A", get: (s) => s.current.R30 },
          { label: "I₂ (في بطارية 20 V)", book: 0, bookText: "0", unit: "A", get: (s) => s.current.E20 },
          { label: "Vag", book: 40, bookText: "40 V", unit: "V", get: (s) => s.voltage.a - s.voltage.g }
        ] }
    ] }
  ]
};

export const circuitFor = (hotspot) => (hotspot.circuit ? circuits[hotspot.circuit] : null);
