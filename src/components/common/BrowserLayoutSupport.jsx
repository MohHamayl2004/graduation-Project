import { useEffect } from "react";
import { visibleViewportMetrics } from "../../../shared/browserViewport.js";

// Keep the app usable when browser chrome or a software keyboard changes the
// visible area. Ignore pinch zoom: it must continue to work as normal zoom.
export default function BrowserLayoutSupport() {
  useEffect(() => {
    const root = document.documentElement;
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        const metrics = visibleViewportMetrics(vv, window.innerHeight);
        if (!metrics) return;
        root.style.setProperty("--app-height", `${metrics.height}px`);
        root.style.setProperty("--viewport-top", `${metrics.top}px`);
        const focused = document.activeElement;
        if (focused?.matches("input, textarea, select") && !focused.closest("[aria-modal=true]")) {
          const rect = focused.getBoundingClientRect();
          if (rect.bottom > (vv?.height || window.innerHeight) + (vv?.offsetTop || 0) || rect.top < (vv?.offsetTop || 0)) focused.scrollIntoView({ block: "nearest" });
        }
      });
    };
    update(); window.addEventListener("resize", update); window.visualViewport?.addEventListener("resize", update); window.visualViewport?.addEventListener("scroll", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", update); window.visualViewport?.removeEventListener("resize", update); window.visualViewport?.removeEventListener("scroll", update); };
  }, []);
  useEffect(() => {
    let cleanup = () => {}, current = null;
    const sync = () => {
      const dialogs = [...document.querySelectorAll('[aria-modal="true"]')].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden");
      const dialog = dialogs.at(-1) || null;
      if (dialog === current) return;
      cleanup(); current = dialog;
      if (!dialog) { cleanup = () => {}; return; }
      const previousFocus = document.activeElement, changes = [];
      const save = (el, name, value) => { const old = el.style[name]; el.style[name] = value; changes.push(() => { el.style[name] = old; }); };
      // Lock scrollable ancestors too: most student pages scroll inside main.
      let node = dialog.parentElement;
      while (node) {
        if (node === document.body || node.scrollHeight > node.clientHeight) save(node, "overflow", "hidden");
        node = node.parentElement;
      }
      let branch = dialog;
      while (branch.parentElement && branch !== document.body) {
        for (const sibling of branch.parentElement.children) {
          if (sibling === branch || sibling.getAttribute("aria-hidden") === "true" || ["SCRIPT", "STYLE"].includes(sibling.tagName)) continue;
          const inert = sibling.hasAttribute("inert"), hidden = sibling.getAttribute("aria-hidden");
          sibling.setAttribute("inert", ""); sibling.setAttribute("aria-hidden", "true");
          changes.push(() => { if (!inert) sibling.removeAttribute("inert"); if (hidden === null) sibling.removeAttribute("aria-hidden"); else sibling.setAttribute("aria-hidden", hidden); });
        }
        branch = branch.parentElement;
      }
      const focusable = () => [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((e) => e.getClientRects().length);
      if (!dialog.contains(document.activeElement)) { if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1"); (focusable()[0] || dialog).focus({ preventScroll: true }); }
      const key = (e) => {
        if (e.key === "Escape") {
          const close = dialog.querySelector('[data-dialog-close], button[aria-label^="إغلاق"]') || [...dialog.querySelectorAll("button")].find((b) => ["إلغاء", "رجوع"].includes(b.textContent.trim()));
          if (close && !close.disabled) { e.preventDefault(); close.click(); }
        }
        if (e.key !== "Tab") return;
        const targets = focusable(), first = targets[0] || dialog, last = targets.at(-1) || dialog;
        if (!dialog.contains(document.activeElement) || (e.shiftKey && (document.activeElement === first || document.activeElement === dialog))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !targets.length)) { e.preventDefault(); first.focus(); }
      };
      document.addEventListener("keydown", key);
      cleanup = () => { changes.reverse().forEach((restore) => restore()); document.removeEventListener("keydown", key); if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-modal"] }); sync();
    return () => { observer.disconnect(); cleanup(); };
  }, []);
  return null;
}
