# NIPRAS Arabic-Only RTL Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every rendered NIPRAS interface into professional Palestinian Arabic with complete RTL behavior while preserving routes, APIs, interactions, styling, and responsive layouts.

**Architecture:** Keep `i18next` as the shared-copy system but initialize only Arabic resources and force Arabic document state. Translate page-local and mock-data copy in place, correct RTL layout with logical CSS utilities, isolate bidirectional form and mathematics content, and translate only backend errors that reach users.

**Tech Stack:** React 18, Vite 5, React Router 6, i18next/react-i18next, Tailwind CSS 3, Node.js built-in test runner, browser verification.

**Spec:** `docs/superpowers/specs/2026-09-20-arabic-only-rtl-experience-design.md`

## Global Constraints

- Arabic is the only runtime interface language; `lng` and `fallbackLng` are both exactly `ar`.
- Do not add a translation dependency or a second language context.
- Preserve all route paths, API paths, request/response fields, database fields, component names, filenames, and environment-variable names.
- Preserve behavior, responsive layouts, animations, lesson audio, and API contracts.
- Use `نبراس` in interface text; retain `NIPRAS` only in official visual assets or technical identifiers.
- Use natural Palestinian Arabic for conversational copy and clear standard Arabic for formal educational and account terminology.
- Keep email, passwords when appropriate, formulas, variables, numbers, and percentages in explicit directions that preserve their visual order.
- Do not modify `node_modules`, `.npm-cache`, generated `dist`, environment files, AI-model files, or lockfiles unless a dependency truly changes.
- Use the existing lockfile and do not introduce a package dependency.

## Review Focus

- A prior `?lng=en` URL, `nipras_language=en` local-storage value, or English browser preference must still render Arabic; covered by Task 1's runtime-configuration test and browser query-string check.
- Mobile RTL navigation must enter and exit from the inline-start edge without hiding content; covered by Task 2's static RTL assertions and Task 8's mobile browser pass.
- Email/password values and mathematical notation must not be visually reordered by global RTL; covered by Task 2 form assertions, Task 6 math assertions, and Task 8 visual checks.
- Interactive state changes must never reveal English copy after the initial render; covered by Tasks 3–7 source assertions and Task 8 interaction checks.
- Direct backend validation, authorization, and upload errors must be Arabic while developer logs remain unchanged; covered by Task 7's focused backend-source assertions.

---

### Task 1: Enforce Arabic-Only Runtime and Metadata

**Files:**
- Create: `tests/arabic-only-ui.test.mjs`
- Modify: `package.json`
- Modify: `src/i18n/index.js`
- Modify: `src/App.jsx`
- Modify: `index.html`
- Modify: `src/components/layout/Navbar.jsx`
- Modify: `src/pages/Login/index.jsx`
- Modify: `src/pages/Signup/index.jsx`
- Remove after use check: `src/components/layout/LanguageSwitcher.jsx`

**Interfaces:**
- Consumes: Existing Arabic JSON namespaces and `react-i18next` initialization.
- Produces: An Arabic-only i18n singleton; unconditional document `lang="ar"` and `dir="rtl"`; no user-accessible language-switching control.

- [ ] **Step 1: Add a built-in test command and the failing Arabic-runtime test**

Add `"test": "node --test tests/*.test.mjs"` to `package.json`, then create the test file with:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("runtime is Arabic-only and exposes no language switcher", async () => {
  const [i18n, app, html, navbar, login, signup] = await Promise.all([
    read("src/i18n/index.js"),
    read("src/App.jsx"),
    read("index.html"),
    read("src/components/layout/Navbar.jsx"),
    read("src/pages/Login/index.jsx"),
    read("src/pages/Signup/index.jsx")
  ]);

  assert.doesNotMatch(i18n, /LanguageDetector|localStorage|querystring|commonEn|navEn|authEn/);
  assert.match(i18n, /lng:\s*["']ar["']/);
  assert.match(i18n, /fallbackLng:\s*["']ar["']/);
  assert.match(app, /document\.documentElement\.lang\s*=\s*["']ar["']/);
  assert.match(app, /document\.documentElement\.dir\s*=\s*["']rtl["']/);
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /<title>نبراس \| معلّمك الذكي للتوجيهي<\/title>/);
  assert.doesNotMatch(`${navbar}\n${login}\n${signup}`, /LanguageSwitcher/);
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npm test -- --test-name-pattern="runtime is Arabic-only"`

Expected: FAIL because the detector, English resources, English HTML metadata, and switcher imports still exist.

- [ ] **Step 3: Implement Arabic-only initialization and document state**

Change `src/i18n/index.js` to the following structure:

```js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import commonAr from "../locales/ar/common.json";
import navAr from "../locales/ar/nav.json";
import authAr from "../locales/ar/auth.json";

i18n.use(initReactI18next).init({
  resources: { ar: { common: commonAr, nav: navAr, auth: authAr } },
  lng: "ar",
  fallbackLng: "ar",
  supportedLngs: ["ar"],
  ns: ["common", "nav", "auth"],
  defaultNS: "common",
  interpolation: { escapeValue: false }
});

export default i18n;
```

Replace the language-dependent effect in `src/App.jsx` with an effect that assigns `lang = "ar"` and `dir = "rtl"` once. Remove the switcher imports and elements from the navbar, login, and signup pages. Delete `LanguageSwitcher.jsx` only after `rg -n "LanguageSwitcher|changeLanguage" src` returns no consumers.

Set the initial HTML element to `<html lang="ar" dir="rtl">`. Use title `نبراس | معلّمك الذكي للتوجيهي`, description `نبراس منصّة تعليمية ذكية بتساعد طلبة التوجيهي يفهموا دروسهم، يتدرّبوا على الاختبارات، ويتابعوا تقدّمهم.`, and matching Open Graph title and description.

- [ ] **Step 4: Run the focused test and full current suite**

Run: `npm test -- --test-name-pattern="runtime is Arabic-only"`

Expected: PASS.

Run: `npm test`

Expected: PASS with one test and zero failures.

### Task 2: Translate Shared Layout, Authentication, and Form Direction

**Files:**
- Modify: `tests/arabic-only-ui.test.mjs`
- Modify: `src/locales/ar/common.json`
- Modify: `src/locales/ar/nav.json`
- Modify: `src/locales/ar/auth.json`
- Modify: `src/components/layout/Navbar.jsx`
- Modify: `src/components/layout/Sidebar.jsx`
- Modify: `src/components/layout/Footer.jsx`
- Modify: `src/components/common/EmptyState.jsx`
- Modify: `src/components/common/LoadingSpinner.jsx`
- Modify: `src/components/common/Modal.jsx`
- Modify: `src/pages/Login/index.jsx`
- Modify: `src/pages/Signup/index.jsx`
- Modify: `src/data/userProfile.js`

**Interfaces:**
- Consumes: Arabic-only namespaces from Task 1.
- Produces: Shared Arabic navigation/authentication copy and RTL-safe form controls used by all routes.

- [ ] **Step 1: Append a failing shared/authentication test**

```js
test("shared layout and authentication are Arabic and bidi-safe", async () => {
  const paths = [
    "src/locales/ar/common.json", "src/locales/ar/nav.json", "src/locales/ar/auth.json",
    "src/components/layout/Navbar.jsx", "src/components/layout/Sidebar.jsx",
    "src/components/layout/Footer.jsx", "src/pages/Login/index.jsx",
    "src/pages/Signup/index.jsx", "src/data/userProfile.js"
  ];
  const sources = (await Promise.all(paths.map(read))).join("\n");
  for (const phrase of ["Dashboard", "Upload Material", "AI Tutor", "Lectures", "Tawjihi Science", 'aria-label="Primary"']) {
    assert.doesNotMatch(sources, new RegExp(phrase));
  }
  assert.match(sources, /الصفحة الرئيسية/);
  assert.match(sources, /معلّم نبراس الذكي|المعلّم الذكي/);
  assert.match(await read("src/pages/Login/index.jsx"), /type="email"[\s\S]*?dir="ltr"/);
  assert.match(await read("src/pages/Signup/index.jsx"), /type="email"[\s\S]*?dir="ltr"/);
});
```

- [ ] **Step 2: Verify the shared/authentication test fails**

Run: `npm test -- --test-name-pattern="shared layout and authentication"`

Expected: FAIL on current English labels, landmark text, user stream, or missing input direction.

- [ ] **Step 3: Apply the approved terminology and form behavior**

Use these canonical shared labels: `الصفحة الرئيسية`, `ارفع مادتك`, `المواد التعليمية`, `المعلّم الذكي`, `الدروس`, `الاختبارات`, `متابعة التقدّم`, `الخطة الدراسية`, `الإعدادات`, `الإشعارات`, `المساعدة`, `فتح قائمة التنقّل`, and `إغلاق قائمة التنقّل`.

Use `نبراس` as the text brand, `تعلّم أذكى، لمستقبل أفضل` as the tagline, and Arabic footer links for about, privacy, terms, and support. Update the copyright year to the current static project year only if an existing product requirement supplies it; otherwise retain the year while translating the wording.

Use `أهلًا برجعتك` for the login greeting, `تسجيل الدخول`, `إنشاء حساب`, `البريد الإلكتروني`, `كلمة المرور`, and natural Palestinian supporting copy. Keep Google as an official provider name where displayed. Change the mock student name to `محمد حمايل` and stream to `التوجيهي العلمي`.

Set email inputs to `dir="ltr"` and password inputs to `dir="ltr"`. Keep surrounding labels and validation messages RTL. Place eye icons with logical `start/end` utilities. Translate shared ARIA labels and change the sidebar landmark from `Primary` to `التنقّل الرئيسي`. Replace physical alignment and padding utilities affecting shared RTL flow with logical equivalents.

- [ ] **Step 4: Verify the shared/authentication test and suite pass**

Run: `npm test -- --test-name-pattern="shared layout and authentication"`

Expected: PASS.

Run: `npm test`

Expected: PASS with zero failures.

### Task 3: Translate Landing and Material Analysis Flows

**Files:**
- Modify: `tests/arabic-only-ui.test.mjs`
- Modify: `src/pages/Landing/index.jsx`
- Modify: `src/pages/Analysis/index.jsx`

**Interfaces:**
- Consumes: Arabic shared navigation, logo, footer, buttons, and sidebar from Task 2.
- Produces: Arabic marketing, onboarding, showcase, upload-analysis states, and cancellation/status copy.

- [ ] **Step 1: Append a failing landing/analysis test**

```js
test("landing and analysis flows contain no known English interface copy", async () => {
  const source = `${await read("src/pages/Landing/index.jsx")}\n${await read("src/pages/Analysis/index.jsx")}`;
  for (const phrase of [
    "Get Started Free", "Start Learning Free", "Create Free Account", "How It Works",
    "AI is analyzing your material", "Upload Received", "Document Chunking",
    "Embedding Generation", "Knowledge Retrieval", "Lecture Generation",
    "Quiz Generation", "Analyzed", "Cancel Processing", "Search your library"
  ]) assert.doesNotMatch(source, new RegExp(phrase));
  assert.match(source, /خلّينا نبلّش|ابدأ التعلّم/);
  assert.match(source, /جاري تحليل مادتك/);
});
```

- [ ] **Step 2: Verify the landing/analysis test fails**

Run: `npm test -- --test-name-pattern="landing and analysis"`

Expected: FAIL because both pages still contain English headings, controls, and status steps.

- [ ] **Step 3: Translate visible copy and correct RTL presentation**

Translate all landing navigation, hero, feature, workflow, statistics, showcase, testimonial, footer, and call-to-action text. Use concise Palestinian calls to action such as `خلّينا نبلّش`, `ابدأ التعلّم`, `اسأل نبراس`, and `ابدأ رحلتك`. Preserve animation timings and element structure.

Translate every analysis step, file-processing status, percentage label, estimated-time label, cancel action, search placeholder, and completion transition copy. Preserve filenames such as `Chemistry_Chapter3.pdf` as user-provided technical content unless the mock file is intentionally renamed consistently.

Replace text-direction utilities with logical forms. Flip only ArrowRight/Chevron icons used to express forward/back navigation by adding `rtl:-scale-x-100`; leave neutral icons unchanged. Keep decorative absolute-positioned landing blobs where their placement is compositional rather than semantic.

- [ ] **Step 4: Run the focused and full test suites**

Run: `npm test -- --test-name-pattern="landing and analysis"`

Expected: PASS.

Run: `npm test`

Expected: PASS with zero failures.

### Task 4: Translate Dashboard, Lectures, Study Plan, Progress, and Quiz Data

**Files:**
- Modify: `tests/arabic-only-ui.test.mjs`
- Modify: `src/pages/Dashboard/index.jsx`
- Modify: `src/pages/Lectures/index.jsx`
- Modify: `src/pages/StudyPlan/index.jsx`
- Modify: `src/pages/Progress/index.jsx`
- Modify: `src/pages/Quizzes/index.jsx`
- Modify: `src/data/mockDashboard.js`
- Modify: `src/data/mockLectures.js`
- Modify: `src/data/mockStudyPlan.js`
- Modify: `src/data/mockProgress.js`
- Modify: `src/data/mockQuizzes.js`

**Interfaces:**
- Consumes: Shared Arabic layout and stable mock-data object shapes.
- Produces: Arabic learning dashboard, lecture library, plan, progress reporting, and quiz UI without changing IDs or state logic.

- [ ] **Step 1: Append a failing learning-pages test**

```js
test("dashboard, learning pages, and rendered mock data are Arabic", async () => {
  const paths = [
    "src/pages/Dashboard/index.jsx", "src/pages/Lectures/index.jsx",
    "src/pages/StudyPlan/index.jsx", "src/pages/Progress/index.jsx",
    "src/pages/Quizzes/index.jsx", "src/data/mockDashboard.js",
    "src/data/mockLectures.js", "src/data/mockStudyPlan.js",
    "src/data/mockProgress.js", "src/data/mockQuizzes.js"
  ];
  const source = (await Promise.all(paths.map(read))).join("\n");
  for (const phrase of [
    "Ask AI", "Continue Learning", "All Subjects", "Start Suggested Lesson",
    "Study Plan", "Start", "Skip", "Next Question", "Chemistry", "Physics",
    "Biology", "Atomic Structures", "Review Organic Chemistry Fundamentals",
    "The complete transfer of one or more electrons"
  ]) assert.doesNotMatch(source, new RegExp(phrase));
  assert.match(source, /اسأل نبراس/);
  assert.match(source, /كمّل تعلّمك/);
  assert.match(source, /الخطة الدراسية/);
  assert.match(source, /الإجابة مش صحيحة|إجابة صحيحة/);
});
```

- [ ] **Step 2: Verify the learning-pages test fails**

Run: `npm test -- --test-name-pattern="dashboard, learning pages"`

Expected: FAIL on current page literals and English mock subjects/tasks/questions.

- [ ] **Step 3: Translate pages and mock data while preserving behavior**

Translate headings, summaries, filters, button labels, tabs, cards, legends, dates, durations, priorities, quiz prompts, answer choices, correctness feedback, and empty/loading states. Use `اسأل نبراس`, `كمّل تعلّمك`, `ثبّت إجابتك`, `السؤال التالي`, `السابق`, `التالي`, and `إنهاء` consistently.

Translate mock subject names to `الكيمياء`, `الفيزياء`, `الرياضيات`, `الأحياء`, and `اللغة العربية`; translate lesson and task titles, weekday abbreviations, priorities, schedule blocks, and completed-lecture dates/durations into readable Arabic. Keep IDs, color tokens, numeric mastery values, and correct-answer flags unchanged.

Use logical alignment utilities for cards, table-like rows, filters, schedule blocks, and quiz answers. Correct previous/next arrows for RTL. Keep numeric values stable and wrap mixed numeric content with suitable `dir` or `bdi` when browser rendering would otherwise reorder it.

- [ ] **Step 4: Run the focused and full test suites**

Run: `npm test -- --test-name-pattern="dashboard, learning pages"`

Expected: PASS.

Run: `npm test`

Expected: PASS with zero failures.

### Task 5: Translate and Protect Lesson Mathematics and Controls

**Files:**
- Modify: `tests/arabic-only-ui.test.mjs`
- Modify: `src/pages/Lesson/index.jsx`
- Modify: `src/pages/Lesson/PlayerBar.jsx`
- Modify: `src/pages/Lesson/Reveal.jsx`
- Modify: `src/pages/Lesson/TutorHelper.jsx`
- Modify: `src/pages/Lesson/CurveChart.jsx`
- Modify: `src/pages/Lesson/slides.js`
- Modify: `src/data/mockLesson.js`

**Interfaces:**
- Consumes: Existing lesson object structure, audio files, slide IDs, keyboard navigation, and graph data.
- Produces: Arabic lesson chrome and content with formulas isolated from global RTL and correct navigation semantics.

- [ ] **Step 1: Append a failing lesson test**

```js
test("lesson controls are Arabic and formulas declare a safe direction", async () => {
  const paths = [
    "src/pages/Lesson/index.jsx", "src/pages/Lesson/PlayerBar.jsx",
    "src/pages/Lesson/Reveal.jsx", "src/pages/Lesson/TutorHelper.jsx",
    "src/pages/Lesson/CurveChart.jsx", "src/pages/Lesson/slides.js",
    "src/data/mockLesson.js"
  ];
  const source = (await Promise.all(paths.map(read))).join("\n");
  for (const phrase of ["Previous", "Next", "Replay", "Try Again", "Check Answer", "Show Answer"]) {
    assert.doesNotMatch(source, new RegExp(phrase));
  }
  assert.match(source, /السابق/);
  assert.match(source, /التالي/);
  assert.match(source, /شغّل مرة ثانية/);
  assert.match(source, /dir=["']ltr["']/);
  assert.match(source, /Δس|Δص/);
});
```

- [ ] **Step 2: Verify the lesson test fails**

Run: `npm test -- --test-name-pattern="lesson controls"`

Expected: FAIL on English lesson controls or missing explicit formula direction.

- [ ] **Step 3: Translate lesson UI and isolate mathematical notation**

Translate control labels, hints, answer feedback, tutor prompts, graph instructions, replay text, accessibility labels, and any remaining English lesson strings. Preserve the existing Arabic lesson narration and educational content, correcting encoding only if the source itself is invalid UTF-8 rather than merely displayed incorrectly by the terminal.

Wrap equation and calculation containers in `dir="ltr"` when the expression's order is mathematical/Latin, while keeping surrounding explanations RTL. Use `<bdi>` or isolated spans for mixed Arabic variables and numeric values where needed. Preserve `Δس`, `Δص`, fractions, exponents, operators, graph coordinates, and keyboard behavior.

Confirm that the button performing the semantic “next” action has the Arabic label `التالي` and the visually correct RTL chevron; likewise use `السابق` for the reverse action. Do not mirror play, pause, repeat, or check icons.

- [ ] **Step 4: Run the focused and full test suites**

Run: `npm test -- --test-name-pattern="lesson controls"`

Expected: PASS.

Run: `npm test`

Expected: PASS with zero failures.

### Task 6: Translate AI Tutor and Correct Chat RTL Layout

**Files:**
- Modify: `tests/arabic-only-ui.test.mjs`
- Modify: `src/pages/AITutor/index.jsx`
- Modify: `src/pages/AITutor/MainChat.jsx`
- Modify: `src/pages/AITutor/RightStudyPanel.jsx`

**Interfaces:**
- Consumes: Existing client-only chat state, study-panel cards, and shared sidebar.
- Produces: Palestinian Arabic tutor conversations, suggestions, status announcements, source labels, and speaker-aligned RTL bubbles.

- [ ] **Step 1: Append a failing AI-tutor test**

```js
test("AI tutor uses Palestinian Arabic and keeps the accuracy warning", async () => {
  const source = `${await read("src/pages/AITutor/MainChat.jsx")}\n${await read("src/pages/AITutor/RightStudyPanel.jsx")}`;
  for (const phrase of [
    "NIPRAS AI Tutor", "Practice quiz", "Summarize", "Explain electronegativity",
    "Step-by-step breakdown", "Would you like me", "SOURCES", "Send",
    "Study Insights", "Weak Areas Identified", "Generate Flashcards", "Create Now",
    "NIPRAS AI can make mistakes"
  ]) assert.doesNotMatch(source, new RegExp(phrase));
  assert.match(source, /معلّم نبراس الذكي/);
  assert.match(source, /ابعت سؤالك وأنا بشرحلك خطوة خطوة/);
  assert.match(source, /ممكن يخطئ[\s\S]*كتاب التوجيهي/);
  assert.doesNotMatch(source, /\bml-auto\b|\bmr-auto\b|\bpl-20\b|\bpr-\d+/);
});
```

- [ ] **Step 2: Verify the AI-tutor test fails**

Run: `npm test -- --test-name-pattern="AI tutor uses"`

Expected: FAIL on English prompts, responses, labels, study insights, warning, and physical RTL utilities.

- [ ] **Step 3: Implement Palestinian Arabic tutor copy and logical alignment**

Use a helpful Palestinian teacher tone: greet naturally, explain in steps, acknowledge uncertainty, and offer another explanation. Translate the sample chemistry question, ionic/covalent explanation, source labels, quick prompts, generated reply, input placeholder, send button, context card, weak areas, progress, and flashcard status.

Use `معلّم نبراس الذكي ممكن يخطئ. تأكد من المعلومات المهمة بالرجوع إلى كتاب التوجيهي.` as the warning. Use `ابعت سؤالك وأنا بشرحلك خطوة خطوة.` in the welcome/help text.

Replace `ml-auto`/`mr-auto`, physical borders, padding, and rounded-corner direction with logical utilities or explicit RTL-safe classes. Maintain different user/assistant alignment and do not reverse neutral icons. Translate every dynamic `aria-label`, including review buttons.

- [ ] **Step 4: Run the focused and full test suites**

Run: `npm test -- --test-name-pattern="AI tutor uses"`

Expected: PASS.

Run: `npm test`

Expected: PASS with zero failures.

### Task 7: Translate Direct User-Facing Backend Errors

**Files:**
- Modify: `tests/arabic-only-ui.test.mjs`
- Modify: `backend/controllers/authController.js`
- Modify: `backend/controllers/materialController.js`
- Modify: `backend/middleware/authMiddleware.js`
- Modify: `backend/middleware/uploadMiddleware.js`
- Modify: `backend/middleware/errorMiddleware.js`

**Interfaces:**
- Consumes: Existing HTTP status codes and JSON `{ message }` response shape.
- Produces: Arabic client-visible validation and authorization messages without changing endpoints, fields, status codes, or developer diagnostics.

- [ ] **Step 1: Append a failing backend-message test**

```js
test("direct client-facing backend errors are Arabic", async () => {
  const paths = [
    "backend/controllers/authController.js", "backend/controllers/materialController.js",
    "backend/middleware/authMiddleware.js", "backend/middleware/uploadMiddleware.js",
    "backend/middleware/errorMiddleware.js"
  ];
  const source = (await Promise.all(paths.map(read))).join("\n");
  for (const phrase of [
    "Full name, email, and password are required", "Email is already registered",
    "Email and password are required", "Invalid email or password",
    "Material file is required", "Material not found", "Not authorized, token missing",
    "Not authorized, user not found", "Unsupported file type", "Server error"
  ]) assert.doesNotMatch(source, new RegExp(phrase));
  assert.match(source, /البريد الإلكتروني/);
  assert.match(source, /غير مصرح/);
  assert.match(source, /نوع الملف غير مدعوم/);
});
```

- [ ] **Step 2: Verify the backend-message test fails**

Run: `npm test -- --test-name-pattern="direct client-facing backend errors"`

Expected: FAIL because API response messages are currently English.

- [ ] **Step 3: Translate response messages without altering contracts**

Use clear Arabic messages for required credentials, duplicate email, invalid credentials, missing file/material, missing or invalid authorization, unsupported type, upload size errors, and generic server failure. Keep `{ message }`, HTTP status codes, endpoint paths, field names, MIME types, storage status values, and internal logs unchanged.

Keep route-not-found diagnostics and stack traces in English when they are developer-facing. If the generic error handler sends a message directly to the browser, map known upload errors to Arabic and use `صار خطأ، حاول مرة ثانية` as the generic public fallback.

- [ ] **Step 4: Run the focused and full test suites**

Run: `npm test -- --test-name-pattern="direct client-facing backend errors"`

Expected: PASS.

Run: `npm test`

Expected: PASS with zero failures.

### Task 8: Complete Static Audit, Production Build, and Browser Verification

**Files:**
- Modify if findings require fixes: files already listed in Tasks 1–7
- Do not edit: generated `dist/`

**Interfaces:**
- Consumes: Completed Arabic-only application.
- Produces: Evidence that the production build and all routes render correctly at desktop, tablet, and mobile widths.

- [ ] **Step 1: Install exactly from the existing lockfile**

Run: `npm ci`

Expected: exit 0 without changing `package-lock.json`.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: all Arabic-only, RTL, math-direction, AI-tone, and backend-message tests pass with zero failures.

- [ ] **Step 3: Audit remaining English and direction-sensitive utilities**

Run:

```powershell
rg -n --glob '!src/locales/en/**' --glob '!node_modules/**' --glob '!dist/**' 'Get Started|Start Learning|Dashboard|Upload Material|AI Tutor|Study Plan|Progress|Quizzes|Lectures|Loading|Try Again|No results|Something went wrong|Submit|Previous|Next|Finish|Replay|Send|Search|Notifications|Help|Cancel' src index.html
rg -n --glob '!node_modules/**' --glob '!dist/**' 'LanguageSwitcher|LanguageDetector|changeLanguage|fallbackLng:\s*["'']en|supportedLngs:\s*\[[^]]*en' src
rg -n --glob '*.{jsx,js}' '\b(text-left|text-right|ml-|mr-|pl-|pr-|left-|right-|border-l|border-r|rounded-l|rounded-r)' src
```

Expected: the first two commands return no user-facing English or language-switching behavior. Review every result from the third command and retain only intentionally physical decoration or LTR content with an explanatory code context.

- [ ] **Step 4: Build the production frontend**

Run: `npm run build`

Expected: Vite exits 0 with a production bundle and no compile errors. Do not edit build output.

- [ ] **Step 5: Start the Vite development server for browser verification**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite reports a local URL. Keep the process running in its terminal session.

- [ ] **Step 6: Verify every route and the complete interaction story in a browser**

At desktop width, open `/`, `/login`, `/signup`, `/analysis`, `/dashboard`, `/lectures`, `/lesson`, `/lesson/preview`, `/study-plan`, `/progress`, `/quizzes`, and `/ai-tutor`. For each page verify meaningful Arabic content, `document.documentElement.lang === "ar"`, `document.documentElement.dir === "rtl"`, absence of a language switcher, absence of Vite overlays, and no console errors.

Exercise landing navigation and showcase animation; login/signup visibility controls and validation; analysis cancel/progress state; sidebar navigation; lecture selection; lesson previous/next, replay, reveal, checkpoint, graph, and formulas; quiz selection/submission/navigation; AI tutor prompt/send flow; study-plan task toggles; and progress filters/actions. Confirm every changed interaction state remains Arabic.

Repeat layout checks at approximately 768 px and 390 px widths. Verify mobile sidebar direction and overlay, navigation wrapping, form icon placement, chat bubbles, cards, charts, modal placement, and no horizontal overflow. Load `/?lng=en` after setting `localStorage.nipras_language = "en"`; confirm the page remains Arabic.

- [ ] **Step 7: Stop the development server and record evidence**

Stop the server with `Ctrl+C`. Record the test count, build exit code, routes and viewport sizes checked, console status, intentional English exceptions, modified/removed files, and any route that could not be exercised with its exact blocker.
