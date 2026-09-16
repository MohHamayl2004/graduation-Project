import { Play, Pause, ChevronRight, ChevronLeft, Repeat } from "lucide-react";

// Deliberately shaped like a video transport, because that is the
// mental model we want: the student is watching a lesson, not
// reading a page. Chapters are segments, not a single fill, so
// where you are in the lesson is readable at a glance.
export default function PlayerBar({ slides, index, playing, onPlay, onPrev, onNext, onSeek, onRestart }) {
  const atStart = index === 0;
  const atEnd = index === slides.length - 1;

  return (
    <div className="flex items-center gap-3 border-t border-border bg-surface-raised px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={onPlay}
        aria-label={playing ? "إيقاف" : "تشغيل"}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white transition-colors duration-fast hover:bg-primary-hover"
      >
        {playing ? <Pause size={19} /> : <Play size={19} className="ms-0.5" />}
      </button>

      <button type="button" onClick={onPrev} disabled={atStart} aria-label="السابق"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-surface-alt hover:text-ink disabled:opacity-30">
        <ChevronRight size={19} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSeek(i)}
            aria-label={`الشريحة ${i + 1}`}
            aria-current={i === index}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-fast ${
              i < index ? "bg-primary" : i === index ? "bg-accent" : "bg-surface-alt hover:bg-border-strong"
            }`}
          />
        ))}
      </div>

      <button type="button" onClick={onNext} disabled={atEnd} aria-label="التالي"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-surface-alt hover:text-ink disabled:opacity-30">
        <ChevronLeft size={19} />
      </button>

      <span className="shrink-0 text-sm tabular-nums text-ink-muted">
        {index + 1} / {slides.length}
      </span>

      {atEnd && (
        <button type="button" onClick={onRestart} aria-label="من البداية"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-surface-alt hover:text-ink">
          <Repeat size={17} />
        </button>
      )}
    </div>
  );
}
