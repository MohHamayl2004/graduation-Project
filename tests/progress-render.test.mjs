import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

test("progress shows loading, error, unavailable and real plan states", async () => {
  const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  try {
    const { ProgressContent } = await server.ssrLoadModule("/src/pages/Progress/index.jsx");
    const render = (props) => renderToStaticMarkup(React.createElement(StaticRouter, null, React.createElement(ProgressContent, { days: 7, onDaysChange() {}, onRetry() {}, ...props })));
    assert.match(render({ loading: true }), /جارٍ تحميل بيانات التقدم/);
    assert.match(render({ error: "فشل الاتصال" }), /إعادة المحاولة/);
    const empty = render({ data: { plan: null } });
    assert.match(empty, /لم تنشئ خطة دراسية بعد/);
    assert.match(empty, /غير متاح/);
    assert.doesNotMatch(empty, /78%|14\/20|مدعوم بالذكاء الاصطناعي/);
    const populated = render({ data: { plan: { id: "p1", type: "daily", periodStart: "2026-11-08", scheduledSessions: 2 } } });
    assert.match(populated, /study-plan\?plan=p1/);
    assert.match(populated, /لم يبدأ تتبع إنجاز الجلسات/);
    assert.match(populated, /أجب عن أسئلة فيديوهات الدروس/);
    const mastered = render({ data: { plan: null, mastery: [{ lessonId: "math-u1-l1", lessonTitle: "متوسط التغير", answered: 4, correct: 1, share: 0.25, level: "weak", weakSkills: ["حساب Δس"] }] } });
    assert.match(mastered, /يحتاج تقوية/);
    assert.match(mastered, /راجع: حساب Δس/);
    assert.match(mastered, /أعد توليد خطتك/);
  } finally { await server.close(); }
});
