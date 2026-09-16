export default function EmptyState({ icon: Icon, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 text-center ${className}`}>
      {Icon ? (
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-tint text-primary">
          <Icon size={20} />
        </span>
      ) : null}
      <div>
        <p className="text-base font-semibold text-ink">{title}</p>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
