import { readFileSync } from "node:fs";
import { numericAnswer, diagramSpecs } from "../../shared/mathUnit.js";
import { reviewedDefinitions } from "../data/unit1Definitions.js";

const numeric = (id, prompt, answer, explanation, source) => ({
  id,
  kind: "number",
  prompt,
  answer,
  explanation,
  source,
});
const choice = (id, prompt, options, correct, explanation, source) => ({
  id,
  kind: "choice",
  prompt,
  options,
  correct,
  explanation,
  source,
});
const activities = {
  "1-1": [
    numeric(
      "delta-x",
      "في مثال ١: تتغير س من −١ إلى ٢. احسب Δس.",
      3,
      "Δس = ٢ − (−١) = ٣.",
      "examples:1",
    ),
    numeric(
      "delta-y",
      "للاقتران ق(س) = س³ − ٥س + ٣، احسب Δص من −١ إلى ٢.",
      -6,
      "ق(−١) = ٧، وق(٢) = ١؛ إذن Δص = ١ − ٧ = −٦.",
      "examples:1",
    ),
    numeric(
      "rate",
      "احسب متوسط تغير ق(س) = س³ − ٥س + ٣ من −١ إلى ٢.",
      -2,
      "متوسط التغير = Δص / Δس = −٦ / ٣ = −٢.",
      "examples:1",
    ),
    choice(
      "secant",
      "ماذا يمثل متوسط التغير هندسياً؟",
      ["ميل القاطع بين نقطتين", "مساحة تحت المنحنى", "قيمة الاقتران عند نقطة"],
      0,
      "متوسط التغير يساوي ميل القاطع بين نقطتي الفترة.",
      "definitions:1",
    ),
  ],
  "1-2": [
    numeric(
      "constant",
      "إذا كان ق(س) = ٥، فما قيمة ق′(س)؟",
      0,
      "مشتقة الاقتران الثابت تساوي صفراً.",
      "examples:1",
    ),
    numeric(
      "cos-constant",
      "إذا كان ق(س) = جتا π، فما قيمة ق′(س)؟",
      0,
      "جتا π ثابت يساوي −١، ومشتقة الثابت صفر.",
      "examples:1",
    ),
    choice(
      "power",
      "أي قاعدة صحيحة لاشتقاق س^ن؟",
      ["ن س^(ن−١)", "س^(ن−١)", "ن س^ن"],
      0,
      "نضرب بمعامل الأس، ثم ننقص الأس واحداً.",
      "definitions:5",
    ),
    choice(
      "product",
      "ما قاعدة مشتقة حاصل ضرب ق في هـ؟",
      ["ق′هـ + قهـ′", "ق′هـ′", "ق′ + هـ′"],
      0,
      "نشتق الأول ونبقي الثاني، ثم نضيف الأول مضروباً في مشتقة الثاني.",
      "definitions:4",
    ),
  ],
  "1-3": [
    numeric(
      "trig-product",
      "ق(س) = س جا س. احسب ق′(π/٢).",
      1,
      "ق′(س) = جا س + س جتا س؛ عند π/٢ نحصل على ١.",
      "examples:1",
    ),
    choice(
      "sine",
      "ما مشتقة جا س بالنسبة إلى س بالراديان؟",
      ["جتا س", "−جتا س", "قا² س"],
      0,
      "مشتقة جا س هي جتا س عندما تقاس الزاوية بالراديان.",
      "definitions:0",
    ),
    choice(
      "quotient",
      "ق(س) = س² / جتا س. اختر ق′(س).",
      [
        "(٢س جتا س + س² جا س) / جتا² س",
        "٢س / (−جا س)",
        "(٢س جتا س − س² جا س) / جتا² س",
      ],
      0,
      "بقاعدة القسمة: مشتقة المقام −جا س، فتتحول إشارة الطرح إلى جمع. المقام غير صفر.",
      "examples:2",
    ),
  ],
  "1-4": [
    numeric(
      "sine-limit",
      "احسب نهاية جا س / س عندما س تقترب من صفر.",
      1,
      "الصورة ٠/٠؛ بتطبيق لوبيتال تصبح جتا س / ١، ونهايتها ١.",
      "examples:1",
    ),
    numeric(
      "quadratic-limit",
      "احسب نهاية (س² − ٤) / (س − ٢) عندما س تقترب من ٢.",
      4,
      "الصورة ٠/٠؛ مشتقة البسط ٢س ومشتقة المقام ١، فتكون النهاية ٤.",
      "examples:2",
    ),
    numeric(
      "cos-limit",
      "احسب نهاية (١ − جتا س) / س² عندما س تقترب من صفر.",
      0.5,
      "نطبق لوبيتال مرتين: جا س / ٢س ثم جتا س / ٢؛ النهاية ١/٢.",
      "examples:3",
    ),
    choice(
      "lhopital",
      "قبل تطبيق لوبيتال، أي شرط يجب التحقق منه؟",
      [
        "صورة غير معينة ٠/٠ أو ∞/∞ وشروط الاشتقاق",
        "أن يكون البسط صفراً فقط",
        "أن تكون النهاية موجودة مسبقاً",
      ],
      0,
      "لا نشتق أي كسر عشوائياً؛ نتحقق من الصورة غير المعينة وشروط القاعدة في جوار النقطة.",
      "definitions:0",
    ),
  ],
  "1-5": [
    numeric(
      "slope",
      "ق(س) = س³ + ٥س. احسب ميل المنحنى عند س = ١.",
      8,
      "ق′(س) = ٣س² + ٥، ولذلك ق′(١) = ٨.",
      "examples:1",
    ),
    numeric(
      "normal",
      "للمثال نفسه، احسب ميل العمودي على المماس عند س = ١.",
      -0.125,
      "ميل العمودي هو السالب المقلوب: −١/٨.",
      "examples:1",
    ),
    numeric(
      "traffic",
      "للطريق ص = ٤س² + ٤س عند (١،٨)، يقع الضوء على المماس عند س=٢. احسب ص.",
      20,
      "الميل ١٢، ومعادلة المماس ص−٨ = ١٢(س−١)، وعند س=٢ تكون ص=٢٠.",
      "examples:0",
    ),
    numeric(
      "height",
      "ارتفاع جسم ف(ن) = ٢٠ن − ٥ن². ما أقصى ارتفاع بالأمتار؟",
      20,
      "السرعة ٢٠−١٠ن تساوي صفراً عند ن=٢، والارتفاع ف(٢)=٢٠ متراً.",
      "examples:7",
    ),
  ],
  "1-6": [
    numeric(
      "composition",
      "هـ(س)=س². احسب (هـ ∘ هـ)′(٢).",
      32,
      "هـ(هـ(س)) = س⁴؛ مشتقته ٤س³، وقيمتها عند ٢ هي ٣٢.",
      "examples:1",
    ),
    numeric(
      "parametric",
      "ص=ع²−٥ع، ع=١/(س+١). احسب دص/دس عند س=٠.",
      3,
      "ع=١، دص/دع=−٣، دع/دس=−١؛ حاصل الضرب ٣.",
      "examples:2",
    ),
    numeric(
      "chain-tangent",
      "ص=س ق(س²+١)، ق(٥)=−١، ق′(٥)=٣. احسب ميل المماس عند س=٢.",
      23,
      "ص′=ق(س²+١)+٢س²ق′(س²+١)؛ عند ٢ نحصل على −١+٢٤=٢٣.",
      "examples:3",
    ),
    choice(
      "chain-rule",
      "ما مشتقة (س²+١)³؟",
      ["٦س(س²+١)²", "٣(س²+١)²", "٦س²(س²+١)"],
      0,
      "نشتق الخارج ثم نضرب بمشتقة الداخل ٢س.",
      "definitions:0",
    ),
  ],
  "1-7": [
    numeric(
      "implicit-slope",
      "س²+ص²+١=٤س−ص. احسب دص/دس عند (١،١).",
      2 / 3,
      "٢س+٢ص ص′=٤−ص′، إذن ص′=(٤−٢س)/(٢ص+١)=٢/٣.",
      "examples:1",
    ),
    choice(
      "implicit-square",
      "ما مشتقة ص² بالنسبة إلى س إذا كانت ص تعتمد على س؟",
      ["٢ص دص/دس", "٢ص", "٢س"],
      0,
      "نستخدم قاعدة السلسلة: مشتقة ص² هي ٢ص مضروبة في دص/دس.",
      "definitions:0",
    ),
    numeric(
      "cube-limit",
      "احسب نهاية (∛(س+٧)−٢)/(س−١) عندما س تقترب من ١.",
      1 / 12,
      "بلوبيتال: مشتقة الجذر التكعيبي هي ١/[٣(س+٧)^(٢/٣)]؛ عند ١ نحصل على ١/١٢.",
      "examples:6",
    ),
  ],
};

export const unitLessons = Array.from({ length: 7 }, (_, i) => {
  const code = `1-${i + 1}`;
  const source = JSON.parse(
    readFileSync(
      new URL(`../../src/data/lectures/lesson-${code}.json`, import.meta.url),
      "utf8",
    ),
  );
  return {
    ...source,
    definitions: reviewedDefinitions[code] || source.definitions,
    activities: activities[code],
    diagram: diagramSpecs[code],
  };
});
export const publicUnitLesson = (code) => {
  const lesson = unitLessons.find((l) => l.code === code);
  if (!lesson) return null;
  return {
    ...lesson,
    activities: lesson.activities.map(
      ({ answer, correct, explanation, ...a }) => a,
    ),
  };
};
export function gradeUnitAnswer(code, id, answer) {
  const activity = unitLessons
    .find((l) => l.code === code)
    ?.activities.find((a) => a.id === id);
  if (!activity || typeof answer !== "string" || answer.length > 80)
    return null;
  const parsed =
    activity.kind === "number"
      ? numericAnswer(answer)
      : /^\d$/.test(answer)
        ? Number(answer)
        : null;
  if (
    parsed === null ||
    (activity.kind === "choice" && !activity.options[parsed])
  )
    return null;
  const correct =
    activity.kind === "number"
      ? Math.abs(parsed - activity.answer) <=
        1e-8 * Math.max(1, Math.abs(activity.answer))
      : parsed === activity.correct;
  return { correct, explanation: activity.explanation };
}
