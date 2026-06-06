import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, isAllowed = true, redirectTo = "/login" }) {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
