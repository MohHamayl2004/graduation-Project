import { LoaderCircle } from "lucide-react";

export default function LoadingSpinner({ className = "h-5 w-5 text-[#1656cb]" }) {
  return <LoaderCircle className={`${className} animate-spin`} />;
}
