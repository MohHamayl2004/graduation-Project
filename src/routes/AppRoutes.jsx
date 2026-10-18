import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Analysis from "../pages/Analysis";
import Dashboard from "../pages/Dashboard";
import Lectures from "../pages/Lectures";
import StudyPlan from "../pages/StudyPlan";
import Progress from "../pages/Progress";
import Quizzes from "../pages/Quizzes";
import AITutor from "../pages/AITutor";
import Lesson from "../pages/Lesson";
import InteractiveLesson from "../pages/InteractiveLesson";
import ProtectedRoute from "./ProtectedRoute";
const Subscription = lazy(() => import("../pages/Subscription"));
const Admin = lazy(() => import("../pages/Admin"));
const Coupons = lazy(() => import("../pages/Admin/Coupons"));
const loadingPage = <p role="status" className="p-8 text-center text-ink-muted">جاري تحميل الصفحة…</p>;

const privatePage = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/subscription" element={<ProtectedRoute allowExpired><Suspense fallback={loadingPage}><Subscription /></Suspense></ProtectedRoute>} />
      <Route path="/subscription/checkout" element={<ProtectedRoute allowExpired><Suspense fallback={loadingPage}><Subscription /></Suspense></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><Suspense fallback={loadingPage}><Admin /></Suspense></ProtectedRoute>} />
      <Route path="/admin/coupons" element={<ProtectedRoute adminOnly><Suspense fallback={loadingPage}><Coupons /></Suspense></ProtectedRoute>} />
      <Route path="/analysis" element={privatePage(<Analysis />)} />
      <Route path="/dashboard" element={privatePage(<Dashboard />)} />
      <Route path="/lectures" element={privatePage(<Lectures />)} />
      <Route path="/lesson/:code" element={privatePage(<Lesson />)} />
      <Route path="/lesson" element={privatePage(<Lesson />)} />
      <Route path="/study-plan" element={privatePage(<StudyPlan />)} />
      <Route path="/progress" element={privatePage(<Progress />)} />
      <Route path="/quizzes" element={privatePage(<Quizzes />)} />
      <Route path="/ai-tutor" element={privatePage(<AITutor />)} />
      <Route path="/interactive" element={privatePage(<InteractiveLesson />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
