import {
  LayoutGrid,
  CloudUpload,
  FolderOpen,
  Sparkles,
  PlaySquare,
  CircleHelp,
  TrendingUp,
  CalendarDays,
  Settings,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { userProfile } from "../../data/userProfile";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
  { label: "Upload Material", icon: CloudUpload, path: "/analysis" },
  { label: "My Materials", icon: FolderOpen, path: "/materials" },
  { label: "AI Tutor", icon: Sparkles, path: "/ai-tutor" },
  { label: "Lectures", icon: PlaySquare, path: "/lectures" },
  { label: "Quizzes", icon: CircleHelp, path: "/quizzes" },
  { label: "Progress", icon: TrendingUp, path: "/progress" },
  { label: "Study Plan", icon: CalendarDays, path: "/study-plan" }
];

export default function Sidebar({ activeItem = "AI Tutor", userName, userTrack }) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  const displayName = userName || auth?.user?.fullName || userProfile.name;
  const displayTrack = userTrack || auth?.user?.academicStream || userProfile.stream;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="hidden w-[240px] shrink-0 border-r border-[#d7d9e3] bg-[#ececf2] lg:flex lg:flex-col">
      <div className="px-6 pt-8">
        <h1 className="text-[40px] font-bold leading-none tracking-tight text-[#1154cb]">NIPRAS</h1>
        <p className="mt-1 text-[16px] text-[#4f5568]">AI Learning Companion</p>
      </div>

      <nav className="mt-10 flex-1 px-3">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === activeItem;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => item.path && navigate(item.path)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                    isActive ? "bg-[#dbe0f3] text-[#0f58cf]" : "text-[#3c4151] hover:bg-[#e4e7f2]"
                  }`}
                >
                  {isActive && <span className="-ml-4 h-8 w-1 rounded-r bg-[#0f58cf]" />}
                  <Icon size={20} strokeWidth={2.1} />
                  <span className="text-[17px]">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mx-2 mt-4 space-y-1 border-t border-[#d3d6e0] pt-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[#3c4151] transition hover:bg-[#e4e7f2]"
          >
            <Settings size={20} />
            <span className="text-[17px]">Settings</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[#b3261e] transition hover:bg-[#f6e3e2]"
          >
            <LogOut size={20} />
            <span className="text-[17px]">Log out</span>
          </button>
        </div>
      </nav>

      <div className="border-t border-[#d7d9e3] px-4 py-5">
        <div className="flex items-center gap-3">
          <img src={userProfile.avatar} alt={displayName} className="h-11 w-11 rounded-full object-cover" />
          <div>
            <p className="text-[18px] leading-tight text-[#22283a]">{displayName}</p>
            <p className="text-[14px] text-[#5e6373]">{displayTrack}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
