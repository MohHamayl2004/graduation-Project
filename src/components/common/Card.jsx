const VARIANTS = {
  default: "border border-border bg-surface-raised shadow-sm",
  flat: "bg-surface-alt",
  interactive: "border border-border bg-surface-raised shadow-sm transition-shadow duration-base ease-out hover:shadow-md"
};

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-4 sm:p-6"
};

export default function Card({ children, variant = "default", padding = "md", className = "" }) {
  return <div className={`min-w-0 rounded-lg ${VARIANTS[variant]} ${PADDING[padding]} ${className}`}>{children}</div>;
}
