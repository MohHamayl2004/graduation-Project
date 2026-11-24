import test from "node:test";
import assert from "node:assert/strict";
import { matchVoiceCommand } from "../src/companion/voiceNavigation.js";

test("MSA, Levantine and English commands select only the intended student actions", () => {
  const cases = [
    ["افتح المعلم الذكي", { type: "unavailable" }],
    ["افتح المدرس الذكي", { type: "unavailable" }],
    [
      "يا نبراس، بدي أروح على المعلم الذكي",
      { type: "unavailable" },
    ],
    [
      "يا نبراس بدي أروح عند المعلم الذكي",
      { type: "unavailable" },
    ],
    ["خدني عند المعلم الذكي", { type: "unavailable" }],
    ["بدي أحكي مع المرشد الذكي", { type: "unavailable" }],
    ["بدي أشوف دروسي", { type: "navigate", to: "/lectures?subject=math" }],
    ["افتحلي دروس الرياضيات", { type: "navigate", to: "/lectures?subject=math" }],
    ["افتح الكتاب التفاعلي", { type: "unavailable" }],
    ["ورجيني تقدمي", { type: "unavailable" }],
    ["بدي أشوف خطتي الدراسية", { type: "unavailable" }],
    ["افتح الخطة الدراسية", { type: "unavailable" }],
    ["خدني على الرئيسية", { type: "unavailable" }],
    ["ارجع للصفحة السابقة", { type: "unavailable" }],
    ["افتح الدرس الأول", { type: "unavailable" }],
    ["انتقل للدرس التالي", { type: "unavailable" }],
    ["اقرأ السؤال", { type: "readQuestion" }],
    ["اشرحلي هذا السؤال", { type: "explainQuestion" }],
    ["اشرحلي السؤال اللي قدامي", { type: "explainQuestion" }],
    ["وقف الكلام", { type: "stop" }],
    ["عيد الشرح", { type: "repeat" }],
    ["افتح الوحدة الأولى", { type: "unavailable" }],
    ["Open the AI tutor", { type: "unavailable" }],
    ["Take me to the AI tutor", { type: "unavailable" }],
    ["I want to talk to the smart teacher", { type: "unavailable" }],
    ["show my lessons", { type: "navigate", to: "/lectures?subject=math" }],
    ["open interactive book", { type: "unavailable" }],
    ["show my progress", { type: "unavailable" }],
    ["open study plan", { type: "unavailable" }],
    ["go back", { type: "unavailable" }],
    ["next lesson", { type: "unavailable" }],
    ["read the question", { type: "readQuestion" }],
    ["explain this question", { type: "explainQuestion" }],
    ["Can you explain this question?", { type: "explainQuestion" }],
    ["stop speaking", { type: "stop" }],
    ["repeat explanation", { type: "repeat" }],
    [
      "  اِفْتَحْ  المُعَلِّمَ الذَّكِيّ  ",
      { type: "unavailable" },
    ],
  ];
  for (const [input, expected] of cases)
    assert.deepEqual(matchVoiceCommand(input), expected, input);
});
test("educational questions, quoted commands, reported speech, ambiguity, injections and unsupported input never navigate", () => {
  for (const input of [
    "شو هو قانون مساحة الدائرة؟",
    "كيف افتح المعلم الذكي",
    "can you explain how to open a textbook",
    "ما معنى افتح المعلم الذكي",
    "قال المعلم افتح دروسي",
    "حكى لي الأستاذ روح عند المعلم الذكي",
    "قرأت عبارة افتح الكتاب التفاعلي",
    "the teacher said open the AI tutor",
    "he told me to open my study plan",
    "لا تفتح المعلم الذكي",
    "ما بدي أروح عند المعلم الذكي",
    "do not open the AI tutor",
    "المعلم الذكي كثير مفيد في الرياضيات",
    "the AI tutor is great for math",
    "افتح المعلم الذكي أو الخطة الدراسية",
    "open AI tutor or study plan",
    '"افتح المعلم الذكي"',
    "«افتح المعلم الذكي»",
    "افتح https://evil.test",
    "open javascript:alert(1)",
    "افتح لوحة الإدارة",
    "افتح المعلم الذكي ثم امسح حسابي",
    null,
    {},
    42,
    "",
    "x".repeat(2001),
  ])
    assert.equal(matchVoiceCommand(input), null, String(input));
});
test('teacher refuses requests to enter the tutor conversation', () => {
  for (const input of ['افتح المعلم الذكي','بدي أسأل المعلم','وين المعلم الذكي؟','خذني للمحادثة','افتح الشات بوت','أريد التحدث مع نبراس','بدي أحكي مع الأستاذ','Open the AI Tutor','I want to chat with the teacher','Take me to the chatbot']) {
    assert.deepEqual(matchVoiceCommand(input), {type:'unavailable'},input);
  }
  assert.equal(matchVoiceCommand('chatbot'),null);
});
