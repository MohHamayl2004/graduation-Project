import { Maximize2, Minimize2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import StudentBadge from "../../components/common/StudentBadge";
import demoLesson from "../../data/interactive/demo.json";
import { interactiveLessons } from "../../data/interactive";
import CheckpointCard from "./components/CheckpointCard";
import LessonSummary from "./components/LessonSummary";
import { useYouTubeLesson } from "./useYouTubeLesson";
import { useVideoLesson } from "./useVideoLesson";

// A lesson the student does: the video plays, stops at each checkpoint, and
// only continues once the question is answered. The video is embedded from
// its own channel, or is a video NIPRAS made itself
// (docs/contracts/interactive-lesson-v1.md).
export default function InteractiveLesson({ lesson: given }) {
  const { id } = useParams();
  const lesson = given || (id ? interactiveLessons[id] : demoLesson);
  const youtube = useYouTubeLesson(lesson);
  const local = useVideoLesson(lesson);
  const isVideo = lesson?.source?.kind === "video";
  const { state, shell, failed, fullscreen, expanded, toggleFullscreen, answer, resume, restart } = isVideo ? local : youtube;
  const hasVideo = isVideo ? Boolean(lesson.source.src) : Boolean(lesson?.source?.videoId);
  const answeredCount = Object.keys(state.answers).length;

  if (!lesson) {
    return (
      <div className="app-min-screen bg-surface text-ink">
        <div className="mx-auto flex app-min-screen max-w-[1600px]">
          <Sidebar activeItem="lectures" />
          <main className="flex min-w-0 flex-1 flex-col items-start gap-4 px-4 py-6 pt-20 sm:px-8 lg:pt-6">
            <h1 className="font-display text-2xl font-semibold text-ink">هاد الدرس مش موجود.</h1>
            <Link to="/lectures" className="text-primary underline">ارجع لمكتبة الفيديو</Link>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-min-screen bg-surface text-ink">
      <div className="mx-auto flex app-min-screen max-w-[1600px]">
        <Sidebar activeItem="lectures" />

        <main className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-6 sm:px-8">
          <header className="pt-16 lg:pt-0">
            <div className="mb-3 flex justify-end"><StudentBadge /></div>
            <h1 className="font-display text-2xl font-semibold text-ink">{lesson.title}</h1>
            {isVideo && lesson.source.made_with && <p className="mt-1 text-sm text-ink-muted">{lesson.source.made_with}</p>}
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
                role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? "عرض الدرس الموسّع" : undefined}
                data-expanded-player={expanded || undefined}
                className={`overflow-hidden bg-black ${expanded ? "fixed inset-0 z-50 flex app-screen w-full items-center justify-center" : fullscreen ? "relative flex app-screen w-full items-center justify-center" : "relative rounded-2xl border border-border"}`}
              >
                <div className={fullscreen ? "aspect-video max-h-full w-full" : "aspect-video w-full"}>
                  {isVideo ? (
                    <video
                      ref={local.video}
                      src={`${import.meta.env.BASE_URL}${lesson.source.src}`}
                      poster={lesson.source.poster ? `${import.meta.env.BASE_URL}${lesson.source.poster}` : undefined}
                      className="h-full w-full bg-black"
                      controls
                      controlsList="nofullscreen nodownload"
                      disablePictureInPicture
                      playsInline
                      preload="metadata"
                      onDoubleClick={toggleFullscreen}
                    />
                  ) : (
                    <div ref={youtube.mount} className="h-full w-full" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label={fullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
                  className={`absolute ${isVideo ? "top-3" : "bottom-3"} left-3 z-20 grid h-11 w-11 place-items-center rounded-lg bg-ink/70 text-white hover:bg-ink`}
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
                  {isVideo ? "ما قدرنا نشغّل الفيديو. جرّب تحدّث الصفحة." : "ما قدرنا نشغّل الفيديو. ممكن يكون صاحبه مانع التضمين، أو الرابط غير صحيح."}
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

              {isVideo && lesson.source.credits?.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-ink-muted">
                  {lesson.source.credits.map((credit) => <li key={credit}>{credit}</li>)}
                </ul>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
