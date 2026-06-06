export default function ProgressBar({ value, className = "h-2 rounded-full bg-[#d9deee]", fillClassName = "h-full rounded-full bg-[#1e58ca]" }) {
  return (
    <div className={className}>
      <div className={fillClassName} style={{ width: `${value}%` }} />
    </div>
  );
}
