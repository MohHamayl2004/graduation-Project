import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  CreditCard,
  Menu,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { streamLabel } from "../../../shared/academicStreams";
import Logo from "../common/Logo";

const navItems = [
  { id: "dashboard", icon: LayoutGrid, path: "/dashboard" },
  { id: "uploadMaterial", icon: CloudUpload, path: "/analysis" },
  { id: "myMaterials", icon: FolderOpen },
  { id: "aiTutor", icon: Sparkles, path: "/ai-tutor" },
  { id: "lectures", icon: PlaySquare, path: "/lectures" },
  { id: "quizzes", icon: CircleHelp, path: "/quizzes" },
  { id: "progress", icon: TrendingUp, path: "/progress" },
  { id: "studyPlan", icon: CalendarDays, path: "/study-plan" }
];

export default function Sidebar({ activeItem = "aiTutor" }) {
  const navigate = useNavigate();
  const { auth, signOut } = useAuth();
  const userName = auth.user?.fullName || "طالب نبراس";
  const userTrack = auth.user ? `الفرع ${streamLabel(auth.user.stream)}` : "";
  const { t } = useTranslation(["nav", "common"]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1024px)").matches);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => { setWide(query.matches); if (query.matches) setMobileOpen(false); };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const goTo = (path) => {
    setMobileOpen(false);
    if (path) navigate(path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label={t("common:nav.openMenu")}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
        className="app-menu-trigger fixed start-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-primary text-white shadow-md transition-colors duration-base hover:bg-primary-hover lg:hidden"
      >
        <Menu size={20} />
      </button>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        id="app-sidebar"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-hidden={!wide && !mobileOpen}
        {...(!wide && !mobileOpen ? { inert: "" } : {})}
        aria-label="التنقّل الرئيسي"
        className={`app-drawer fixed inset-y-0 start-0 z-50 flex w-[min(288px,90vw)] shrink-0 flex-col border-e border-border bg-surface-raised transition-transform duration-base ease-out lg:static lg:z-auto lg:flex lg:w-[248px] ${
          mobileOpen ? "translate-x-0" : "max-lg:invisible max-lg:-translate-x-full max-lg:rtl:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-7">
          <Logo height={30} />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t("common:nav.closeMenu")}
            className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-surface-alt lg:hidden"
          >
            <X size={18} />
          </button>
        </div>
        <p className="px-6 pt-1 text-sm text-ink-muted">{t("common:brand.tagline")}</p>

        <nav className="mt-8 flex-1 overflow-y-auto px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeItem;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(item.path)}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-start transition-colors duration-base ${
                      isActive ? "bg-primary-tint text-primary" : "text-ink-muted hover:bg-surface-alt hover:text-ink"
                    }`}
                  >
                    {isActive && <span className="absolute -start-3 h-6 w-1 rounded-e bg-primary" />}
                    <Icon size={19} strokeWidth={2} className="shrink-0" />
                    <span className="text-[15px] font-medium">{t(item.id)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mx-1 mt-3 border-t border-border pt-3">
            <button type="button" onClick={() => goTo("/subscription")} className="flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-start text-ink-muted hover:bg-surface-alt"><CreditCard size={19} />اشتراكي</button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-start text-ink-muted transition-colors duration-base hover:bg-surface-alt hover:text-ink"
            >
              <Settings size={19} className="shrink-0" />
              <span className="text-[15px] font-medium">{t("settings")}</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-tint font-bold text-primary">{userName.slice(0, 1)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{userName}</p>
              <p className="truncate text-xs text-ink-muted">{userTrack}</p>
            </div>
          </div>
          {auth.user && <button type="button" className="mt-3 text-sm text-ink-muted underline" onClick={() => { signOut(); navigate("/login"); }}>تسجيل الخروج</button>}
        </div>
      </aside>
    </>
  );
}
