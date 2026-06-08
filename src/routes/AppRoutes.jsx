import { Navigate, Route, Routes } from "react-router-dom";
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
import Materials from "../pages/Materials";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/analysis" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/lectures" element={<ProtectedRoute><Lectures /></ProtectedRoute>} />
      <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
      <Route path="/study-plan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/quizzes" element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
      <Route path="/ai-tutor" element={<ProtectedRoute><AITutor /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
