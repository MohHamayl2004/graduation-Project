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
import Lesson from "../pages/Lesson";
import InteractiveLesson from "../pages/InteractiveLesson";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/analysis" element={<Analysis />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/lectures" element={<Lectures />} />
      <Route path="/lesson/:code" element={<Lesson />} />
      <Route path="/lesson" element={<Lesson />} />
      <Route path="/study-plan" element={<StudyPlan />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/quizzes" element={<Quizzes />} />
      <Route path="/ai-tutor" element={<AITutor />} />
      <Route path="/interactive" element={<InteractiveLesson />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
