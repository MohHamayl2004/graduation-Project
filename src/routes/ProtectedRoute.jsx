import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { effectiveSubscription } from "../../shared/subscriptions";

export default function ProtectedRoute({ children, redirectTo = "/login", allowExpired = false, adminOnly = false }) {
  const { auth, retrySession, signOut } = useAuth();
  if (auth.loading) return <p role="status" className="p-8 text-center text-ink-muted">جارٍ استعادة جلستك…</p>;
  if (!auth.user && auth.sessionError) return <main dir="rtl" className="mx-auto mt-16 max-w-lg rounded-xl border border-border bg-surface-raised p-6 text-center shadow-sm"><h1 className="text-xl font-semibold text-primary">تعذّر استعادة الجلسة</h1><p role="alert" className="mt-3 text-sm leading-7 text-ink-muted">{auth.sessionError}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button className="rounded-lg bg-primary px-5 py-3 text-white" onClick={retrySession}>إعادة المحاولة</button><button className="rounded-lg border border-border px-5 py-3 text-primary" onClick={signOut}>العودة لتسجيل الدخول</button></div></main>;
  if (!auth.user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (adminOnly && auth.user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (!adminOnly && auth.user.role === "admin" && !allowExpired) return <Navigate to="/admin" replace />;
  const subscription = effectiveSubscription(auth.user);
  if (!allowExpired && auth.user.role !== "admin" && (!subscription.canAccess || !auth.user.city)) return <Navigate to="/subscription" replace />;
  return <>{!allowExpired && !adminOnly && subscription.remainingDays <= 3 && <aside className="fixed bottom-4 start-4 z-40 max-w-xs rounded-xl border border-warning/30 bg-surface-raised p-4 text-sm shadow-lg" role="status">اشتراكك بينتهي خلال {subscription.remainingDays} أيام. <Link className="font-semibold text-primary underline" to="/subscription">جدّد من هون</Link></aside>}{children}</>;
}
