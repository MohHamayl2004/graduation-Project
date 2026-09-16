const VARIANTS = {
  default: "border border-border bg-surface-raised shadow-sm",
  flat: "bg-surface-alt",
  interactive: "border border-border bg-surface-raised shadow-sm transition-shadow duration-base ease-out hover:shadow-md"
};

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6"
};

export default function Card({ children, variant = "default", padding = "md", className = "" }) {
  return <div className={`rounded-lg ${VARIANTS[variant]} ${PADDING[padding]} ${className}`}>{children}</div>;
}
