// Qwen may author JSON narration only. All executable animation code is trusted.
import "../backend/config/env.js";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createFishSpeechService as createSpeechService } from "../backend/services/fishSpeechService.js";
import {
  validateStoryboard,
  storyboardSchema,
  renderLessonVideoHtml,
  captionsVtt,
} from "./video/lessonVideo.js";

const root = resolve(".local/unit1-video"),
  assets = join(root, "assets"),
  storyFile = join(root, "storyboard.json");
const cli = resolve(
  ".local/hyperframes/node_modules/hyperframes/bin/hyperframes.mjs",
);
const ffmpegDirectory =
  "C:/Users/Tareq/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin";
const ffprobe =
  process.env.FFPROBE_PATH ||
  (existsSync(join(ffmpegDirectory, "ffprobe.exe"))
    ? join(ffmpegDirectory, "ffprobe.exe")
    : "ffprobe");
mkdirSync(assets, { recursive: true });
const run = (file, args, options = {}) => {
  const r = spawnSync(file, args, {
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
  if (r.status !== 0)
    throw Error(r.stderr || r.error?.message || `${file} failed`);
  return r.stdout;
};
const source = JSON.parse(
  readFileSync(resolve("src/data/lectures/lesson-1-1.json"), "utf8"),
);
const mode = process.argv[2] || "--plan";
if (mode === "--plan") {
  if (existsSync(storyFile))
    throw Error(
      "Storyboard already exists; review/reuse it instead of generating another.",
    );
  if (!process.env.AI_SERVICE_KEY)
    throw Error("Private Qwen configuration is required.");
  const response = await fetch(
    `${process.env.AI_SERVICE_URL}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_SERVICE_KEY}`,
      },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({
        model: process.env.AI_MODEL_ID || "qwen3.5-9b",
        temperature: 0.4,
        max_tokens: 1600,
        chat_template_kwargs: { enable_thinking: false },
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "lesson_storyboard",
            strict: true,
            schema: storyboardSchema,
          },
        },
        messages: [
          {
            role: "system",
            content:
              "أنت مخطط فيديو تعليمي عربي. أعد بيانات JSON فقط وفق المخطط. لا تكتب أي كود أو روابط. أنشئ خمسة مشاهد بالترتيب question ثم points ثم change ثم rate ثم meaning. اكتب عنواناً قصيراً جداً لكل مشهد وسرداً عربياً طبيعياً من ١٦ إلى ٢٠ كلمة، بمجموع ٨٠ إلى ١٠٠ كلمة. يُقرأ الفيديو في ٣٠ إلى ٦٠ ثانية. ابدأ بسؤال عن ميل الخط بين نقطتين، ثم اشرح مثال الكتاب المحدد وحده. اكتب الأعداد لفظياً في السرد. التزم تماماً بهذه الحقائق: ق(س)=س³−٥س+٣؛ س١=−١، س٢=٢؛ ق(−١)=٧، ق(٢)=١؛ Δس=٣؛ Δص=−٦؛ المتوسط=−٢ وهو ميل القاطع. لا تخلط ميل القاطع بميل المماس، ولا تدع أنه مشتقة عند نقطة.",
          },
          {
            role: "user",
            content: JSON.stringify({
              lessonId: "1-1",
              title: source.title,
              definition: source.definitions[0],
              example: source.examples[1],
            }),
          },
        ],
      }),
    },
  );
  if (!response.ok) throw Error(`Qwen planning failed (${response.status})`);
  const result = await response.json();
  const storyboard = validateStoryboard(
    JSON.parse(result.choices[0].message.content),
  );
  writeFileSync(storyFile, JSON.stringify(storyboard, null, 2));
  writeFileSync(
    join(root, "provenance.json"),
    JSON.stringify(
      {
        model: process.env.AI_MODEL_ID || "qwen3.5-9b",
        source: "src/data/lectures/lesson-1-1.json",
        example: 1,
        usage: result.usage,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(storyboard, null, 2));
} else if (mode === "--prepare") {
  const storyboard = validateStoryboard(
      JSON.parse(readFileSync(storyFile, "utf8")),
    ),
    synthesize = createSpeechService();
  const timings = [];
  let start = 0;
  for (let i = 0; i < storyboard.scenes.length; i++) {
    const file = join(assets, `scene-${i}.mp3`),
      inputFile = join(assets, `scene-${i}.text`),
      narration = storyboard.scenes[i].narration;
    if (
      existsSync(file) &&
      (!existsSync(inputFile) || readFileSync(inputFile, "utf8") !== narration)
    )
      throw Error(
        "Narration changed after synthesis; review and remove only the affected cached clip.",
      );
    if (!existsSync(file)) {
      const speech = await synthesize({ text: narration });
      if (speech.contentType !== "audio/mpeg")
        throw Error("This template requires MP3 narration.");
      writeFileSync(file, speech.audio);
      writeFileSync(inputFile, narration);
    }
    const audioDuration = Number(
      run(ffprobe, [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
        file,
      ]).trim(),
    );
    if (!Number.isFinite(audioDuration) || audioDuration <= 0)
      throw Error("Invalid narration duration");
    const duration = audioDuration + 0.45;
    timings.push({
      stage: storyboard.scenes[i].stage,
      start,
      duration,
      audioDuration,
    });
    start += duration;
  }
  // A deliberate short end hold may bring a concise explanation to 30 seconds.
  if (start < 30) {
    timings.at(-1).duration += 30 - start;
    start = 30;
  }
  if (start > 60)
    throw Error(
      `Narration is ${start.toFixed(1)}s; review the script before rendering.`,
    );
  mkdirSync(join(assets, "fonts"), { recursive: true });
  copyFileSync(
    resolve(
      "node_modules/@fontsource/tajawal/files/tajawal-arabic-400-normal.woff2",
    ),
    join(assets, "fonts/tajawal.woff2"),
  );
  if (!existsSync(join(assets, "gsap.min.js"))) {
    const r = await fetch(
      "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js",
    );
    if (!r.ok) throw Error("Pinned animation runtime download failed");
    writeFileSync(join(assets, "gsap.min.js"), await r.text());
  }
  writeFileSync(
    join(root, "index.html"),
    renderLessonVideoHtml(storyboard, timings),
  );
  writeFileSync(join(root, "captions.vtt"), captionsVtt(storyboard, timings));
  writeFileSync(join(root, "timings.json"), JSON.stringify(timings, null, 2));
  writeFileSync(
    join(root, "SPEC.md"),
    "# متوسط التغير\n\nOne verified cubic example, five progressive beats. 1920×1080, 30 fps. NIPRAS green on warm ivory; local Arabic Tajawal font. Narration owns scene timing. Captions show the current spoken segment. No model-authored HTML, JavaScript, URLs, or equations are executed. No decorative music competes with the mathematical narration.\n",
  );
  console.log(
    JSON.stringify({
      prepared: true,
      duration: start,
      scenes: timings.length,
      project: root,
    }),
  );
} else if (["--check", "--render"].includes(mode)) {
  if (!existsSync(cli))
    throw Error("Install hyperframes@0.9.59 under .local/hyperframes first.");
  const args =
    mode === "--check"
      ? ["check", "--json"]
      : [
          "render",
          "--fps",
          "30",
          "--quality",
          "delivery",
          "--workers",
          "2",
          "-o",
          "lesson-1-1.mp4",
        ];
  console.log(
    run(process.execPath, [cli, ...args], {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, PATH: ffmpegDirectory + ";" + process.env.PATH },
    }),
  );
} else throw Error("Use --plan, --prepare, --check or --render.");
