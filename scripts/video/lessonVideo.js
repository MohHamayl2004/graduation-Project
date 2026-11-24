import { exampleFunction, rateOfChange } from "../../shared/lessonBook.js";

export const sceneStages = Object.freeze([
  "question",
  "points",
  "change",
  "rate",
  "meaning",
]);
export const storyboardSchema = {
  type: "object",
  additionalProperties: false,
  required: ["lessonId", "scenes"],
  properties: {
    lessonId: { type: "string", enum: ["1-1"] },
    scenes: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["stage", "heading", "narration"],
        properties: {
          stage: { type: "string", enum: sceneStages },
          heading: { type: "string" },
          narration: { type: "string" },
        },
      },
    },
  },
};
const text = (s, min, max) =>
  typeof s === "string" &&
  s.length >= min &&
  s.length <= max &&
  /[\u0600-\u06ff]/.test(s) &&
  !/[<>\x00-\x08\x0b-\x1f]|https?:|javascript:|```/i.test(s);
export function validateStoryboard(value) {
  if (
    !value ||
    value.lessonId !== "1-1" ||
    Object.keys(value).sort().join(",") !== "lessonId,scenes" ||
    !Array.isArray(value.scenes) ||
    value.scenes.length !== 5
  )
    throw Error("Invalid lesson storyboard");
  value.scenes.forEach((scene, i) => {
    if (
      !scene ||
      Object.keys(scene).sort().join(",") !== "heading,narration,stage" ||
      scene.stage !== sceneStages[i] ||
      !text(scene.heading, 3, 60) ||
      !text(scene.narration, 35, 420)
    )
      throw Error("Invalid storyboard scene");
  });
  return structuredClone(value);
}
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const px = (x) => 80 + ((x + 2.2) / 4.4) * 880,
  py = (y) => 570 - ((y + 4) / 14) * 500;
const curve = Array.from({ length: 181 }, (_, i) => {
  const x = -2.2 + (4.4 * i) / 180;
  return `${i ? "L" : "M"}${px(x).toFixed(2)},${py(exampleFunction(x)).toFixed(2)}`;
}).join(" ");
const values = rateOfChange(-1, 2);
if (
  values.y1 !== 7 ||
  values.y2 !== 1 ||
  values.dx !== 3 ||
  values.dy !== -6 ||
  values.rate !== -2
)
  throw Error("Lesson source constants changed; review video template");

function graph(stage) {
  const point = stage >= 1,
    change = stage >= 2,
    rate = stage >= 3;
  return `<svg viewBox="0 0 1040 660" aria-label="منحنى الدالة والقاطع بين النقطتين" dir="ltr">
  <defs><pattern id="grid-${stage}" width="62.86" height="35.71" patternUnits="userSpaceOnUse"><path d="M62.86 0H0V35.71" fill="none" stroke="#dce7dc"/></pattern><clipPath id="plot-${stage}"><rect x="65" y="25" width="910" height="580"/></clipPath></defs>
  <rect x="65" y="25" width="910" height="580" fill="url(#grid-${stage})"/>
  <g clip-path="url(#plot-${stage})"><path d="M65 ${py(0)}H975 M${px(0)} 25V605" stroke="#67806d" stroke-width="2"/><path class="curve" d="${curve}" stroke="#215a46" stroke-width="6" fill="none"/>
  ${change ? `<path class="change" d="M${px(-1)} ${py(7)}H${px(2)}V${py(1)}" stroke="#9c7033" stroke-width="4" stroke-dasharray="12 10" fill="none"/>` : ""}
  ${rate ? `<line class="secant" x1="${px(-1)}" y1="${py(7)}" x2="${px(2)}" y2="${py(1)}" stroke="#dc943b" stroke-width="7"/>` : ""}
  ${point ? `<g class="points"><circle cx="${px(-1)}" cy="${py(7)}" r="12" fill="#215a46" stroke="white" stroke-width="5"/><circle cx="${px(2)}" cy="${py(1)}" r="12" fill="#dc943b" stroke="white" stroke-width="5"/></g>` : ""}</g>
  <g font-family="NiprasArabic" font-size="32" fill="#193e2b"><text x="${px(-1)}" y="${py(7) - 28}" text-anchor="middle">A (−1, 7)</text><text x="${px(2) - 15}" y="${py(1) + 48}" text-anchor="end">B (2, 1)</text><text x="990" y="${py(0) - 18}">س</text><text x="${px(0) + 20}" y="35">ص</text></g></svg>`;
}
export function renderLessonVideoHtml(storyboard, timings) {
  const s = validateStoryboard(storyboard);
  if (
    !Array.isArray(timings) ||
    timings.length !== 5 ||
    timings.some(
      (t, i) =>
        t.stage !== sceneStages[i] ||
        !Number.isFinite(t.start) ||
        !Number.isFinite(t.duration) ||
        t.duration <= 0 ||
        t.start < 0 ||
        Math.abs(
          t.start - (i ? timings[i - 1].start + timings[i - 1].duration : 0),
        ) > 0.01,
    )
  )
    throw Error("Invalid measured scene timings");
  const duration = timings.at(-1).start + timings.at(-1).duration;
  const equations = [
    "ق(س) = س³ − ٥س + ٣",
    "ق(−١) = ٧ ، ق(٢) = ١",
    "Δس = ٣ ، Δص = −٦",
    "−٦ ÷ ٣ = −٢",
    "متوسط التغير = ميل القاطع",
  ];
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><script src="assets/gsap.min.js"></script><style>
  @font-face{font-family:NiprasArabic;src:url('assets/fonts/tajawal.woff2') format('woff2');font-weight:400 800}*{box-sizing:border-box;margin:0}html,body{width:1920px;height:1080px;overflow:hidden;background:#f4f7ef;color:#193e2b;font-family:NiprasArabic}#root{position:relative;width:1920px;height:1080px}.background{position:absolute;inset:0;background:#f4f7ef}.scene{position:absolute;inset:0;padding:100px 170px}.brand{font-size:30px;letter-spacing:.02em;color:#526c54;margin-bottom:25px}.heading{font-size:62px;font-weight:700;max-width:1540px;line-height:1.35}.body{display:grid;grid-template-columns:1.4fr 1fr;gap:60px;direction:ltr;align-items:center;margin-top:28px}.body svg{width:100%;height:600px}.explain{direction:rtl;display:flex;flex-direction:column;gap:35px}.formula{font-size:57px;font-weight:700;line-height:1.8;white-space:pre-line}.reference{font-size:28px;line-height:1.7;color:#526c54}.caption{position:absolute;bottom:95px;right:200px;left:200px;text-align:center;font-size:37px;line-height:1.55;color:#193e2b;background:#e5eddf;border-radius:16px;padding:18px 28px}.step{position:absolute;top:105px;left:175px;color:#526c54;font-size:30px}
  </style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080" data-fps="30"><div class="background"></div>
  ${s.scenes.map((scene, i) => `<section id="scene-${i}" class="scene clip" data-start="${timings[i].start}" data-duration="${timings[i].duration}" data-track-index="0" data-track-kind="graphics" data-hold="Narrated mathematical explanation"><div class="brand">نِبراس · الرياضيات · متوسط التغير</div><h1 class="heading">${escape(scene.heading)}</h1><span class="step">${i + 1} / 5</span><div class="body"><div class="diagram">${graph(i)}</div><div class="explain"><p class="formula">${equations[i]}</p><p class="reference">مثال ١ · الدرس ١-١<br>صفحة الكتاب ٤</p></div></div></section>`).join("\n")}
  ${s.scenes.map((scene, i) => `<div id="caption-${i}" class="caption clip" data-start="${timings[i].start}" data-duration="${timings[i].duration}" data-track-index="1" data-track-kind="captions"><span>${escape(scene.narration)}</span></div><audio id="voice-${i}" class="clip" src="assets/scene-${i}.mp3" data-start="${timings[i].start}" data-duration="${timings[i].audioDuration ?? timings[i].duration}" data-track-index="2" data-volume="1"></audio>`).join("\n")}
  </div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});${timings.map((t, i) => `tl.fromTo('#scene-${i} .heading',{opacity:0,y:18},{opacity:1,y:0,duration:.45,ease:'power2.out'},${t.start});tl.fromTo('#scene-${i} .formula',{opacity:0,y:12},{opacity:1,y:0,duration:.5,ease:'power2.out'},${t.start + 0.6});tl.fromTo('#scene-${i} .diagram',{opacity:0},{opacity:1,duration:.6},${t.start + 0.2});`).join("")}tl.to({}, {duration:.01},${Math.max(0, duration - 0.02)});window.__timelines.main=tl;</script></body></html>`;
}

export function captionsVtt(storyboard, timings) {
  const stamp = (s) => {
    const ms = Math.round(s * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
  };
  return (
    "WEBVTT\n\n" +
    storyboard.scenes
      .map(
        (s, i) =>
          `${i + 1}\n${stamp(timings[i].start)} --> ${stamp(timings[i].start + timings[i].duration)}\n${s.narration}\n`,
      )
      .join("\n")
  );
}
