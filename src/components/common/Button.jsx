const VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  accent: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-border-strong bg-surface-raised text-ink hover:bg-surface-alt",
  outline: "border border-primary text-primary hover:bg-primary-tint",
  ghost: "text-ink-muted hover:bg-surface-alt hover:text-ink",
  danger: "bg-error text-white hover:bg-error/90"
};

const SIZES = {
  sm: "h-9 gap-1.5 px-3.5 text-sm",
  md: "h-11 gap-2 px-5 text-base",
  lg: "h-[52px] gap-2.5 px-7 text-lg"
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors duration-base ease-out disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
