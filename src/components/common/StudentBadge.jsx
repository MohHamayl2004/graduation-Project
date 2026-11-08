import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

export default function StudentBadge({ onNavigate } = {}) {
  const { auth } = useAuth();
  if (!auth.user) return null;
  return <Link to="/dashboard" onClick={onNavigate} className="student-dashboard-link" aria-label={`لوحة الطالب — ${auth.user.fullName}`} title="لوحة الطالب">
    <bdi>{auth.user.fullName}</bdi>
  </Link>;
}
