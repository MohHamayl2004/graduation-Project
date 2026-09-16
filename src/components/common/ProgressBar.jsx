const TONES = {
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-warning",
  error: "bg-error"
};

export default function ProgressBar({ value, tone = "primary", size = "md", trackClassName = "", className = "" }) {
  const height = size === "sm" ? "h-1.5" : "h-2";
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`${height} w-full overflow-hidden rounded-full bg-surface-alt ${trackClassName} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-slow ease-out ${TONES[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
