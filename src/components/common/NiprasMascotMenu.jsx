import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CreditCard, LogOut, Settings, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { mascotConfig } from "../../config/mascotConfig";
import "./nipras-mascot-menu.css";

export default function NiprasMascotMenu({ enabled = true, onNavigate, onOpenChange, art }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const menuId = useId();
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);

  const close = useCallback((restoreFocus = false) => {
    menuRef.current?.hidePopover();
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const menu = menuRef.current;
    const syncOpen = (event) => setOpen(event.newState === "open");
    menu.addEventListener("toggle", syncOpen);
    return () => menu.removeEventListener("toggle", syncOpen);
  }, []);

  useEffect(() => { if (!enabled) close(); }, [enabled, close]);

  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!menuRef.current.contains(event.target) && !triggerRef.current.contains(event.target)) close();
    };
    const onScroll = (event) => { if (!menuRef.current.contains(event.target)) close(); };
    const onResize = () => close();
    document.addEventListener("pointerdown", outside);
    // Close instead of leaving a detached menu when its trigger scrolls away.
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  const items = () => [...menuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
  const show = (last = false) => {
    if (!enabled) return;
    const menu = menuRef.current;
    menu.showPopover();
    const anchor = triggerRef.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    menu.style.maxWidth = `${Math.max(0, width - 24)}px`;
    menu.style.maxHeight = `${Math.max(0, height - 24)}px`;
    // Layout dimensions stay stable while the reveal animation scales the menu.
    const menuWidth = menu.offsetWidth, menuHeight = menu.offsetHeight;
    const x = Math.max(left + 12, Math.min(anchor.right - menuWidth, left + width - menuWidth - 12));
    const below = anchor.bottom + 8;
    const opensBelow = below + menuHeight <= top + height - 12;
    const y = opensBelow ? below : Math.max(top + 12, anchor.top - menuHeight - 8);
    menu.dataset.placement = opensBelow ? "bottom" : "top";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    setOpen(true);
    const targets = items();
    targets[last ? targets.length - 1 : 0]?.focus({ preventScroll: true });
  };

  const onMenuKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // Close the account menu before the mobile drawer.
      close(true);
    } else if (event.key === "Tab") {
      close(true); // Let Tab continue naturally from the trigger.
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const targets = items();
      const index = targets.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? targets.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + targets.length) % targets.length;
      targets[next]?.focus({ preventScroll: true });
    }
  };

  const goTo = (path, logout = false) => {
    close();
    if (logout) signOut();
    onNavigate?.();
    navigate(path);
  };

  return <div className="nipras-mascot" style={{
    "--mascot-size": `${mascotConfig.size}px`,
    "--mascot-float-distance": `${-mascotConfig.floatDistance}px`,
    "--mascot-float-duration": `${mascotConfig.floatDuration}s`
  }}>
    <button ref={triggerRef} type="button" className="nipras-mascot-trigger" aria-label="قائمة الحساب" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} popovertarget={menuId}
      onClick={(event) => { event.preventDefault(); open ? close(true) : show(); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); show(event.key === "ArrowUp"); }
      }}>
      <span className="nipras-mascot-art" data-floating={!art && mascotConfig.floating}>
        {art || (imageFailed ? <Sparkles size={32} aria-hidden="true" /> : <img src={mascotConfig.image} alt="" width={mascotConfig.size} height={mascotConfig.size} decoding="async" onError={() => setImageFailed(true)} />)}
      </span>
    </button>
    {/* Native popovers use the browser's top layer, outside overflow clipping,
        while remaining inside the drawer's DOM and keyboard focus boundary. */}
    <div ref={menuRef} id={menuId} popover="auto" role="menu" aria-label="إجراءات الحساب" dir="rtl" className="nipras-account-menu" onKeyDown={onMenuKeyDown}>
      <button type="button" role="menuitem" tabIndex={-1} onClick={() => goTo("/subscription")}><CreditCard size={18} aria-hidden="true" /><span>الاشتراكات</span></button>
      <button type="button" role="menuitem" tabIndex={-1} disabled aria-disabled="true"><Settings size={18} aria-hidden="true" /><span>الإعدادات</span><small>قريبًا</small></button>
      <button type="button" role="menuitem" tabIndex={-1} onClick={() => goTo("/", true)}><LogOut size={18} aria-hidden="true" /><span>تسجيل الخروج</span></button>
    </div>
  </div>;
}
