import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
  ChevronLeft,
  Menu,
  X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../common/Logo";
import NiprasMascotMenu from "../common/NiprasMascotMenu";
import StudentBadge from "../common/StudentBadge";

const TeacherCharacter = lazy(() => import("../../pages/AITutor/components/TeacherCharacter"));

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

export default function Sidebar({ activeItem = "aiTutor", mascotArt }) {
  const navigate = useNavigate();
  const { t } = useTranslation(["nav", "common"]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef(null);
  const triggerRef = useRef(null);
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const isCollapsed = wide && !hovered && !focusWithin && !accountOpen;

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => { setWide(query.matches); if (query.matches) setMobileOpen(false); };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobileOpen || wide) return;
    const drawer = drawerRef.current;
    const previousFocus = document.activeElement;
    const slot = drawer.parentElement;
    const siblings = [...slot.parentElement.children].filter((element) => element !== slot && !element.contains(triggerRef.current) && !element.hasAttribute("data-drawer-backdrop"));
    const previousInert = siblings.map((element) => element.inert);
    siblings.forEach((element) => { element.inert = true; });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () => [...drawer.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
    controls()[0]?.focus();
    return () => {
      siblings.forEach((element, index) => { element.inert = previousInert[index]; });
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mobileOpen, wide]);

  const onDrawerKeyDown = (event) => {
    if (!mobileOpen || wide) return;
    if (event.key === "Escape") { event.preventDefault(); setMobileOpen(false); }
    if (event.key !== "Tab") return;
    const items = [...drawerRef.current.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')];
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  const goTo = (path) => {
    setMobileOpen(false);
    if (path) navigate(path);
  };

  return (
    <>
      <button
        ref={triggerRef}
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
          data-drawer-backdrop
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="app-sidebar-slot">
      <aside
        ref={drawerRef}
        onKeyDown={onDrawerKeyDown}
        id="app-sidebar"
        data-collapsed={isCollapsed}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false); }}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-hidden={!wide && !mobileOpen}
        {...(!wide && !mobileOpen ? { inert: "" } : {})}
        aria-label="التنقّل الرئيسي"
        className={`app-drawer fixed inset-y-0 start-0 z-50 flex shrink-0 flex-col lg:z-auto ${
          mobileOpen ? "translate-x-0" : "max-lg:invisible max-lg:-translate-x-full max-lg:rtl:translate-x-full"
        }`}
      >
        <div className="app-drawer-header">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t("common:nav.closeMenu")}
            className="app-drawer-close grid h-11 w-11 place-items-center rounded-md lg:hidden"
          >
            <X size={18} />
          </button>
          <button type="button" className="app-drawer-toggle hidden lg:grid" onClick={() => drawerRef.current?.querySelector("nav button")?.focus()} aria-expanded={!isCollapsed} aria-controls="app-sidebar" aria-label="إظهار روابط التنقّل" title="روابط التنقّل">
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          {!isCollapsed && <div className="app-drawer-brand">
            <Logo variant="white" height={30} to="/dashboard" onClick={() => setMobileOpen(false)} className="app-drawer-wordmark" />
          </div>}
        </div>

        <nav aria-label="التنقّل الرئيسي" className="mt-8 flex-1 px-3">
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
                    aria-label={t(item.id)}
                    title={isCollapsed ? t(item.id) : undefined}
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
        </nav>
        <div className="app-drawer-account">
          <NiprasMascotMenu art={mascotArt || <Suspense fallback={null}><TeacherCharacter idleOnly /></Suspense>} enabled={wide || mobileOpen} onOpenChange={setAccountOpen} onNavigate={() => setMobileOpen(false)} />
          <StudentBadge onNavigate={() => setMobileOpen(false)} />
        </div>
      </aside>
      </div>
    </>
  );
}
