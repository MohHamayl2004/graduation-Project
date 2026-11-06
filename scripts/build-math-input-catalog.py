"""Build a source-linked inventory, without changing textbooks or the RAG index."""
import hashlib
import json
import pathlib
import re
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "Nipras_Ai_Models/data"
records, sources = [], []


def strings(value, location="$", uncertain=False):
    if isinstance(value, dict):
        uncertain = uncertain or value.get("uncertain") is True
        for key, child in value.items():
            yield from strings(child, f"{location}.{key}", uncertain)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from strings(child, f"{location}[{index}]", uncertain)
    elif isinstance(value, str):
        yield location, value, uncertain


for folder, pattern in [("extracted", "lesson_1_*.json"), ("processed", "*.json")]:
    for path in sorted((DATA / folder).glob(pattern)):
        raw = path.read_bytes()
        doc = json.loads(raw.decode("utf-8-sig"))
        lesson = doc.get("lesson") or {}
        code = doc.get("solves") or lesson.get("code", "")
        if folder == "processed" and not str(code).startswith("1-"):
            continue
        name = path.relative_to(ROOT).as_posix()
        sources.append({"path": name, "layer": folder, "lesson": code,
                        "sha256": hashlib.sha256(raw).hexdigest(),
                        "page": doc.get("page_number"), "title": lesson.get("title_ar") or lesson.get("titles")})
        for location, text, uncertain in strings(doc):
            # Inspect every string, but keep metadata out of formula evidence.
            if location.startswith("$.verification"):
                continue
            records.append({"source": name, "layer": folder, "lesson": code,
                            "location": location, "text": text, "uncertain": uncertain})

categories = []


def category(identifier, label, rows):
    items = []
    for row in rows:
        key, title, insert, canonical, needles = row
        matches = [r for r in records if any(n in r["text"] for n in needles)]
        # Evidence preference does not certify correctness of any formula.
        matches.sort(key=lambda r: (r["layer"] != "processed", r["uncertain"]))
        examples, seen = [], set()
        for match in matches:
            if match["lesson"] in seen:
                continue
            seen.add(match["lesson"])
            examples.append({k: match[k] for k in ["source", "lesson", "location", "uncertain"]})
            if len(examples) == 3:
                break
        items.append({"id": key, "labelAr": title, "insertText": insert,
                      "canonicalTemplate": canonical,
                      "fields": list(dict.fromkeys(re.findall(r"\{([a-zA-Z][a-zA-Z0-9_]*)\}", insert))),
                      "evidence": examples,
                      "status": "source_backed_input" if matches else "supporting_template"})
    categories.append({"id": identifier, "labelAr": label, "items": items})


category("variables", "المتغيرات والاقترانات", [
    ("x", "س", "س", "x", ["س"]),
    ("y", "ص", "ص", "y", ["ص"]),
    ("t", "ن: الزمن أو الأس", "ن", "t", ["ن الزمن", "الزمن بالساعات", "سⁿ"]),
    ("u", "ع: متغير وسيط", "ع", "u", ["ص = ع", "ع ="]),
    ("a", "أ: ثابت", "أ", "a", ["أ س", "س = أ"]),
    ("b", "ب: ثابت", "ب", "b", ["ب س", "ب >"]),
    ("c", "ج: ثابت", "ج", "c", ["حيث ج", "جـ"]),
    ("function", "ق(س)", "ق({x})", "f({x})", ["ق(س)"]),
    ("second-function", "هـ(س)", "هـ({x})", "g({x})", ["هـ(س)"]),
    ("other-function", "ك(س)", "ك({x})", "k({x})", ["ك(س)"]),
    ("m-function", "م(س)", "م({x})", "m({x})", ["م(س)"]),
    ("l-function", "ل(س)", "ل({x})", "l({x})", ["ل(س)"]),
    ("indexed-x", "س₁ وس₂", "س_{index}", "x_{index}", ["س₁", "س₂", "س١"]),
    ("indexed-y", "ص₁ وص₂", "ص_{index}", "y_{index}", ["ص₁", "ص₂"]),
])
category("arithmetic", "العمليات والمقارنة", [
    ("plus", "جمع", "+", "+", ["+"]),
    ("minus", "طرح / سالب", "−", "-", ["−", "-"]),
    ("times", "ضرب", "×", "*", ["×"]),
    ("division", "قسمة", "/", "/", ["/"]),
    ("plus-minus", "زائد أو ناقص", "±", "+/-", ["±"]),
    ("equals", "يساوي", "=", "=", ["="]),
    ("not-equal", "لا يساوي", "≠", "!=", ["≠"]),
    ("approx", "يساوي تقريبًا", "≈", "approx", ["≈"]),
    ("less", "أصغر من", "<", "<", ["<"]),
    ("greater", "أكبر من", ">", ">", [">"]),
    ("less-equal", "أصغر من أو يساوي", "≤", "<=", ["≤"]),
    ("greater-equal", "أكبر من أو يساوي", "≥", ">=", ["≥"]),
    ("parentheses", "أقواس", "({expression})", "({expression})", ["("]),
    ("group-brackets", "أقواس تجميع", "[{expression}]", "({expression})", ["["]),
    ("fraction", "كسر: بسط ومقام", "({numerator})/({denominator})", "({numerator})/({denominator})", ["/س", "/هـ", "Δص/Δس"]),
])
category("powers-roots", "الأسس والجذور", [
    ("x-square", "س تربيع", "س²", "x^2", ["س²", "س^٢"]),
    ("y-square", "ص تربيع", "ص²", "y^2", ["ص²", "ص^٢"]),
    ("cube", "س تكعيب", "س³", "x^3", ["س³", "س^٣"]),
    ("power", "قوة عامة", "({base})^({exponent})", "({base})^({exponent})", ["سⁿ", "س^ن", "^("]),
    ("negative-power", "أس سالب", "({base})^(−{exponent})", "({base})^(-{exponent})", ["س⁻", "^(−", "^(-"]),
    ("fractional-power", "أس كسري", "({base})^({numerator}/{denominator})", "({base})^({numerator}/{denominator})", ["س^(م/ن)", "^(٣/٤)", "^(٢/٣)"]),
    ("sqrt", "جذر تربيعي", "√({expression})", "sqrt({expression})", ["√"]),
    ("cbrt", "جذر تكعيبي", "الجذر التكعيبي لـ ({expression})", "cbrt({expression})", ["الجذر التكعيبي"]),
    ("nth-root", "جذر من الرتبة ن", "الجذر من الرتبة {degree} لـ ({expression})", "root({expression},{degree})", ["الجذر الرابع", "الجذر الخامس"]),
])
category("derivatives", "المشتقات ومتوسط التغير", [
    ("prime", "المشتقة الأولى ق′(س)", "ق′({x})", "f'({x})", ["ق′("]),
    ("double-prime", "المشتقة الثانية ق″(س)", "ق″({x})", "f''({x})", ["ق″("]),
    ("triple-prime", "المشتقة الثالثة ق‴(س)", "ق‴({x})", "f'''({x})", ["ق‴("]),
    ("nth-derivative", "المشتقة من الرتبة ن", "المشتقة من الرتبة {order} للاقتران ق عند ({x})", "derivative(f,{order},{x})", ["ق⁽ⁿ⁾", "دⁿص"]),
    ("y-prime", "ص′", "ص′", "dy/dx", ["ص′"]),
    ("y-double-prime", "ص″", "ص″", "d^2y/dx^2", ["ص″"]),
    ("dy-dx", "دص/دس", "دص/دس", "dy/dx", ["دص/دس", "د ص/د س"]),
    ("d2y-dx2", "د²ص/دس²", "د²ص/دس²", "d^2y/dx^2", ["د²ص/دس²"]),
    ("generic-derivative", "اشتقاق بالنسبة إلى متغير", "مشتقة ({expression}) بالنسبة إلى {variable}", "d/d{variable}({expression})", ["بالنسبة إلى س", "دص/دع"]),
    ("at-point", "المشتقة عند نقطة", "مشتقة ({expression}) بالنسبة إلى {variable} عند {variable} = {point}", "derivative({expression},{variable}) at {variable}={point}", ["عند س", "عندما س"]),
    ("right-derivative", "المشتقة اليمنى", "المشتقة اليمنى للاقتران ق عند ({point})", "right_derivative(f,{point})", ["ق′₊", "المشتقة عن يمين", "المشتقتان اليمنى"]),
    ("left-derivative", "المشتقة اليسرى", "المشتقة اليسرى للاقتران ق عند ({point})", "left_derivative(f,{point})", ["ق′₋", "المشتقة عن", "المشتقتان اليمنى"]),
    ("delta-x", "Δس: التغير في س", "Δس", "delta_x", ["Δس"]),
    ("delta-y", "Δص: التغير في ص", "Δص", "delta_y", ["Δص"]),
    ("delta-distance", "Δف: التغير في الإزاحة", "Δف", "delta_s", ["Δف"]),
    ("delta-time", "Δن: التغير في الزمن", "Δن", "delta_t", ["Δن"]),
    ("average-rate", "متوسط التغير", "متوسط تغير ({expression}) من {start} إلى {end}", "average_rate({expression},{start},{end})", ["متوسط التغير", "متوسط تغير"]),
    ("delta-ratio", "Δص/Δس", "Δص/Δس", "delta_y/delta_x", ["Δص/Δس"]),
    ("composition", "تركيب الاقترانات", "(ق ∘ هـ)({x})", "f(g({x}))", ["∘"]),
    ("piecewise", "اقتران متعدد القواعد", "ق(س) = {firstExpression} إذا {firstCondition}؛ و{secondExpression} إذا {secondCondition}", "piecewise({firstExpression},{firstCondition};{secondExpression},{secondCondition})", ["إذا س", "س ≤", "س ≥", "if x"]),
    ("implicit", "علاقة ضمنية", "{left} = {right}، أوجد دص/دس بالاشتقاق الضمني", "implicit_derivative({left}={right},y,x)", ["الاشتقاق الضمني", "ضمنياً"]),
])
category("limits", "النهايات", [
    ("limit", "نهاية عند عدد", "نها ({expression}) عندما {variable} تقترب من {point}", "lim_({variable}->{point})({expression})", ["نها عندما", "نها "]),
    ("right-limit", "نهاية من اليمين", "نها ({expression}) عندما {variable} تقترب من {point} من اليمين", "lim_({variable}->{point}+)({expression})", ["0⁺", "٠⁺", "اليمنى"]),
    ("left-limit", "نهاية من اليسار", "نها ({expression}) عندما {variable} تقترب من {point} من اليسار", "lim_({variable}->{point}-)({expression})", ["0⁻", "٠⁻", "اليسرى"]),
    ("approaches", "تقترب من", "→", "->", ["←", "->"]),
    ("indeterminate", "الصورة غير المعيّنة ٠/٠", "الصورة غير المعيّنة ٠/٠", "indeterminate 0/0", ["0/0", "٠/٠"]),
])
category("trigonometry", "الاقترانات المثلثية والزوايا", [
    ("sin", "جا", "جا({expression})", "sin({expression})", ["جا س", "جاس", "sin("]),
    ("cos", "جتا", "جتا({expression})", "cos({expression})", ["جتا", "cos("]),
    ("tan", "ظا", "ظا({expression})", "tan({expression})", ["ظا", "tan("]),
    ("cot", "ظتا", "ظتا({expression})", "cot({expression})", ["ظتا", "cot("]),
    ("sec", "قا", "قا({expression})", "sec({expression})", ["قا س", "قا^", "sec("]),
    ("csc", "قتا", "قتا({expression})", "csc({expression})", ["قتا", "csc("]),
    ("trig-power", "قوة اقتران مثلثي", "({function}({expression}))^({exponent})", "({function}({expression}))^({exponent})", ["جتا²", "ظا²", "قا²", "جا^٣"]),
    ("pi", "π: باي", "π", "pi", ["π"]),
    ("pi-fraction", "كسر من π", "π/{denominator}", "pi/{denominator}", ["π/", "pi/"]),
    ("degrees", "درجة °", "{angle}°", "{angle} degrees", ["°"]),
    ("radians", "راديان", "{angle} راديان", "{angle} radians", ["التقدير الدائري", "radians"]),
])
category("exponential-log", "الأسّي واللوغاريتمي", [
    ("e", "هـ: العدد النيبيري", "العدد النيبيري هـ", "e", ["العدد النيبيري"]),
    ("exp", "هـ أس مقدار", "هـ^({expression})", "e^({expression})", ["هـ^", "e^"]),
    ("base-power", "أ أس س", "({base})^({expression})", "({base})^({expression})", ["أ^س", "2^(3"]),
    ("ln", "اللوغاريتم الطبيعي", "لو_هـ({expression})", "ln({expression})", ["لو_هـ", "لوهـ", "ln("]),
    ("log", "لوغاريتم بأساس محدّد", "لو_{base}({expression})", "log({expression},{base})", ["لو_أ", "لوₙ", "log_base"]),
])
category("sets", "الفترات والمجموعات والقيمة المطلقة", [
    ("interval-closed", "فترة مغلقة", "[{start}، {end}]", "[{start},{end}]", ["الفترة [", "على ["]),
    ("interval-open", "فترة مفتوحة", "({start}، {end})", "({start},{end})", ["الفترة", "الأجزاء المفتوحة"]),
    ("interval-left-closed", "فترة مغلقة يسارًا", "[{start}، {end})", "[{start},{end})", ["[٠، ١/٢)", "[−"]),
    ("interval-right-closed", "فترة مغلقة يمينًا", "({start}، {end}]", "({start},{end}]", ["]٠، π/٢]", "(٠،"]),
    ("member", "ينتمي إلى", "∈", "in", ["∈", "∋"]),
    ("subset", "مجموعة جزئية", "⊆", "subseteq", ["⊆"]),
    ("real", "ح: الأعداد الحقيقية", "الأعداد الحقيقية ح", "R", ["∈ ح", "∋ ح", "عدد حقيقي"]),
    ("integers", "ص: الأعداد الصحيحة", "الأعداد الصحيحة ص", "Z", ["∈ ص", "∋ ص"]),
    ("positive-integers", "ص⁺: الصحيحة الموجبة", "الأعداد الصحيحة الموجبة ص⁺", "Z_positive", ["ص⁺", "ص^+"]),
    ("infinity", "∞: لانهاية", "∞", "infinity", ["∞"]),
    ("unbounded-interval", "فترة غير محدودة من الأعلى", "({start}، ∞)", "({start},infinity)", ["∞"]),
    ("abs", "قيمة مطلقة", "|{expression}|", "abs({expression})", ["|س", "|س −"]),
    ("floor", "أكبر عدد صحيح", "أكبر عدد صحيح لـ ({expression})", "floor({expression})", ["أكبر عدد صحيح", "floor("]),
])
category("geometry-motion", "الهندسة والحركة", [
    ("point", "نقطة (س، ص)", "({x}، {y})", "({x},{y})", ["النقطة (", "نقطة التماس"]),
    ("tangent", "معادلة المماس", "معادلة المماس للاقتران ({expression}) عند س = {point}", "tangent({expression},x={point})", ["معادلة المماس", "معادلتي المماس"]),
    ("normal", "معادلة العمودي", "معادلة العمودي على المماس للاقتران ({expression}) عند س = {point}", "normal({expression},x={point})", ["معادلة العمودي", "العمودي على المماس"]),
    ("parallel", "موازٍ", "موازٍ للمستقيم ({line})", "parallel to ({line})", ["موازياً", "الموازي"]),
    ("perpendicular", "عمودي", "عمودي على المستقيم ({line})", "perpendicular to ({line})", ["عمودياً على", "العمودي"]),
    ("distance", "ف(ن): الإزاحة / الموقع", "ف({time})", "s({time})", ["ف(ن)"]),
    ("velocity", "ع(ن): السرعة", "ع({time})", "v({time})", ["ع(ن)"]),
    ("acceleration", "ت(ن): التسارع", "ت({time})", "a({time})", ["ت(ن)"]),
    ("meters", "متر", "م", "m", ["بالأمتار", "بالمتر"]),
    ("seconds", "ثانية", "ث", "s", ["بالثواني", "ثانية"]),
    ("speed-unit", "م/ث", "م/ث", "m/s", ["م/ث"]),
    ("accel-unit", "م/ث²", "م/ث²", "m/s^2", ["م/ث²", "م/ث^٢"]),
])

catalog = {
    "schemaVersion": 1,
    "scope": "math-unit-1-differentiation",
    "titleAr": "رموز وقوالب إدخال أسئلة الوحدة الأولى: حساب التفاضل",
    "purpose": "قائمة محفوظة لتطوير لوحة إدخال الشات لاحقًا؛ ليست واجهة مفعّلة أو محلّل معادلات.",
    "coverage": {"sources": len(sources), "sourceLayers": dict(Counter(s["layer"] for s in sources)),
                 "scannedStringValues": len(records), "lessons": sorted(set(str(s["lesson"]) for s in sources))},
    "notesAr": [
        "قراءة ملفات JSON كاملة وفحص قيم النصوص؛ لم تتم إعادة تدقيق الصور أو صحة حلول الكتاب.",
        "ملفات extracted مدخلات خام حتى لو احتوى اسمها verified؛ ملفات processed قد تتضمن حقول uncertain.",
        "أرقام صفحات extracted مطبوعة؛ صفحات processed أرقام PDF، والأوفست الموثق للكتاب أربع صفحات.",
        "المراجع تثبت وجود الترميز أو الحاجة إليه، ولا تعني اعتماد الحلول أو الصيغ المحيطة به.",
        "الحقول بين الأقواس المعقوفة مدخلات يعبئها الطالب، وليست نصًا يرسل كما هو.",
        "canonicalTemplate وصف غير ملتبس للتطوير؛ لا يُرسل أو يُنفّذ تلقائيًا ولا يضمن دعم محلّل الموديل الحالي.",
        "تختلف معاني هـ وص وع ون حسب السياق: هـ قد يكون اقترانًا أو زيادة أو العدد e؛ وص متغير أو مجموعة أعداد صحيحة.",
        "سهم النهاية في النص العربي قد يظهر ←؛ نخزن الاقتراب كمتغير وقيمة واتجاه بدل استبدال الأسهم آليًا.",
        "أكبر عدد صحيح [س] ليس قيمة مطلقة |س|، والفترة (أ، ب) ليست زوجًا مرتبًا إلا حسب السياق.",
        "تمييز (جا س)^٢ عن جا(س²)، والمشتقة الثانية عن مربع المشتقة، والأسّ النوني عن المشتقة النونية.",
        "تُحفظ شجرة الصيغة أو حقول القالب عند التنفيذ لاحقًا مع عزل اتجاه المعادلة عن النص العربي؛ لا نعكس ترتيب الحدود.",
        "جذور عامة وبعض أسماء القوالب صيغ إدخال مساعدة مشتقة من الحاجة في النص وليست نسخًا حرفية.",
        "لم تُعدّل ملفات المصدر أو فهرس RAG ولم تُضف لوحة رموز إلى الشات ضمن هذه الخطوة."
    ],
    "quickAccessIds": ["x-square", "y-square", "fraction", "sqrt", "prime", "double-prime", "dy-dx", "limit", "sin", "cos", "tan", "pi", "exp", "ln", "power"],
    "categories": categories,
    "futureExtensions": [
        {"id": "integral", "labelAr": "تكامل غير محدّد", "insertText": "∫ ({expression}) د{variable}", "observedInUnit": False},
        {"id": "definite-integral", "labelAr": "تكامل محدّد", "insertText": "تكامل ({expression}) بالنسبة إلى {variable} من {lower} إلى {upper}", "observedInUnit": False}
    ],
    "sources": sources
}
output = ROOT / "shared/mathInputCatalog.json"
output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
items = [i for c in categories for i in c["items"]]
assert len({i["id"] for i in items}) == len(items)
assert set(catalog["quickAccessIds"]) <= {i["id"] for i in items}
for item in items:
    assert set(item["fields"]) == set(re.findall(r"\{([a-zA-Z][a-zA-Z0-9_]*)\}", item["canonicalTemplate"]))
print(json.dumps({"output": output.as_posix(), "sourceFiles": len(sources), "categories": len(categories),
                  "items": len(items), "supportingTemplates": [i["id"] for i in items if not i["evidence"]]}, ensure_ascii=False))
