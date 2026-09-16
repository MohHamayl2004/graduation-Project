// The lesson, cut into slides.
//
// One IDEA per slide, not one line per slide. A definition split
// across four screens reads as four unrelated facts; kept whole it
// reads as one rule. The worked example travels with its solution
// for the same reason — a question the student cannot see the
// answer to is a different thing entirely.
import { lesson } from "../../data/mockLesson";

// Recorded narration, one file per slide.
//
// Audio is data, not a decision baked into the code: drop a file in
// public/audio/lesson-1-1/ and that slide is narrated by a real
// voice; leave it out and the player falls back to speech synthesis.
// Coverage can grow one slide at a time without touching the player.
const AUDIO_DIR = "/audio/lesson-1-1";

const NARRATION = {
  title: `${AUDIO_DIR}/01-title.mp3`,
  definition: `${AUDIO_DIR}/02-definition.mp3`,
  graph: `${AUDIO_DIR}/03-graph.mp3`,
  example: `${AUDIO_DIR}/04-example.mp3`,
  check: `${AUDIO_DIR}/05-check.mp3`,
  done: `${AUDIO_DIR}/06-done.mp3`
};

export function buildSlides() {
  return [
    {
      id: "title",
      audio: NARRATION.title,
      kind: "title",
      speech: `${lesson.title}. ${lesson.definition.title}.`
    },
    {
      id: "definition",
      audio: NARRATION.definition,
      kind: "definition",
      eyebrow: lesson.definition.title,
      definition: lesson.definition,
      speech:
        "إذا كان ص تساوي ق من س اقتراناً وتغيرت س من س واحد إلى س اثنين، فإن التغير في س يساوي س اثنين ناقص س واحد ونرمز له دلتا س. والتغير في الاقتران يساوي ق من س اثنين ناقص ق من س واحد ونرمز له دلتا ص. ومتوسط التغير يساوي دلتا ص على دلتا س."
    },
    {
      id: "graph",
      audio: NARRATION.graph,
      kind: "graph",
      eyebrow: "نشاط ٢ · المعنى الهندسي",
      curve: lesson.curve,
      speech:
        "الشكل يمثل مبيع شركة سيارات خلال س شهراً. متوسط التغير هو ميل الخط الواصل بين نقطتين على المنحنى. حرّك النقطتين وأجب عن السؤال."
    },
    {
      id: "example",
      audio: NARRATION.example,
      kind: "example",
      eyebrow: lesson.example.title,
      example: lesson.example,
      speech:
        "مثال واحد. إذا كان ق من س تساوي س تكعيب ناقص خمسة س زائد ثلاثة، جد متوسط التغير عندما تتغير س من سالب واحد إلى اثنين. الحل: دلتا س تساوي ثلاثة. ودلتا ص تساوي واحد ناقص سبعة يساوي سالب ستة. فمتوسط التغير يساوي سالب ستة على ثلاثة يساوي سالب اثنين."
    },
    {
      id: "check",
      audio: NARRATION.check,
      kind: "checkpoint",
      eyebrow: "سؤال تركيز",
      checkpoint: lesson.checkpoint,
      speech: lesson.checkpoint.prompt
    },
    {
      id: "done",
      audio: NARRATION.done,
      kind: "done",
      speech: "أحسنت. أنهيت الدرس."
    }
  ];
}

export { lesson };
