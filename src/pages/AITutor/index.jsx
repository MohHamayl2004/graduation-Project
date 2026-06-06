import Sidebar from "../../components/layout/Sidebar";
import MainChat from "./MainChat";
import RightStudyPanel from "./RightStudyPanel";

export default function AITutor() {
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
