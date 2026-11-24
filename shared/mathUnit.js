// Numeric answers only: never evaluate student or model-authored expressions.
export function numericAnswer(input) {
  if (typeof input !== "string" || input.length > 80) return null;
  const s = input
    .trim()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[−–]/g, "-")
    .replace(/٫/g, ".");
  const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  if (!new RegExp(`^${number}(?:\\s*/\\s*${number})?$`).test(s)) return null;
  const parts = s.split("/").map(Number),
    value = parts.length === 2 ? parts[0] / parts[1] : parts[0];
  return Number.isFinite(value) ? value : null;
}

export const diagramSpecs = {
  "1-1": {
    formula: "f(x) = x³ − 5x + 3",
    min: -2,
    max: 2,
    label: "متوسط التغير وميل القاطع",
    initial: -1,
    second: 2,
  },
  "1-2": {
    formula: "f(x) = x² ; f′(x) = 2x",
    min: -3,
    max: 3,
    label: "مشتقة القوة وميل المماس",
    initial: 1,
  },
  "1-3": {
    formula: "f(x) = x sin(x)",
    min: -3,
    max: 3,
    label: "مشتقة حاصل الضرب بالراديان",
    initial: Math.PI / 2,
  },
  "1-4": {
    formula: "sin(h) / h → 1",
    min: 0.01,
    max: 2,
    label: "استكشاف نهاية جا هـ على هـ",
    initial: 1,
  },
  "1-5": {
    formula: "f(x) = x³ + 5x",
    min: -2,
    max: 2,
    label: "المماس والعمودي على المنحنى",
    initial: 1,
  },
  "1-6": {
    formula: "f(x) = (x² + 1)³",
    min: -1.5,
    max: 1.5,
    label: "الاقتران المركب وقاعدة السلسلة",
    initial: 0.5,
  },
  "1-7": {
    formula: "x² + y² + 1 = 4x − y",
    min: 0.2,
    max: 3.8,
    label: "المماس لمنحنى العلاقة الضمنية",
    initial: 1,
  },
};
export function diagramState(code, x, second = 2) {
  let f, derivative;
  switch (code) {
    case "1-1":
      f = (t) => t ** 3 - 5 * t + 3;
      derivative = (t) => 3 * t * t - 5;
      break;
    case "1-2":
      f = (t) => t * t;
      derivative = (t) => 2 * t;
      break;
    case "1-3":
      f = (t) => t * Math.sin(t);
      derivative = (t) => Math.sin(t) + t * Math.cos(t);
      break;
    case "1-4":
      f = (t) => (t === 0 ? 1 : Math.sin(t) / t);
      derivative = (t) =>
        t === 0 ? 0 : (t * Math.cos(t) - Math.sin(t)) / (t * t);
      break;
    case "1-5":
      f = (t) => t ** 3 + 5 * t;
      derivative = (t) => 3 * t * t + 5;
      break;
    case "1-6":
      f = (t) => (t * t + 1) ** 3;
      derivative = (t) => 6 * t * (t * t + 1) ** 2;
      break;
    case "1-7":
      f = (t) => {
        const d = 1 - 4 * (t * t - 4 * t + 1);
        return d < 0 ? null : (-1 + Math.sqrt(d)) / 2;
      };
      derivative = (t) => {
        const y = f(t);
        return y === null || 2 * y + 1 === 0 ? null : (4 - 2 * t) / (2 * y + 1);
      };
      break;
    default:
      throw new Error("Unknown lesson diagram");
  }
  const y = f(x),
    value =
      code === "1-1"
        ? x === second
          ? null
          : (f(second) - y) / (second - x)
        : code === "1-4"
          ? f(x)
          : derivative(x);
  return { x, y, second, value, f, derivative };
}
