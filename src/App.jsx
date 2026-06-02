import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import MainChat from "./components/MainChat";
import RightStudyPanel from "./components/RightStudyPanel";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Analysis from "./pages/Analysis";
import Dashboard from "./pages/Dashboard";
import Lectures from "./pages/Lectures";
import StudyPlan from "./pages/StudyPlan";
import Progress from "./pages/Progress";
import Quizzes from "./pages/Quizzes";

function AITutorScreen() {
  return (
    <div className="h-screen bg-[#f1f2f7] text-[#1b2131]">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="AI Tutor" />
        <MainChat />
        <RightStudyPanel />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/analysis" element={<Analysis />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/lectures" element={<Lectures />} />
      <Route path="/study-plan" element={<StudyPlan />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/quizzes" element={<Quizzes />} />
      <Route path="/ai-tutor" element={<AITutorScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
