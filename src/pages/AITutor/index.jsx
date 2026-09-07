import Sidebar from "../../components/layout/Sidebar";
import MainChat from "./MainChat";
import RightStudyPanel from "./RightStudyPanel";

export default function AITutor() {
  return (
    <div className="h-screen bg-surface text-ink">
      <div className="mx-auto flex h-full max-w-[1600px]">
        <Sidebar activeItem="aiTutor" />
        <MainChat />
        <RightStudyPanel />
      </div>
    </div>
  );
}
