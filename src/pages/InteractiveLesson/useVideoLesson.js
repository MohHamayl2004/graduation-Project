import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { dueCheckpoint, initialLessonState, lessonReducer } from "./lessonState";
import { tryEnterFullscreen } from "../../../shared/fullscreen.js";

// The same lesson rules as the YouTube player, for a video NIPRAS made and
// hosts itself (source.kind "video"): a plain <video> element, stopped at
// each unanswered checkpoint and not allowed to play on until it is answered.
export function useVideoLesson(lesson) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [state, dispatch] = useReducer(lessonReducer, initialLessonState);
  const video = useRef(null);
  const shell = useRef(null);
  const answers = useRef(state.answers);
  const current = useRef(state.current);

  answers.current = state.answers;
  current.current = state.current;

  const checkpoints = lesson?.checkpoints || [];
  const active = lesson?.source?.kind === "video";

  useEffect(() => {
    const element = video.current;
    if (!active || !element) return undefined;
    const check = () => {
      const due = dueCheckpoint(checkpoints, element.currentTime, answers.current);
      if (!due) return;
      element.pause();
      dispatch({ type: "reached", checkpoint: due });
    };
    // Pressing play on the native controls while a question is open must not
    // run the explanation past it.
    const onPlay = () => { if (current.current) element.pause(); else check(); };
    const onEnded = () => dispatch({ type: "finished" });
    const onError = () => setFailed(true);
    element.addEventListener("timeupdate", check);
    element.addEventListener("seeked", check);
    element.addEventListener("play", onPlay);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", onError);
    return () => {
      element.removeEventListener("timeupdate", check);
      element.removeEventListener("seeked", check);
      element.removeEventListener("play", onPlay);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", onError);
    };
  }, [active, checkpoints]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // The box goes fullscreen, not the <video>, so the question stays on top.
  const toggleFullscreen = useCallback(async () => {
    const box = shell.current;
    if (!box) return;
    if (expanded) { setExpanded(false); return; }
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { await exit?.call(document); } catch { setExpanded(false); }
      return;
    }
    if (!(await tryEnterFullscreen(box))) setExpanded(true);
  }, [expanded]);
  useEffect(() => { if (!expanded) return; const close = (e) => { if (e.key === "Escape") setExpanded(false); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [expanded]);

  const answer = useCallback((checkpoint, choiceId) => {
    dispatch({ type: "answered", checkpoint, choiceId, seconds: video.current?.currentTime ?? checkpoint.at });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: "resumed" });
    current.current = null;
    video.current?.play?.();
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: "restarted" });
    answers.current = {};
    current.current = null;
    if (video.current) { video.current.currentTime = 0; video.current.play?.(); }
  }, []);

  return { state, video, shell, failed, fullscreen: fullscreen || expanded, expanded, toggleFullscreen, answer, resume, restart };
}
