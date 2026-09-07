import { LoaderCircle } from "lucide-react";

const SIZES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8"
};

export default function LoadingSpinner({ size = "md", className = "" }) {
  return <LoaderCircle className={`${SIZES[size]} animate-spin text-primary ${className}`} aria-hidden="true" />;
}
