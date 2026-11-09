import { useLayoutEffect, useRef } from "react";
import { scrollbarMetrics, scrollbarOffset } from "../chatScrollbar";

export default function ChatScrollbar({ viewportRef, contentRef, enabled }) {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current, track = trackRef.current, thumb = thumbRef.current;
    if (!enabled || !viewport) { track.hidden = true; return; }
    const region = track.parentElement;
    const toggle = viewport.closest(".tutor-screen").querySelector(".tutor-panel-toggle");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = null, displayTop = null, lastTime = 0, drag = null;
    const listeners = [];
    const metrics = () => scrollbarMetrics(viewport.clientHeight, viewport.scrollHeight, viewport.scrollTop);
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(draw); };
    function draw(time) {
      frame = null;
      const state = metrics(), bounds = viewport.getBoundingClientRect(), parent = region.getBoundingClientRect();
      const obstacle = toggle?.getBoundingClientRect();
      track.hidden = state.maxScroll <= 0;
      if (track.hidden) { delete viewport.dataset.customScrollbar; return; }
      viewport.dataset.customScrollbar = "true";
      const blend = 1 - Math.exp(-Math.min(0.1, (time - (lastTime || time - 16)) / 1000) * 30);
      lastTime = time;
      displayTop = reduced.matches || drag || displayTop === null ? state.top : displayTop + (state.top - displayTop) * blend;
      displayTop = Math.max(0, Math.min(viewport.clientHeight - state.height, displayTop));
      if (Math.abs(displayTop - state.top) < 0.15) displayTop = state.top;
      const x = scrollbarOffset(displayTop, state.height, bounds.top, parent.left, obstacle);
      track.style.top = `${bounds.top - parent.top}px`;
      track.style.height = `${viewport.clientHeight}px`;
      thumb.style.height = `${state.height}px`;
      thumb.style.transform = `translate3d(${x}px, ${displayTop}px, 0)`;
      thumb.setAttribute("aria-valuemax", String(Math.ceil(state.maxScroll)));
      thumb.setAttribute("aria-valuenow", String(Math.round(viewport.scrollTop)));
      if (displayTop !== state.top) schedule();
    }
    const listen = (element, name, handler, options) => {
      element.addEventListener(name, handler, options);
      listeners.push(() => element.removeEventListener(name, handler, options));
    };
    listen(viewport, "scroll", schedule, { passive: true });
    listen(window, "resize", schedule);
    listen(reduced, "change", schedule);
    listen(track, "pointerdown", (event) => {
      if (event.target !== track || event.button !== 0) return;
      event.preventDefault();
      const state = metrics(), travel = viewport.clientHeight - state.height;
      viewport.scrollTop = travel > 0 ? (event.clientY - viewport.getBoundingClientRect().top - state.height / 2) / travel * state.maxScroll : 0;
      thumb.focus({ preventScroll: true });
      schedule();
    });
    listen(thumb, "pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      drag = { y: event.clientY, scrollTop: viewport.scrollTop };
      thumb.focus({ preventScroll: true });
      thumb.setPointerCapture(event.pointerId);
      schedule();
    });
    listen(thumb, "pointermove", (event) => {
      if (!drag) return;
      const state = metrics(), travel = viewport.clientHeight - state.height;
      if (travel > 0) viewport.scrollTop = drag.scrollTop + (event.clientY - drag.y) / travel * state.maxScroll;
      schedule();
    });
    const endDrag = () => { drag = null; schedule(); };
    listen(thumb, "pointerup", endDrag);
    listen(thumb, "pointercancel", endDrag);
    listen(thumb, "lostpointercapture", endDrag);
    listen(thumb, "keydown", (event) => {
      const page = viewport.clientHeight * 0.9;
      const steps = { ArrowUp: -40, ArrowDown: 40, PageUp: -page, PageDown: page, " ": event.shiftKey ? -page : page };
      if (event.key === "Home") viewport.scrollTop = 0;
      else if (event.key === "End") viewport.scrollTop = metrics().maxScroll;
      else if (event.key in steps) viewport.scrollTop += steps[event.key];
      else return;
      event.preventDefault();
      schedule();
    });
    const observer = new ResizeObserver(schedule);
    [viewport, contentRef.current, region, toggle?.closest(".tutor-panel-slot")].filter(Boolean).forEach((element) => observer.observe(element));
    schedule();
    return () => {
      listeners.forEach((remove) => remove());
      observer.disconnect();
      cancelAnimationFrame(frame);
      delete viewport.dataset.customScrollbar;
      if (document.activeElement === thumb) viewport.focus({ preventScroll: true });
    };
  }, [enabled, viewportRef, contentRef]);

  return <div ref={trackRef} className="chat-scrollbar" hidden={!enabled}>
    <div ref={thumbRef} className="chat-scrollbar-thumb" role="scrollbar" tabIndex={0} aria-label="تمرير المحادثة" aria-controls="tutor-chat-messages" aria-orientation="vertical" aria-valuemin={0} aria-valuemax={0} aria-valuenow={0} />
  </div>;
}
