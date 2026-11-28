import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, CreditCard, LogOut, Settings, UserRound, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { mascotConfig } from "../../config/mascotConfig";
import {updateAvatar} from '../../services/authService.js';
import {prepareProfileAvatar} from '../../utils/profileAvatar.js';
import "./nipras-mascot-menu.css";

export default function NiprasMascotMenu({ enabled = true, onNavigate, onOpenChange, art }) {
  const { auth, updateUser, signOut } = useAuth();
  const navigate = useNavigate();
  const menuId = useId();
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const picker=useRef(null),mounted=useRef(true),saving=useRef(false);
  const [photoBusy,setPhotoBusy]=useState(false),[photoError,setPhotoError]=useState('');
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>setImageFailed(false),[auth.user?.avatarUrl]);
  const initials=(auth.user?.fullName||'').trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('');
  const savePhoto=async(file)=>{
    if(saving.current||!auth.token)return;saving.current=true;setPhotoBusy(true);setPhotoError('');
    try{
      const avatarUrl=file?await prepareProfileAvatar(file):'';
      const result=await updateAvatar(avatarUrl,auth.token);
      if(mounted.current)updateUser(result.user);
    }catch(error){if(mounted.current)setPhotoError(error.message||'تعذر حفظ الصورة. حاول مرة أخرى.');}
    finally{saving.current=false;if(mounted.current)setPhotoBusy(false);if(picker.current)picker.current.value='';}
  };
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

  return <div className={`nipras-mascot ${auth.user?'nipras-student-avatar':''}`} style={{
    "--mascot-size": `${mascotConfig.size}px`,
    "--mascot-float-distance": `${-mascotConfig.floatDistance}px`,
    "--mascot-float-duration": `${mascotConfig.floatDuration}s`
  }}>
    <button ref={triggerRef} type="button" className="nipras-mascot-trigger" aria-label="قائمة الحساب" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} popovertarget={menuId}
      onClick={(event) => { event.preventDefault(); open ? close(true) : show(); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); show(event.key === "ArrowUp"); }
      }}>
      <span className="nipras-mascot-art" data-floating={false}>
        {auth.user?(auth.user.avatarUrl&&!imageFailed?<img src={auth.user.avatarUrl} alt="" decoding="async" onError={()=>setImageFailed(true)}/>:<span className="nipras-profile-initials">{initials||<UserRound size={40}/>}</span>):art||<UserRound size={40}/>}
      </span>
      {auth.user&&<span className="nipras-profile-camera" aria-hidden="true"><Camera size={16}/></span>}
    </button>
    <input ref={picker} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="اختيار صورة شخصية" onChange={event=>{const file=event.target.files?.[0];if(file)savePhoto(file);}}/>
    {photoBusy&&<span className="nipras-profile-status" role="status">جارٍ حفظ الصورة…</span>}
    {photoError&&<p className="nipras-profile-error" role="alert">{photoError}</p>}
    {/* Native popovers use the browser's top layer, outside overflow clipping,
        while remaining inside the drawer's DOM and keyboard focus boundary. */}
    <div ref={menuRef} id={menuId} popover="auto" role="menu" aria-label="إجراءات الحساب" dir="rtl" className="nipras-account-menu" onKeyDown={onMenuKeyDown}>
      <button type="button" role="menuitem" tabIndex={-1} disabled={photoBusy} onClick={()=>{close();picker.current?.click();}}><Camera size={18}/><span>اختيار صورة شخصية</span></button>
      {auth.user?.avatarUrl&&<button type="button" role="menuitem" tabIndex={-1} disabled={photoBusy} onClick={()=>{close();savePhoto(null);}}><Trash2 size={18}/><span>إزالة الصورة الشخصية</span></button>}
      <button type="button" role="menuitem" tabIndex={-1} onClick={() => goTo("/subscription")}><CreditCard size={18} aria-hidden="true" /><span>الاشتراكات</span></button>
      <button type="button" role="menuitem" tabIndex={-1} disabled aria-disabled="true"><Settings size={18} aria-hidden="true" /><span>الإعدادات</span><small>قريبًا</small></button>
      <button type="button" role="menuitem" tabIndex={-1} onClick={() => goTo("/", true)}><LogOut size={18} aria-hidden="true" /><span>تسجيل الخروج</span></button>
    </div>
  </div>;
}
