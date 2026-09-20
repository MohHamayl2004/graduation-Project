# NIPRAS Arabic-Only RTL Experience Design

## Purpose

Convert the complete NIPRAS AI Tutor user interface into a single-language Palestinian Arabic experience for Tawjihi students, while preserving the current application behavior, routes, APIs, responsive layouts, animations, and visual identity.

The finished interface must be understandable and welcoming to Palestinian students while remaining professional enough for parents, teachers, and graduation-project evaluators. Conversational prompts and encouragement will use natural Palestinian phrasing. Formal labels and educational terminology will use clear standard Arabic.

## Scope

The conversion covers every rendered frontend route and shared component:

- `/`
- `/login`
- `/signup`
- `/analysis`
- `/dashboard`
- `/lectures`
- `/lesson` and `/lesson/:code`
- `/study-plan`
- `/progress`
- `/quizzes`
- `/ai-tutor`
- Navigation, sidebar, footer, modals, loading states, empty states, controls, forms, accessibility text, and responsive navigation.
- User-visible mock content in `src/data/` and lesson content in `src/pages/Lesson/`.
- User-visible backend authentication, authorization, and material-upload errors when those strings are passed directly to the interface.
- Public document metadata in `index.html`.

Internal identifiers remain unchanged, including route paths, API paths, request and response fields, database fields, component names, filenames, environment-variable names, package names, and developer-only logs.

## Selected Approach

Keep the existing `i18next` architecture for shared interface text and configure it as Arabic-only. Remove browser language detection and exclude English resources from runtime configuration. Translate page-specific literals and mock data in their existing files so the change follows the current project structure without introducing a second localization system or a broad refactor.

This approach preserves the current component contracts and minimizes functional risk. It also prevents query strings, browser preferences, or local storage from restoring English.

The English locale directory may remain as unused source material if deleting it would create unnecessary risk. No English resource will be imported into the runtime bundle. `LanguageSwitcher.jsx` may be removed only after all imports and uses are confirmed absent.

## Arabic Language and Brand Rules

- Display the brand as `نبراس` in interface text.
- Use `NIPRAS` only when it is embedded in an official logo asset or required by the visual identity.
- Use `معلّم نبراس الذكي` for “NIPRAS AI Tutor” and `المعلّم الذكي` for “AI Tutor.”
- Use the terminology supplied in the project brief consistently, including `الصفحة الرئيسية`, `الدروس الذكية`, `إنشاء الاختبارات`, `الخطة الدراسية`, `متابعة التقدّم`, `المواد التعليمية`, and `الاختبارات`.
- Use Palestinian phrasing for questions, feedback, calls to action, and motivational copy. Avoid excessive slang, literal translations, Arabizi, sarcasm, and childish language.
- Keep the AI warning visible in natural Arabic: `معلّم نبراس الذكي ممكن يخطئ. تأكد من المعلومات المهمة بالرجوع إلى كتاب التوجيهي.`
- Keep deliberate technical content, email examples, formula variables, and official visual marks in Latin characters where their meaning requires it.

## Internationalization and Document State

`src/i18n/index.js` will initialize only Arabic resources with both the active and fallback language set to `ar`. It will not register `i18next-browser-languagedetector`, query-string detection, navigator detection, or local-storage caching.

The application will set the document state unconditionally:

```js
document.documentElement.lang = "ar";
document.documentElement.dir = "rtl";
```

The language-change event listener and the exported RTL-language list become unnecessary once the language cannot change. The root application will establish Arabic document state without maintaining a second language context.

All `LanguageSwitcher` instances will be removed from the navbar, login page, and signup page. Imports and language-related accessibility labels that become unused will be removed as well.

`index.html` will start with `lang="ar"` and `dir="rtl"`. Its title, description, and Open Graph title and description will be Arabic and will describe an intelligent Tawjihi learning assistant accurately.

## Translation Storage and Content Conversion

Existing shared namespaces under `src/locales/ar/` remain the source of truth for shared navigation, authentication, footer, and common action text. Their wording will be corrected to match the approved terminology and tone.

Text that is already local to a single page or data module will be translated in place. This includes:

- Landing-page marketing text and animated showcase labels.
- Dashboard summaries, calls to action, activities, and subject labels.
- Material-analysis upload instructions and states.
- Lecture titles, filters, lesson summaries, and controls.
- Lesson narration text, slides, tutor assistance, replay controls, and accessibility labels.
- Quiz questions, answers, feedback, navigation, scores, and timers.
- Study-plan days, tasks, durations, actions, and regeneration states.
- Progress charts, legends, metrics, recommendations, and filters.
- AI tutor messages, suggestions, attachment controls, placeholders, and warning text.
- Mock names, subjects, task descriptions, and educational content that users see.

Developer-only constants can remain English when they are not rendered. Stable IDs and enum-like values will not be translated if components depend on them.

## RTL Layout Behavior

The root document direction will provide the default RTL flow. Each page will then be reviewed for physical CSS utilities that conflict with that flow.

Where positioning represents reading order or interface direction, physical utilities such as `left`, `right`, `ml`, `mr`, `pl`, `pr`, and `text-left` will be replaced with logical equivalents such as `start`, `end`, `ms`, `me`, `ps`, `pe`, and `text-start`. Decorative shapes with intentionally physical placement may retain fixed coordinates when mirroring would damage the composition.

The shared sidebar will open from the inline-start edge and use RTL-aware off-canvas translation. Mobile overlays, close controls, active indicators, and content padding will remain usable at all breakpoints.

Directional arrows and chevrons will reflect Arabic navigation order. Neutral icons, including play, pause, user, book, settings, quizzes, and check marks, will not be mirrored.

Chat messages will align by speaker in an RTL-appropriate way while retaining clear visual separation. Form labels, search inputs, cards, legends, progress displays, modals, and responsive navigation will align consistently with Arabic reading order.

## Forms and Bidirectional Content

Login and signup pages remain RTL at the page and label levels. Email inputs will use `dir="ltr"`. Password inputs may also use LTR direction to preserve typed-character order, while placeholders and error messages remain Arabic and visually aligned with the form.

Password visibility controls will be placed using logical positioning. Existing validation and authentication behavior will remain unchanged; only displayed copy, alignment, and input direction will change.

Numbers, percentages, file sizes, email addresses, URLs, and technical tokens will be isolated when necessary so bidirectional rendering does not scramble them.

## Mathematics and Lesson Controls

Equations, fractions, superscripts, subscripts, operators, Latin variables, and expressions containing `Δس` or `Δص` will be wrapped in explicit direction containers where needed. Formula direction will be chosen based on the notation rather than inherited blindly from the page.

Lesson keyboard behavior and previous/next actions will keep their functional meaning. Their icons and labels will be visually reviewed in RTL so the control that advances the lesson points in the correct interface direction.

Audio files, API identifiers, route parameters, and lesson codes will remain unchanged.

## Backend Error Messages

Backend routes and response shapes will remain unchanged. Directly rendered authentication, authorization, upload, duplicate-account, missing-material, and invalid-credential messages will be translated into Arabic when the frontend does not already map them to localized copy.

Developer logs, stack traces, configuration errors, and diagnostic messages that do not reach users remain English.

## Accessibility

Every visible or announced label will be checked, including `aria-label`, `aria-describedby`, image `alt` text, button names, input descriptions, loading announcements, validation alerts, navigation landmarks, modal controls, and lesson replay controls.

The sidebar landmark currently labelled `Primary` will receive an Arabic name. Icon-only controls will expose meaningful Arabic labels. User names and official asset text will be preserved where appropriate.

## Error Handling and Compatibility

No API contract or authentication flow will change. Existing fallback and empty-state behavior will remain available with Arabic wording. A failed or unavailable API request must not cause English developer text to appear when the frontend already controls the displayed error.

The production build must continue to use the existing dependency lockfile. No new localization or styling dependency will be introduced, and generated `dist` content will not be edited manually.

## Verification Strategy

Verification will combine static checks, a production build, and browser inspection.

Static checks will confirm:

- No runtime English locale import or language detector remains.
- No language-switcher import or rendered control remains.
- `lang="ar"` and `dir="rtl"` exist in both the initial HTML and runtime document state.
- User-facing English literals are absent from frontend source except deliberate technical content such as email examples, codes, formulas, asset names, and developer-only values.
- Physical direction utilities that affect RTL behavior have been reviewed.

The existing lockfile will be used to install dependencies, followed by `npm run build`. Because the project currently has no test script, focused source assertions may be added with Node's built-in test runner only if they provide durable coverage without adding a dependency.

Browser verification will load every public and application route. It will check meaningful page content, language and direction attributes, the absence of the language switcher, console errors, and key interactive controls. Desktop, tablet, and mobile viewports will cover shared navigation, login and signup forms, dashboard, uploads, lectures, lesson controls and formulas, quizzes, AI tutor, study plan, progress, and the landing-page showcase.

If a route requires authentication but the current prototype does not enforce it, it will be opened directly. If real authentication or backend data prevents a route from rendering, the limitation and the evidence gathered will be reported explicitly.

## Completion Criteria

The work is complete only when:

- Arabic is the sole selectable and restorable interface language.
- Every rendered user-facing string is Arabic except intentional technical or official-brand content.
- The language switcher is absent.
- The document reports Arabic language and RTL direction before React loads and after it mounts.
- Shared and page-specific layouts behave correctly in RTL across supported viewport sizes.
- Email, password, numeric, and mathematical content retain correct visual order.
- Every route has been inspected in a browser or reported with a concrete access limitation.
- The browser console has no errors caused by the conversion.
- The production build exits successfully.

## Repository Constraint

The supplied workspace does not currently expose a Git repository: `git status` reports that no `.git` directory is available. The specification therefore cannot be committed at this stage. Implementation will preserve all existing files and will report the exact modified and removed files in the final handoff.
