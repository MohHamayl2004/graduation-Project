/**
 * NIPRAS Voice Navigation Recognizer
 * Pure, zero-dependency Arabic & English voice command matcher.
 * Normalizes diacritics, tatweel, hamza variants, punctuation, and whitespace.
 * Strict anchored matching to prevent unsafe execution of arbitrary text or questions.
 */

export const ALLOWLISTED_ROUTES = Object.freeze([
  "/lectures?subject=math",
]);

export const ALLOWED_ACTIONS = Object.freeze([
  "stop",
  "readQuestion",
  "explainQuestion",
  "repeat",
]);

const QUOTE_CHARS = ['"', "'", "“", "”", "‘", "’", "«", "»", "`"];

const HOSTILE_PATTERNS = [
  /javascript:/i,
  /https?:/i,
  /ftp:/i,
  /file:/i,
  /data:/i,
  /\/\//,
  /<script/i,
  /<\/?[a-z][\s\S]*>/i,
  /\.\./,
  /%[0-9a-f]{2}/i,
  /\b(admin|eval|alert|prompt|confirm|document|window)\b/i,
];

const QUESTION_INDICATORS = [
  /[?؟]/,
  /\bhow\s+to\b/i,
  /\bcan\s+you\s+(explain|tell|show\s+how)\b/i,
  /\bcould\s+you\s+(explain|tell|show\s+how)\b/i,
  /^(what|why|how|who|where|when|is\s+it|do\s+you)\b/i,
  /^(كيف|ما\s*هو|ما\s*هي|ماذا|شو\s*هو|شو\s*هي|ايش\s*هو|ايش\s*هي|هل|لماذا|ليه|ليش|متى|اين|وين|كم|من\s*هو|من\s*هي)\b/,
  /\b(تعريف|معنى|معني|شرح\s*مفهوم)\b/,
];

const REPORTED_OR_FALSE_POSITIVE_PATTERNS = [
  // Arabic reported speech or narrative mentions
  /^(?:قال|قالت|حكي|حكت|قرا|قرات|كتب|كتبت|سمعت|سمعنا|ذكر|ذكرت|يقول|تقول|قالوا|حكوا|مكتوب|العنوان|النص|جمله|عباره)\b/,
  /\b(?:قال|قالت|حكي|حكت|يقول|تقول)\s+(?:لي|لنا|لهم|المعلم|المدرس|الاستاذ|نبراس|الطالب)\b/,
  // Conditional, hypothetical, or past narrative clauses
  /^(?:اذا|لو\s+(?!سمحت)|لما|عندما|امبارح|امس|قبل\s+شوي|كنت|كنا)\b/,
  // Negation / prohibition
  /^(?:لا\s+تفتح|ما\s+تفتح|ما\s+بدي|لا\s+اريد|مش\s+بدي|لا\s+تروح|ما\s+تروح|dont|do\s+not|never)\b/i,
  // English reported speech or narrative mentions
  /^(?:he|she|they|the\s+teacher|my\s+teacher|someone|nobody|i\s+heard|it)\s+(?:said|says|told|asked|wrote|mentioned)\b/i,
  /\b(?:said|told\s+me|asked\s+me)\s+to\s+(?:open|go|show|read|explain|repeat|stop)\b/i,
  // Meta / conversational statements about features rather than commands
  /\b(?:is\s+(?:great|helpful|useful|good|bad|slow|fast|broken|working)|كثير\s+مفيد|ممتاز|رائع|ما\s+بيشتغل|عطلان)\b/i,
  // Compound or chained intents ("... and then ...")
  /\s+(?:ثم|وبعدين|بعدين|و\s*كمان|او|ام|and\s+then|then\s+|or\s+)\s+/i,
];

export function normalizeVoiceInput(str) {
  if (typeof str !== "string") return "";
  let s = str.toLowerCase();

  // 1. Remove Arabic diacritics (harakat / tashkeel / quranic marks)
  s = s.replace(/[\u064B-\u065F\u0670\u0610-\u061A\u06D6-\u06ED]/g, "");

  // 2. Remove tatweel / kashida (ـ)
  s = s.replace(/\u0640/g, "");

  // 3. Normalize Alif variants (أ, إ, آ, ٱ -> ا)
  s = s.replace(/[أإآٱ]/g, "ا");

  // 4. Normalize Ta Marbuta (ة -> ه)
  s = s.replace(/ة/g, "ه");

  // 5. Normalize Alif Maqsura (ى -> ي)
  s = s.replace(/ى/g, "ي");

  // 6. Normalize Hamza variants:
  // ؤ -> و (السؤال -> السوال)
  s = s.replace(/ؤ/g, "و");
  // ئ -> ي
  s = s.replace(/ئ/g, "ي");
  // Standalone hamza ء -> removed
  s = s.replace(/ء/g, "");

  // 7. Strip punctuation (convert to space)
  s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()؟?،؛:!«»"']/g, " ");

  // 8. Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

const PREFIX_WRAPPERS = [
  /^يا\s*نبراس\s+/,
  /^نبراس\s+/,
  /^(?:hey|hi|hello)\s+(?:nebras|nibras|nipras)\s+/,
  /^(?:nebras|nibras|nipras)\s+/,
  /^لو\s*سمحت(ي)?\s+/,
  /^من\s*فضلك\s+/,
  /^رجاء(ا)?\s+/,
  /^يا\s*ريت\s+/,
  /^بالله\s*عليك\s+/,
  /^بليز\s+/,
  /^ممكن\s+/,
  /^معلش\s+/,
  /^يلا\s+/,
  /^(?:could|can|would)\s+you\s+(?:please\s+)?/,
  /^please\s+/,
];

const SUFFIX_WRAPPERS = [
  /\s+يا\s*نبراس$/,
  /(?<!مع)\s+نبراس$/,
  /\s+لو\s*سمحت(ي)?$/,
  /\s+من\s*فضلك$/,
  /\s+رجاء(ا)?$/,
  /\s+بليز$/,
  /\s+please$/,
  /\s+(?:nebras|nibras|nipras)$/,
];

function stripPoliteWrappers(text) {
  let core = text;
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIX_WRAPPERS) {
      if (p.test(core)) {
        core = core.replace(p, "").trim();
        changed = true;
      }
    }
    for (const s of SUFFIX_WRAPPERS) {
      if (s.test(core)) {
        core = core.replace(s, "").trim();
        changed = true;
      }
    }
  }
  return core;
}

// Intent definitions with anchored regex patterns
const INTENTS = [
  // Actions
  {
    type: "action",
    action: "back",
    patterns: [
      /^ارجع\s+(?:للصفحه|الي\s+الصفحه)\s+السابقه$/,
      /^(ارجع|رجوع|عوده|للخلف)$/,
      /^ارجع\s*(لورا|للخلف|ورا|الي\s*الخلف)$/,
      /^ارجع\s*خطوه\s*(لورا|للخلف|ورا)$/,
      /^ارجع\s*(ل)?(الصفحه\s*السابقه|الصفحه\s*الماضيه)$/,
      /^الصفحه\s*السابقه$/,
      /^(go\s+)?back$/,
      /^previous\s*page$/,
      /^return$/,
    ],
  },
  {
    type: "action",
    action: "stop",
    patterns: [
      /^(اوقف|وقف)\s*(الصوت|الكلام|الحكي|التحدث)$/,
      /^(توقف|اوقف|وقف)\s*(عن\s*(الكلام|الحكي|التحدث))?$/,
      /^(توقف|وقف)\s*الان$/,
      /^اسكت$/,
      /^((stop\s+(speaking|talking))|stop|be\s*quiet|mute|silence)$/,
    ],
  },
  {
    type: "action",
    action: "firstLesson",
    patterns: [
      /^(افتح|ابدا|روح\s*(الي|علي)|وديني\s*(الي|علي))?\s*(الدرس\s*الاول|اول\s*درس)$/,
      /^(بدي|بدنا|اريد)\s*(افتح\s*)?(الدرس\s*الاول|اول\s*درس)$/,
      /^((open|start|go\s*to)\s+(the\s+)?)?first\s*lesson$/,
    ],
  },
  {
    type: "action",
    action: "nextLesson",
    patterns: [
      /^انتقل\s+للدرس\s+(?:التالي|القادم)$/,
      /^(افتح|روح\s*(الي|علي|ل)|وديني\s*(الي|علي|ل)|انتقل\s*(الي|علي|ل))?\s*(الدرس\s*التالي|الدرس\s*القادم|الدرس\s*اللي\s*بعده)$/,
      /^التالي$/,
      /^((open|go\s*to)\s+(the\s+)?)?next\s*lesson$/,
      /^next$/,
    ],
  },
  {
    type: "action",
    action: "readQuestion",
    patterns: [
      /^(اقرا|اقرالي|اقرا\s*لي|تقرا|تقرالي|تقرا\s*لي|قراءه)\s*(السوال|هذا\s*السوال|هاد\s*السوال)$/,
      /^(بدي|بدنا|اريد)\s*(تقرا|تقرالي|تقرا\s*لي)\s*(السوال|هذا\s*السوال|هاد\s*السوال)$/,
      /^read(\s*out)?\s+(the\s+|this\s+)?question$/,
    ],
  },
  {
    type: "action",
    action: "explainQuestion",
    patterns: [
      /^اشرح(?:لي|\s+لي)?\s+السوال\s+اللي\s+قدامي$/,
      /^(اشرح|اشرحلي|اشرح\s*لي|تشرحلي|تشرح\s*لي|فهمني|وضح|وضحلي|وضح\s*لي)\s*(طريقه\s*(حل\s*)?)?(السوال|هذا\s*السوال|هاد\s*السوال|هاذ\s*السوال)$/,
      /^explain\s+(the\s+|this\s+)?question$/,
      /^explain\s+how\s+to\s+solve\s+this$/,
    ],
  },
  {
    type: "action",
    action: "repeat",
    patterns: [
      /^(اعد|عيد|كرر|اعاده)\s*(الشرح|الكلام|ما\s*قلته)?$/,
      /^(عيد|اعد)\s*(لي\s*)?(الشرح|من\s*(الاول|جديد))?$/,
      /^((repeat\s+(the\s+)?explanation)|repeat|say\s+that\s+again|explain\s+again)$/,
    ],
  },

  // Routes
  {
    type: "navigate",
    to: "/ai-tutor",
    patterns: [
      /^(?:وين|اين)\s+(?:المعلم|المدرس)\s+الذكي$/,
      /^(?:خذني|خدني|وديني|افتح)(?:\s+|\s*لل?)(?:ال)?(?:محادثه|شات\s*بوت)$/,
      /^(?:بدي|اريد)\s+(?:اسال|احكي\s+مع|التحدث\s+مع)\s+(?:نبراس|الاستاذ|المعلم)$/,
      /^(?:take me to|open) (?:the )?chatbot$/,
      /^i want to chat with (?:the )?teacher$/,
      /^(افتح|افتحلي|افتح\s*لي|تفتح|شغل|زياره)?\s*(صفحه\s*)?(المعلم|المدرس|المرشد|المساعد)\s*الذكي$/,
      /^(افتح|افتحلي|افتح\s*لي|روح|وديني|خذني|خدني)?\s*( الي| علي| عند| ل)?\s*معلم\s*الذكاء\s*الاصطناعي$/,
      /^(روح|وديني|خذني|خدني|انتقل|الذهاب|الانتقال|نروح|اروح)\s*(الي|علي|عند|ل)?\s*(صفحه\s*)?(المعلم|المدرس|المرشد|المساعد)\s*الذكي$/,
      /^(بدي|بدنا|اريد|ابغي|حابب|نفسي|محتاج)\s*(اروح|نروح|انتقل|افتح|ادرس|نتعلم|اتعلم|احكي|نتكلم|اسال)\s*(عند|مع|الي|علي|ل)?\s*(صفحه\s*)?(المعلم|المدرس|المرشد|المساعد)\s*الذكي$/,
      /^(بدي|بدنا|اريد|ابغي|حابب|محتاج)\s*(عند|الي|علي|ل)?\s*(صفحه\s*)?(المعلم|المدرس|المرشد|المساعد)\s*الذكي$/,
      /^(تكلم|احكي|حدث|تحدث|دردش)\s*(مع|عند)\s*(المعلم|المدرس|المرشد|المساعد)\s*الذكي$/,
      /^((?:i\s+want\s+to\s+|id\s+like\s+to\s+|let\s+me\s+|take\s+me\s+to\s+|bring\s+me\s+to\s+)?(?:open|go\s*to|visit|talk\s*to|ask|chat\s*with|see)\s+(?:the\s+)?|(?:take|bring)\s+me\s+to\s+(?:the\s+)?)?(?:ai|smart|intelligent|virtual)\s*(?:tutor|teacher|assistant)$/,
    ],
  },
  {
    type: "navigate",
    to: "/dashboard",
    patterns: [
      /^(افتح|افتحلي|افتح\s*لي|روح\s*(الي|علي|ل)?|وديني\s*(الي|علي|ل)?|خذني\s*(الي|علي|ل)?|خدني\s*(الي|علي|ل)?|ارجع\s*(الي|علي|ل)?|الذهاب\s*(الي|علي|ل)?|الانتقال\s*(الي|علي|ل)?|بدي\s*(اروح\s*(الي|علي|ل)?|افتح)?)?\s*(لوحه\s*التحكم|الرييسيه|الصفحه\s*الرييسيه|الداشبورد)$/,
      /^((?:i\s+want\s+to\s+|take\s+me\s+to\s+)?(?:open|go\s*to|show|view)\s+(?:the\s+)?|take\s+me\s+(?:to\s+(?:the\s+)?)?)?(dashboard|home(\s*page)?|main\s*page)$/,
    ],
  },
  {
    type: "navigate",
    to: "/lectures?subject=math",
    patterns: [
      /^(افتح|افتحلي|افتح\s*لي|شاهد|عرض|روح\s*(الي|علي|ل)?|وديني\s*(الي|علي|ل)?|خذني\s*(الي|علي|ل)?|خدني\s*(الي|علي|ل)?|الانتقال\s*(الي|علي|ل)?)?\s*(صفحه\s*)?(دروس|محاضرات)\s*(الرياضيات|الرياضه)$/,
      /^(قائمه\s*الدروس|الدروس|المحاضرات|دروسي|محاضراتي)$/,
      /^(افتح|افتحلي|افتح\s*لي|روح\s*(الي|علي|ل)?|وديني\s*(الي|علي|ل)?|خذني\s*(الي|علي|ل)?)\s*(صفحه\s*)?(الدروس|المحاضرات|دروسي|محاضراتي)$/,
      /^(بدي|بدنا|اريد|حابب)\s*(اشوف|احضر|افتح|اروح\s*(الي|علي|عند|ل)?)\s*(دروسي|محاضراتي|الدروس|المحاضرات|دروس\s*(الرياضيات|الرياضه)?)$/,
      /^(بدي|بدنا|اريد|حابب)\s*(دروسي|محاضراتي|دروس\s*(الرياضيات|الرياضه)?)$/,
      /^(ورجيني|فرجيني|اعرض\s*لي|اعرضلي|ارني)\s*(دروسي|محاضراتي|الدروس|المحاضرات|دروس\s*(الرياضيات|الرياضه)?)$/,
      /^((?:i\s+want\s+to\s+|let\s+me\s+)?(?:show|open|view|see|go\s*to)\s+(?:me\s+)?(?:my\s+|the\s+)?|take\s+me\s+to\s+(?:my\s+|the\s+)?)(lessons|lectures|math\s*(lessons|lectures))$/,
      /^(?:my\s+)?(lessons|lectures|math\s*(lessons|lectures))$/,
    ],
  },
  {
    type: "navigate",
    to: "/math-unit",
    patterns: [
      /^(افتح|افتحلي|افتح\s*لي|تصفح|روح\s*(الي|علي|ل)?|وديني\s*(الي|علي|ل)?|خذني\s*(الي|علي|ل)?|خدني\s*(الي|علي|ل)?|بدي\s*(اروح\s*(الي|علي|ل)?|افتح)?)?\s*(وحده\s*الرياضيات|الوحده\s*الاولي|وحده\s*المنهج)$/,
      /^((?:i\s+want\s+to\s+)?(?:open|go\s*to|view|show)\s+(?:the\s+)?|take\s+me\s+to\s+(?:the\s+)?)?(math\s*unit|unit\s*(one|1)|first\s*unit)$/,
    ],
  },
  {
    type: "navigate",
    to: "/study-plan",
    patterns: [
      /^(افتح|افتحلي|افتح\s*لي|عرض|روح\s*(الي|علي|ل)?|وديني\s*(الي|علي|ل)?|خذني\s*(الي|علي|ل)?|خدني\s*(الي|علي|ل)?)?\s*(خطه\s*الدراسه|جدول\s*الدراسه|خطتي\s*الدراسيه|الخطه\s*الدراسيه|خطتي|جدولي\s*الدراسي)$/,
      /^(بدي|بدنا|اريد|حابب)\s*(اشوف\s*|افتح\s*|اروح\s*(الي|علي|ل)?\s*)?(خطه\s*الدراسه|جدول\s*الدراسه|خطتي\s*الدراسيه|الخطه\s*الدراسيه|خطتي|جدولي\s*الدراسي)$/,
      /^(ورجيني|فرجيني|اعرض\s*لي|اعرضلي)\s*(خطه\s*الدراسه|جدول\s*الدراسه|خطتي\s*الدراسيه|الخطه\s*الدراسيه|خطتي|جدولي\s*الدراسي)$/,
      /^((?:i\s+want\s+to\s+)?(?:open|show|view|see|go\s*to)\s+(?:me\s+)?(?:my\s+|the\s+)?|take\s+me\s+to\s+(?:my\s+|the\s+)?)?study\s*plan$/,
      /^my\s*study\s*plan$/,
    ],
  },
  {
    type: "navigate",
    to: "/progress",
    patterns: [
      /^(افتح|افتحلي|افتح\s*لي|عرض|روح\s*(الي|علي|ل)?|وديني\s*(الي|علي|ل)?|خذني\s*(الي|علي|ل)?|خدني\s*(الي|علي|ل)?)?\s*(تقدمي|صفحه\s*التقدم|سجل\s*التقدم|نسبه\s*التقدم|نسبه\s*تقدمي|مستوي\s*تقدمي|لوحه\s*الانجاز|انجازي)$/,
      /^(بدي|بدنا|اريد|حابب)\s*(اشوف\s*|افتح\s*|اروح\s*(الي|علي|ل)?\s*)?(تقدمي|صفحه\s*التقدم|سجل\s*التقدم|نسبه\s*التقدم|نسبه\s*تقدمي|لوحه\s*الانجاز|انجازي)$/,
      /^(ورجيني|فرجيني|اعرض\s*لي|اعرضلي)\s*(تقدمي|صفحه\s*التقدم|سجل\s*التقدم|نسبه\s*التقدم|نسبه\s*تقدمي|لوحه\s*الانجاز|انجازي)$/,
      /^((?:i\s+want\s+to\s+)?(?:open|show|view|see|check|go\s*to)\s+(?:me\s+)?(?:my\s+|the\s+)?|take\s+me\s+to\s+(?:my\s+|the\s+)?)?progress(\s*page)?$/,
      /^my\s*progress$/,
    ],
  },
  {
    type: "navigate",
    to: "/lesson/1-1",
    patterns: [
      /^(افتح|افتحلي|افتح\s*لي|تصفح|عرض|روح\s*(الي|علي|ل)?|وديني\s*(الي|علي|ل)?|خذني\s*(الي|علي|ل)?|خدني\s*(الي|علي|ل)?)?\s*(الكتاب\s*التفاعلي|كتاب\s*الرياضيات\s*التفاعلي)$/,
      /^(بدي|بدنا|اريد|حابب)\s*(افتح\s*|اشوف\s*|اروح\s*(الي|علي|ل)?\s*)?(الكتاب\s*التفاعلي|كتاب\s*الرياضيات\s*التفاعلي)$/,
      /^(ورجيني|فرجيني|اعرض\s*لي|اعرضلي)\s*(الكتاب\s*التفاعلي|كتاب\s*الرياضيات\s*التفاعلي)$/,
      /^((?:i\s+want\s+to\s+)?(?:open|show|view|see|go\s*to)\s+(?:the\s+)?|take\s+me\s+to\s+(?:the\s+)?)?interactive\s*(math\s*)?book$/,
    ],
  },
];

/**
 * Match a raw voice transcription utterance to a verified navigation route or contextual action.
 * @param {string} text Raw transcription from STT.
 * @returns {{type: 'navigate', to: string}|{type: string}|null}
 */
export function matchVoiceCommand(text) {
  // 1. Validate type and size constraints
  if (typeof text !== "string") return null;
  const raw = text.trim();
  if (!raw || raw.length > 200) return null;
  if (raw.split(/\s+/).length > 20) return null;

  // 2. Reject quoted commands or quoted content
  if (QUOTE_CHARS.some((q) => raw.includes(q))) {
    return null;
  }

  // 3. Reject hostile input, injection, and path traversal
  if (HOSTILE_PATTERNS.some((p) => p.test(raw))) {
    return null;
  }

  // Polite explain/read requests remain commands even when phrased as questions.
  const explicitCore = stripPoliteWrappers(normalizeVoiceInput(raw));
  for (const intent of INTENTS) {
    if (intent.type === "action" && ["readQuestion", "explainQuestion", "repeat"].includes(intent.action) &&
      intent.patterns.some(pattern => pattern.test(explicitCore))) return { type: intent.action };
  }

  // 4. Reject ordinary questions and inquiries
  const destinationQuery = stripPoliteWrappers(normalizeVoiceInput(raw));
  if (/^(وين|اين) (المعلم|المدرس) الذكي$/.test(destinationQuery)) return { type:'unavailable' };
  if (QUESTION_INDICATORS.some((p) => p.test(raw))) {
    return null;
  }

  // 5. Normalize text
  const normalized = normalizeVoiceInput(raw);
  if (!normalized) return null;

  // 6. Secondary check on normalized text for question indicators and reported speech / false positives
  if (
    QUESTION_INDICATORS.some((p) => p.test(normalized)) ||
    REPORTED_OR_FALSE_POSITIVE_PATTERNS.some((p) => p.test(normalized))
  ) {
    return null;
  }

  // 7. Strip optional polite and wake wrappers
  const core = stripPoliteWrappers(normalized);
  if (!core) return null;
  if (/^(?:the )?(?:ai tutor|chatbot|smart teacher)$|^(?:المعلم الذكي|الشات بوت)$/.test(core)) return null;

  if (
    QUESTION_INDICATORS.some((p) => p.test(core)) ||
    REPORTED_OR_FALSE_POSITIVE_PATTERNS.some((p) => p.test(core))
  ) {
    return null;
  }

  // 8. Match against anchored intent definitions
  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(core)) {
        if (intent.type === "navigate") {
          return ALLOWLISTED_ROUTES.includes(intent.to) ? { type: "navigate", to: intent.to } : { type: "unavailable" };
        }
        if (intent.type === "action") {
          return ALLOWED_ACTIONS.includes(intent.action) ? { type: intent.action } : { type: "unavailable" };
        }
      }
    }
  }

  return null;
}

export default matchVoiceCommand;
