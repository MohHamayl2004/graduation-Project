import catalog from "./mathInputCatalog.json" with { type: "json" };

// Same immutable catalog and deterministic text representation on client/server.
export const mathCategories = [...catalog.categories, {
  id: "integrals", labelAr: "التكامل", items: catalog.futureExtensions.map(item => ({ ...item,
    labelAr: `${item.labelAr} — خارج الوحدة الأولى`,
    fields: [...new Set([...item.insertText.matchAll(/\{(\w+)\}/g)].map(m => m[1]))] }))
}, { id: "extra-input", labelAr: "إدخال إضافي", items: [
  { id: "division-sign", labelAr: "÷ قسمة", insertText: "÷", fields: [] },
  { id: "custom-variable", labelAr: "متغير آخر", insertText: "{variable}", fields: ["variable"] }
] }, { id: "higher-derivatives", labelAr: "مشتقة برتبة تختارها", items: [
  { id: "derivative-order", labelAr: "مشتقة دالة بمتغير ورتبة محدّدة", insertText: "المشتقة من الرتبة {order} للدالة ({expression}) بالنسبة إلى {variable}", fields: ["expression", "variable", "order"] }
] }];
export const mathItems = mathCategories.flatMap(c => c.items);
export const quickMathIds = catalog.quickAccessIds;
export const mathItem = id => mathItems.find(item => item.id === id);
export const fieldLabels = { x: "قيمة س أو التعبير", y: "قيمة ص", index: "الرقم السفلي", expression: "الدالة أو التعبير", numerator: "البسط", denominator: "المقام", base: "الأساس", exponent: "الأس", degree: "رتبة الجذر", order: "رتبة الاشتقاق", variable: "المتغير", point: "القيمة", start: "البداية", end: "النهاية", time: "الزمن", firstExpression: "القاعدة الأولى", firstCondition: "شرط القاعدة الأولى", secondExpression: "القاعدة الثانية", secondCondition: "شرط القاعدة الثانية", function: "الاقتران المثلثي (جا، جتا…)", angle: "الزاوية", left: "الطرف الأيسر", right: "الطرف الأيمن", line: "معادلة المستقيم", lower: "الحد السفلي", upper: "الحد العلوي" };
export const westernDigits = text => String(text).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
const escapeText = text => String(text).replace(/[\\{}$%&#_^~]/g, c => ({ "\\": "\\textbackslash{}", "{": "\\{", "}": "\\}", "$": "\\$", "%": "\\%", "&": "\\&", "#": "\\#", "_": "\\_", "^": "\\textasciicircum{}", "~": "\\textasciitilde{}" }[c]));
export const latexText = text => `\\text{${escapeText(text)}}`;
const functions = { جا: "sin", جتا: "cos", ظا: "tan", ظتا: "cot", قا: "sec", قتا: "csc", sin: "sin", cos: "cos", tan: "tan", cot: "cot", sec: "sec", csc: "csc", ln: "ln", لو: "log", log: "log", لوهـ: "ln", لو_هـ: "ln", sqrt: "sqrt", cbrt: "cbrt" };
const functionTex = fn => fn === "ln" ? `\\operatorname{لو}_{${latexText("هـ")}}` : `\\operatorname{${({ sin: "جا", cos: "جتا", tan: "ظا", cot: "ظتا", sec: "قا", csc: "قتا", log: "لو" })[fn] || fn}}`;
const symbols = { "π": "\\pi", "∞": "\\infty", "Δ": "\\Delta", "∈": "\\in", "⊆": "\\subseteq", "≤": "\\le", "≥": "\\ge", "≠": "\\ne", "≈": "\\approx", "±": "\\pm", "′": "'", "″": "''", "‴": "'''", "°": "^{\\circ}", "→": "\\to", "←": "\\leftarrow" };

// A small typesetter, not eval/a calculator. Explicit groups preserve fraction,
// power and function binding; no HTML or user-provided TeX commands are accepted.
export function expressionToLatex(value) {
  let source = westernDigits(value).trim().replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/");
  source = source.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+/g, run => `^(${[...run].map(c => c === "ⁿ" ? "ن" : "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join("")})`);
  if (!source || source.length > 180 || /[\\{}$<>\u0000-\u001f]/.test(source.replace(/<=|>=|!=|[<>]/g, ""))) throw new Error("اكتب تعبيرًا رياضيًا واضحًا بدون أكواد أو أوامر.");
  const tokens = source.match(/\d+(?:[.٫]\d+)?|لو_هـ|[\p{L}]+|<=|>=|!=|[+\-*/^_()\[\]|=<>،,;:π∞Δ√∈⊆≤≥≠≈±′″‴°→←₀-₉]/gu) || [];
  if (tokens.join("") !== source.replace(/\s/g, "")) throw new Error("في التعبير رمز غير مدعوم أو أقواس غير مكتملة.");
  let index = 0;
  const atom = (postfix = true) => {
    const token = tokens[index++];
    if (!token) throw new Error("أكمل التعبير الرياضي.");
    let result;
    if (token === "+" || token === "-") result = token + atom();
    else if (token === "(" || token === "[") {
      const close = token === "(" ? ")" : "]";
      result = sequence(close);
      if (tokens[index++] !== close) throw new Error("تأكد من إغلاق الأقواس.");
      result = `\\left${token}${result}\\right${close}`;
    } else if (token === "|") {
      result = sequence("|");
      if (tokens[index++] !== "|") throw new Error("أغلق رمز القيمة المطلقة.");
      result = `\\left|${result}\\right|`;
    } else if (token === "√" || functions[token]) {
      const fn = token === "√" ? "sqrt" : functions[token];
      const arg = atom(false);
      result = fn === "sqrt" ? `\\sqrt{${arg}}` : fn === "cbrt" ? `\\sqrt[3]{${arg}}` : `${functionTex(fn)} ${arg}`;
    } else if (/^\d/.test(token)) result = token.replace("٫", ".");
    else if (symbols[token]) result = symbols[token];
    else if (/^[\p{L}]+$/u.test(token)) result = latexText(token);
    else throw new Error("راجع ترتيب العمليات في التعبير.");
    while (postfix && (tokens[index] === "^" || tokens[index] === "_")) {
      const op = tokens[index++];
      const script = atom().replace(/^\\left\((.*)\\right\)$/s, "$1");
      result = `{${result}}${op}{${script}}`;
    }
    while (postfix && /^[′″‴°₀-₉]$/.test(tokens[index] || "")) {
      const extra = tokens[index++]; result += symbols[extra] || `_{${"₀₁₂₃₄₅₆₇₈₉".indexOf(extra)}}`;
    }
    return result;
  };
  const product = () => {
    let result = atom();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const op = tokens[index++], right = atom();
      result = op === "/" ? `\\frac{${result}}{${right}}` : `${result} \\times ${right}`;
    }
    return result;
  };
  const sequence = close => {
    let result = product();
    while (index < tokens.length && tokens[index] !== close) {
      const token = tokens[index];
      if (/^[+\-=<>،,;:∈⊆≤≥≠≈±→←]$/.test(token) || ["<=", ">=", "!="].includes(token)) {
        index++; const op = symbols[token] || ({ "<=": "\\le", ">=": "\\ge", "!=": "\\ne", "،": "," }[token]) || token;
        result += ` ${op} ${product()}`;
      } else if (token === ")" || token === "]") throw new Error("يوجد قوس زائد في التعبير.");
      else result += ` ${product()}`; // Implicit multiplication, e.g. 2س.
    }
    return result;
  };
  const result = sequence(null);
  if (index !== tokens.length) throw new Error("راجع التعبير الرياضي.");
  return result;
}

export function formatMathItem(id, input = {}) {
  const item = mathItem(id);
  if (!item) throw new Error("هذا القالب غير موجود.");
  const values = {}, errors = {};
  for (const field of item.fields) {
    const value = String(input[field] ?? "").trim();
    if (!value) errors[field] = `أكمل ${fieldLabels[field] || field}.`;
    else if (value.length > 180 || /[\\{}$\u0000-\u001f]/.test(value)) errors[field] = "اكتب قيمة رياضية بدون أكواد، بحد أقصى 180 حرفًا.";
    values[field] = value;
  }
  for (const field of ["order", "degree", "index"]) if (values[field] && (!/^\d+$/.test(westernDigits(values[field])) || +westernDigits(values[field]) < (field === "index" ? 0 : 1) || +westernDigits(values[field]) > 100)) errors[field] = "استخدم عددًا صحيحًا مناسبًا من 1 إلى 100 (الرقم السفلي يقبل صفرًا).";
  if (values.denominator && /^[-+]?0+(?:[.٫]0+)?$/.test(westernDigits(values.denominator))) errors.denominator = "المقام لا يمكن أن يكون صفرًا.";
  if (values.variable && !/^[\p{L}]{1,12}$/u.test(values.variable)) errors.variable = "اكتب اسم متغير، مثل س أو ص أو ن، بدون عمليات.";
  if (values.function && !["جا", "جتا", "ظا", "ظتا", "قا", "قتا", "sin", "cos", "tan", "cot", "sec", "csc"].includes(values.function)) errors.function = "اختر جا، جتا، ظا، ظتا، قا أو قتا.";
  const latex = {};
  for (const field of item.fields) {
    if (!values[field] || errors[field]) continue;
    if (field === "function") { latex[field] = latexText(values[field]); continue; }
    try { latex[field] = expressionToLatex(values[field]); } catch (error) { errors[field] = error.message; }
  }
  if (Object.keys(errors).length) return { valid: false, errors, values };
  const text = item.insertText.replace(/\{(\w+)\}/g, (_, key) => values[key]);
  const e = latex.expression, x = latex.x, v = latex.variable;
  let tex;
  switch (id) {
    case "fraction": tex = `\\frac{${latex.numerator}}{${latex.denominator}}`; break;
    case "power": case "base-power": tex = `{${latex.base}}^{${latex.exponent || e}}`; break;
    case "negative-power": tex = `{${latex.base}}^{-${latex.exponent}}`; break;
    case "fractional-power": tex = `{${latex.base}}^{\\frac{${latex.numerator}}{${latex.denominator}}}`; break;
    case "sqrt": tex = `\\sqrt{${e}}`; break;
    case "cbrt": tex = `\\sqrt[3]{${e}}`; break;
    case "nth-root": tex = `\\sqrt[${latex.degree}]{${e}}`; break;
    case "generic-derivative": tex = `\\frac{${latexText("د")}}{${latexText("د")}${v}}\\left(${e}\\right)`; break;
    case "derivative-order": tex = `\\frac{${latexText("د")}^{${latex.order}}}{${latexText("د")}${v}^{${latex.order}}}\\left(${e}\\right)`; break;
    case "nth-derivative": tex = `\\frac{${latexText("د")}^{${latex.order}}${latexText("ق")}}{${latexText("د")}${latexText("س")}^{${latex.order}}}\\left(${x}\\right)`; break;
    case "at-point": tex = `\\left.\\frac{${latexText("د")}}{${latexText("د")}${v}}\\left(${e}\\right)\\right|_{${v}=${latex.point}}`; break;
    case "right-derivative": case "left-derivative": tex = `${latexText("ق")}'_{${id === "right-derivative" ? "+" : "-"}}(${latex.point})`; break;
    case "average-rate": tex = `\\frac{${latexText("ق")}(${latex.end})-${latexText("ق")}(${latex.start})}{${latex.end}-${latex.start}}\\quad ${latexText("ق")}(${latexText("س")})=${e}`; break;
    case "composition": tex = `(${latexText("ق")} \\circ ${latexText("هـ")})(${x})`; break;
    case "piecewise": tex = `${latexText("ق")}(${latexText("س")})=\\begin{cases}${latex.firstExpression} & ${latex.firstCondition}\\\\${latex.secondExpression} & ${latex.secondCondition}\\end{cases}`; break;
    case "implicit": tex = `${latex.left}=${latex.right}\\quad;\\quad\\frac{${latexText("دص")}}{${latexText("دس")}}=?`; break;
    case "limit": case "right-limit": case "left-limit": tex = `\\lim_{${v}\\to ${latex.point}${id === "right-limit" ? "^{+}" : id === "left-limit" ? "^{-}" : ""}}\\left(${e}\\right)`; break;
    case "sin": case "cos": case "tan": case "cot": case "sec": case "csc": tex = `${functionTex(id)}\\left(${e}\\right)`; break;
    case "trig-power": tex = `${functionTex(functions[values.function])}^{${latex.exponent}}\\left(${e}\\right)`; break;
    case "degrees": tex = `${latex.angle}^{\\circ}`; break;
    case "radians": tex = `${latex.angle}\\;\\mathrm{rad}`; break;
    case "e": tex = latexText("هـ"); break;
    case "exp": tex = `${latexText("هـ")}^{${e}}`; break;
    case "ln": tex = `${functionTex("ln")}\\left(${e}\\right)`; break;
    case "log": tex = `\\operatorname{لو}_{${latex.base}}\\left(${e}\\right)`; break;
    case "interval-closed": case "interval-open": case "interval-left-closed": case "interval-right-closed": tex = `${["interval-closed", "interval-left-closed"].includes(id) ? "[" : "("}${latex.start},${latex.end}${["interval-closed", "interval-right-closed"].includes(id) ? "]" : ")"}`; break;
    case "unbounded-interval": tex = `(${latex.start},\\infty)`; break;
    case "real": tex = latexText("ح"); break;
    case "integers": tex = latexText("ص"); break;
    case "positive-integers": tex = `${latexText("ص")}^{+}`; break;
    case "abs": tex = `\\left|${e}\\right|`; break;
    case "floor": tex = `\\left\\lfloor ${e}\\right\\rfloor`; break;
    case "tangent": case "normal": tex = `${e}\\quad ${latexText("عند")}\\;${latexText("س")}=${latex.point}`; break;
    case "parallel": case "perpendicular": tex = `${id === "parallel" ? "\\parallel" : "\\perp"}\\quad ${latex.line}`; break;
    case "integral": tex = `\\int\\left(${e}\\right)\\,${latexText("د")}${v}`; break;
    case "definite-integral": tex = `\\int_{${latex.lower}}^{${latex.upper}}\\left(${e}\\right)\\,${latexText("د")}${v}`; break;
    case "division-sign": tex = "\\div"; break;
    case "indeterminate": tex = "\\frac{0}{0}"; break;
    default:
      try { tex = expressionToLatex(text); } catch { tex = latexText(text); }
  }
  return { valid: true, errors: {}, itemId: id, values, text, latex: tex };
}

export const emptyMathDraft = () => ({ text: "", equations: [] });
// Edits touching an equation turn that edited span back into ordinary text.
// Untouched equations retain their positions and remain editable as templates.
export function updateDraftText(draft, text) {
  let start = 0;
  while (start < draft.text.length && start < text.length && draft.text[start] === text[start]) start++;
  let oldEnd = draft.text.length, newEnd = text.length;
  while (oldEnd > start && newEnd > start && draft.text[oldEnd - 1] === text[newEnd - 1]) { oldEnd--; newEnd--; }
  const delta = text.length - draft.text.length;
  return { text, equations: draft.equations.flatMap(eq => eq.end <= start ? [eq] : eq.start >= oldEnd ? [{ ...eq, start: eq.start + delta, end: eq.end + delta }] : []) };
}
export function insertDraftMath(draft, selection, formatted, key) {
  const start = Math.max(0, Math.min(draft.text.length, selection.start)), end = Math.max(start, Math.min(draft.text.length, selection.end));
  const text = draft.text.slice(0, start) + formatted.text + draft.text.slice(end);
  const delta = formatted.text.length - (end - start);
  const equations = draft.equations.flatMap(eq => eq.end <= start ? [eq] : eq.start >= end ? [{ ...eq, start: eq.start + delta, end: eq.end + delta }] : []);
  equations.push({ key, start, end: start + formatted.text.length, itemId: formatted.itemId, values: formatted.values });
  return { draft: { text, equations: equations.sort((a, b) => a.start - b.start) }, cursor: start + formatted.text.length };
}
export function removeDraftMath(draft, key) {
  const eq = draft.equations.find(e => e.key === key);
  return eq ? { text: draft.text.slice(0, eq.start) + draft.text.slice(eq.end), equations: draft.equations.filter(e => e !== eq).map(e => e.start >= eq.end ? { ...e, start: e.start - (eq.end - eq.start), end: e.end - (eq.end - eq.start) } : e) } : draft;
}

export function validateMathSpans(content, spans = []) {
  if (!Array.isArray(spans) || spans.length > 40) throw new Error("الحد الأقصى 40 معادلة في الرسالة.");
  let previousEnd = 0;
  return spans.map(span => {
    if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end) || span.start < previousEnd || span.end <= span.start || span.end > content.length) throw new Error("مواضع المعادلات غير صالحة؛ راجع المسودة.");
    const formatted = formatMathItem(span.itemId, span.values);
    if (!formatted.valid || content.slice(span.start, span.end) !== formatted.text) throw new Error("المعادلة غير مكتملة أو لا تطابق نص السؤال.");
    previousEnd = span.end;
    return { start: span.start, end: span.end, itemId: span.itemId, values: formatted.values };
  });
}

export function trimMathMessage(draft) {
  const leading = draft.text.length - draft.text.trimStart().length, content = draft.text.trim();
  const equations = draft.equations.map(e => ({ ...e, start: e.start - leading, end: e.end - leading }));
  return { content, equations: validateMathSpans(content, equations) };
}
