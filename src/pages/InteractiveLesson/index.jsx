import { Maximize2, Minimize2 } from "lucide-react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import StudentBadge from "../../components/common/StudentBadge";
import demoLesson from "../../data/interactive/demo.json";
import CheckpointCard from "./components/CheckpointCard";
import LessonSummary from "./components/LessonSummary";
import { useYouTubeLesson } from "./useYouTubeLesson";

// A lesson the student does: the video plays, stops at each checkpoint, and
// only continues once the question is answered. The video is embedded from
// its own channel (docs/contracts/interactive-lesson-v1.md).
export default function InteractiveLesson({ lesson = demoLesson }) {
  const { state, mount, shell, failed, fullscreen, toggleFullscreen, answer, resume, restart } = useYouTubeLesson(lesson);
  const hasVideo = Boolean(lesson?.source?.videoId);
  const answeredCount = Object.keys(state.answers).length;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar activeItem="lectures" />

        <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-6 sm:px-8">
          <header>
            <div className="mb-3 flex justify-end"><StudentBadge /></div>
            <h1 className="font-display text-2xl font-semibold text-ink">{lesson.title}</h1>
            {lesson.source?.channel && (
              <p className="mt-1 text-sm text-ink-muted">
                الفيديو من قناة {lesson.source.channel}
                {lesson.source.url && (
                  <>
                    {" · "}
                    <a href={lesson.source.url} target="_blank" rel="noreferrer" className="text-primary underline">
                      شاهده على يوتيوب
                    </a>
                  </>
                )}
              </p>
            )}
          </header>

          {!hasVideo ? (
            <div className="rounded-2xl border border-border bg-surface-raised p-6">
              <p className="text-base text-ink">ما في فيديو محدّد بعد.</p>
              <p className="mt-2 text-sm text-ink-muted">
                افتح <code className="rounded bg-surface-alt px-1">src/data/interactive/demo.json</code> وحط رقم الفيديو في
                <code className="mx-1 rounded bg-surface-alt px-1">source.videoId</code>، ثم احفظ.
              </p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[1100px]">
              {/* The question sits ON the video: the student stays where the
                  explanation stopped instead of looking away to a side panel. */}
              <div
                ref={shell}
                className={`relative overflow-hidden bg-black ${fullscreen ? "flex h-screen w-screen items-center justify-center" : "rounded-2xl border border-border"}`}
              >
                <div className={fullscreen ? "aspect-video max-h-full w-full" : "aspect-video w-full"}>
                  <div ref={mount} className="h-full w-full" />
                </div>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={fullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
                  className="absolute bottom-3 left-3 z-10 grid h-10 w-10 place-items-center rounded-lg bg-ink/70 text-white hover:bg-ink"
                >
                  {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                {(state.current || state.finished) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/70 p-3 backdrop-blur-sm sm:p-6">
                    <div className="max-h-full w-full max-w-[640px] overflow-y-auto">
                      {state.current ? (
                        <CheckpointCard checkpoint={state.current} onAnswer={answer} onResume={resume} />
                      ) : (
                        <LessonSummary checkpoints={lesson.checkpoints} answers={state.answers} onRestart={restart} />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {failed && (
                <p className="mt-4 rounded-xl border border-warning/40 bg-warning-tint p-4 text-sm text-warning" role="alert">
                  ما قدرنا نشغّل الفيديو. ممكن يكون صاحبه مانع التضمين، أو الرابط غير صحيح.
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-raised px-5 py-4">
                <p className="text-sm text-ink-muted">
                  {answeredCount} من {lesson.checkpoints.length} أسئلة تركيز خلصت. رح أوقف الفيديو عند كل نقطة مهمة.
                </p>
                <Link to="/ai-tutor" className="text-sm text-primary underline">
                  في إشي مش واضح؟ اسأل المعلّم الذكي
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
