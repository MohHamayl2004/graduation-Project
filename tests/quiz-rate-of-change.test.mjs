// The «ضع دائرة» quiz on average rate of change: each question is re-solved here
// numerically, so a wrong answer key cannot reach a student.
import test from "node:test";
import assert from "node:assert/strict";
import { rateOfChangeQuiz as quiz } from "../src/data/quizzes/rateOfChange.js";

const avg = (f, a, b) => (f(b) - f(a)) / (b - a);
const digits = (s) => s.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/−/g, "-");
const choice = (id) => { const q = quiz.questions.find((x) => x.id === id); return digits(q.choices.find((c) => c.key === q.answer).text); };
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} ≠ ${b}`);
// Solve g(x) = target for x on [lo, hi] by bisection (g increasing).
const solve = (g, target, lo, hi) => { for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; (g(mid) < target ? (lo = mid) : (hi = mid)); } return (lo + hi) / 2; };

test("ten circle-the-answer questions, four choices each, one right answer and a worked solution", () => {
  assert.equal(quiz.questions.length, 10);
  assert.equal(new Set(quiz.questions.map((q) => q.id)).size, 10);
  for (const q of quiz.questions) {
    assert.deepEqual(q.choices.map((c) => c.key), ["أ", "ب", "ج", "د"], q.id);
    assert.equal(new Set(q.choices.map((c) => c.text)).size, 4, `${q.id}: duplicate choices`);
    assert.ok(q.choices.some((c) => c.key === q.answer), q.id);
    assert.ok(q.solution.length >= 2, `${q.id}: needs a worked solution`);
    assert.ok(q.stem.includes("؟") || q.stem.endsWith(":"), `${q.id}: stem should end as a question`);
  }
});

test("each answer key matches the calculation", () => {
  near(avg((x) => x * x - 8 * x + 18, 4, 5), Number(choice("q1")), "q1");
  near(avg((x) => Math.abs(x - 2), 2, 3), Number(choice("q2")), "q2");
  near(2 * (3 - -1), Number(choice("q3")), "q3: change = average × Δx");
  near(solve((a) => avg((x) => 3 * x * x - 2 * x, a, 2 * a), 16, 0.01, 50), Number(choice("q4")), "q4");
  near(solve((a) => avg((x) => 2 * x * x + 3 * x, a, 3 * a), 11, 0.01, 50), Number(choice("q5")), "q5");
  // q6: 3(b + 2) = -6 for any constant a; b = 2 would be an empty interval.
  for (const a of [0, 5]) near(avg((x) => 3 * x * x + a, 2, -4), -6, "q6 with b = -4");
  assert.equal(choice("q6"), "-4");
  // q7: slope 4 through (-1, -1).
  const f7 = (x) => 4 * x + 3; near(f7(-1), -1, "q7 passes through (-1,-1)"); near(avg(f7, 0, 7), 4, "q7 slope");
  assert.equal(choice("q7").replace(/\s/g, ""), "ق(س)=4س+3");
  // q8: q(x) = x k(x), k(3) = -3, average on [-1, 3] = -2.
  const k = { 3: -3, [-1]: Number(choice("q8")) };
  near((3 * k[3] - (-1) * k[-1]) / 4, -2, "q8");
  // q9: q(5) - q(2) = 30 and q(2) q(5) = 15 (e.g. q(2) = -0.4943..., any pair works).
  const q2 = (-30 + Math.sqrt(900 + 60)) / 2, q5 = q2 + 30;
  near(q2 * q5, 15, "q9 pair"); near(avg((x) => 9 / (x === 2 ? q2 : q5), 2, 5), Number(choice("q9")), "q9");
  // q10: q(4) = e q(1); average of ln q on [1, 4].
  const q1v = 2.7, ln = (x) => Math.log(x === 1 ? q1v : Math.E * q1v);
  near(avg(ln, 1, 4), 1 / 3, "q10"); assert.equal(choice("q10").replace(/\s/g, ""), "{1|3}");
});

test("the math markup renders fractions, nested fractions and subscripts", async () => {
  const { parseMath } = await import("../src/pages/Quizzes/mathMarkup.js");
  assert.deepEqual(parseMath("{١|٣}"), [{ num: ["١"], den: ["٣"] }]);
  assert.deepEqual(parseMath("س_{٢}"), ["س", { sub: ["٢"] }]);
  assert.deepEqual(parseMath("{{٩|ق} − ١|٣}"), [{ num: [{ num: ["٩"], den: ["ق"] }, " − ١"], den: ["٣"] }]);
  assert.deepEqual(parseMath("[٤ ، ٥]"), ["[٤ ، ٥]"], "brackets stay text");
  // Every string in the quiz parses with balanced braces (no stray { or } shown to students).
  const flat = (nodes) => nodes.flatMap((n) => typeof n === "string" ? [n] : [...flat(n.num || []), ...flat(n.den || []), ...flat(n.sub || [])]);
  for (const q of quiz.questions) for (const text of [q.stem, ...q.choices.map((c) => c.text), ...q.solution]) {
    assert.ok(!flat(parseMath(text)).some((s) => /[{}]/.test(s)), `${q.id}: unparsed markup in "${text}"`);
  }
});
