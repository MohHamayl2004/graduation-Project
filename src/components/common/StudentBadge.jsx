import { useAuth } from "../../context/AuthContext";
import { streamLabel } from "../../../shared/academicStreams";

export default function StudentBadge({ compactOnMobile = false }) {
  const { auth } = useAuth();
  if (!auth.user) return null;
  return <div className="flex min-w-0 items-center gap-2 text-ink">
    <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-tint font-bold text-primary">{auth.user.fullName.slice(0, 1)}</span>
    <div className={compactOnMobile ? "hidden min-w-0 sm:block" : "min-w-0"}><p className="max-w-[160px] truncate text-sm font-semibold">{auth.user.fullName}</p><p className="text-xs text-ink-muted">الفرع {streamLabel(auth.user.stream)}</p></div>
  </div>;
}
