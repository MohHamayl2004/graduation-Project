import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

// Server rendering with controlled API fixtures, not a live browser or database.
test("dashboard renders honest empty, loaded, partial-failure and loading states", async () => {
  const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  const originalWindow = globalThis.window;
  globalThis.window = { location: { hostname: "localhost" }, matchMedia: () => ({ matches: true }) };
  try {
    await server.ssrLoadModule("/src/i18n/index.js");
    const { DashboardScreen } = await server.ssrLoadModule("/src/pages/Dashboard/index.jsx");
    const { AuthProvider } = await server.ssrLoadModule("/src/context/AuthContext.jsx");
    const { default: Button } = await server.ssrLoadModule("/src/components/common/Button.jsx");
    const busyButton = renderToStaticMarkup(React.createElement(Button, { press: true, loading: true }, "جارٍ التحميل"));
    assert.match(busyButton, /nipras-press/);
    assert.match(busyButton, /aria-busy="true"/);
    assert.match(busyButton, /disabled/);
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(Button, { variant: "secondary", press: true }, "رجوع")), /nipras-press/);
    const user = { fullName: "طالب الاختبار", stream: "scientific" };
    const ready = (data = []) => ({ data, loading: false, error: null });
    const render = (resources) => renderToStaticMarkup(React.createElement(AuthProvider, null,
      React.createElement(StaticRouter, { location: "/dashboard" }, React.createElement(DashboardScreen, { user, resources, now: new Date("2026-11-03T08:00:00Z"), onRefresh() {} }))));
    const empty = render({ plans: ready(), materials: ready(), chats: ready() });
    assert.match(empty, /يومك الدراسي يبدأ بخطة/);
    assert.match(empty, /لا توجد خطط محفوظة/);
    assert.match(empty, /لا توجد مواد محفوظة/);
    assert.match(empty, /لا توجد محادثات محفوظة/);
    assert.doesNotMatch(empty, /78%|68%|9 أيام|12:45|Chemistry_Chapter3/);
    assert.match(empty, /dir="rtl"/);
    assert.match(empty, /إحصاءات الإنجاز والدرجات ليست متاحة/);
    const resources = {
      plans: ready([{ _id: "p1", title: "خطة الاختبار", type: "daily", periodStart: "2026-11-03", generated: { sessions: [{ id: "s1", date: "2026-11-03", start: "10:30", end: "11:00", minutes: 30, lessonId: "math", lessonTitle: "درس الاختبار", subjectTitle: "الرياضيات" }] } }]),
      materials: ready([{ _id: "m1", title: "ملف محفوظ <script>alert(1)</script>", status: "uploaded", uploadedAt: "2026-11-03T06:00:00Z" }]),
      chats: ready([{ id: "c1", title: "محادثة الاختبار", updatedAt: "2026-11-03T07:00:00Z" }])
    };
    const loaded = render(resources);
    assert.match(loaded, /درس الاختبار/);
    assert.match(loaded, /دقيقة مخططة/);
    assert.match(loaded, /study-plan\?plan=p1/);
    assert.match(loaded, /ai-tutor\?chat=c1/);
    assert.match(loaded, /تم حفظ الملف فقط/);
    assert.doesNotMatch(loaded, /<script>/);
    assert.match(loaded, /&lt;script&gt;/);
    const partial = render({ ...resources, chats: { data: [], loading: false, error: new Error("فشل تحميل المحادثات") } });
    assert.match(partial, /role="alert"/);
    assert.match(partial, /فشل تحميل المحادثات/);
    assert.match(partial, /درس الاختبار/);
    assert.match(partial, /تم حفظ الملف فقط/);
    const loading = render(Object.fromEntries(["plans", "materials", "chats"].map((key) => [key, { data: [], loading: true, error: null }])));
    assert.match(loading, /aria-busy="true"/);
    assert.match(loading, /disabled/);
    assert.doesNotMatch(loading, /لا توجد خطط محفوظة/);
  } finally {
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    await server.close();
  }
});
