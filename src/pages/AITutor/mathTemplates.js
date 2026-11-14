// The "معادلة" menu, written as the Palestinian Tawjihi textbook prints each
// form. Each becomes an editable box in the question. `insert` is MathLive
// LaTeX: #? is a slot to fill and #@ takes what was typed before the caret.
// `label` is LaTeX for KaTeX.
const word = (text) => String.raw`\text{${text}}`;
const template = (id, name, label, insert = label) => ({ id, name, label, insert });
const trig = (name) => template(name, name, word(name), `${word(name)}#?`);

export const mathTemplates = [
  template("fraction", "كسر", String.raw`\frac{\square}{\square}`, String.raw`\frac{#@}{#?}`),
  template("root", "جذر", String.raw`\sqrt{\square}`, String.raw`\sqrt{#?}`),
  template("power", "أس", String.raw`\square^{\square}`, "#@^{#?}"),
  template("limit", "نهاية", word("نهـــا"), String.raw`\mathop{${word("نهـــا")}}\limits_{س\leftarrow #?}#?`),
  template("integral", "تكامل", String.raw`\int\square\,${word("دس")}`, String.raw`\int #?\,${word("دس")}`),
  template("definite", "تكامل محدود", String.raw`\int\limits_{\square}^{\square}`, String.raw`\int\limits_{#?}^{#?} #?\,${word("دس")}`),
  template("derivative", "مشتقة", String.raw`\frac{${word("د ص")}}{${word("د س")}}`),
  template("second-derivative", "مشتقة ثانية", String.raw`\frac{${word("د")}^٢${word("ص")}}{${word("د س")}^٢}`),
  template("prime", "ق مشتقة", `${word("قَ")}(س)`),
  template("second-prime", "ق مشتقة ثانية", `${word("قً")}(س)`),
  template("sum", "مجموع", String.raw`\sum\limits_{ر=١}^{ن}`, String.raw`\sum\limits_{ر=#?}^{#?} #?`),
  template("function", "اقتران", "ق(س)"),
  trig("جا"), trig("جتا"), trig("ظا"), trig("قا"), trig("قتا"), trig("ظتا"),
  template("ln", "لو الطبيعي", `${word("لو")}_${word("هـ")}`, `${word("لو")}_${word("هـ")}#?`),
  template("log", "لو", word("لو"), `${word("لو")}_{#?}#?`),
  template("exp", "هـ أس", `${word("هـ")}^س`, `${word("هـ")}^{#?}`),
  template("abs", "قيمة مطلقة", "|س|", "|#?|"),
  template("pi", "باي", String.raw`\pi`),
  template("infinity", "ما لا نهاية", String.raw`\infty`)
];
