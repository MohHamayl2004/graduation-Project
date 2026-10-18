import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { dueCheckpoint, initialLessonState, lessonReducer } from "./lessonState";
import { tryEnterFullscreen } from "../../../shared/fullscreen.js";

// The YouTube iframe API, loaded once for the whole app.
let apiPromise = null;
function youtubeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

const TICK_MS = 250;

// Watches the time, stops at the next unanswered checkpoint, resumes when the
// student answers. The video is embedded through YouTube's own player - it is
// never downloaded - so the channel keeps its view and its rights.
export function useYouTubeLesson(lesson) {
  const [expanded, setExpanded] = useState(false);
  const [state, dispatch] = useReducer(lessonReducer, initialLessonState);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const mount = useRef(null);
  // Our own box goes fullscreen, not the iframe: YouTube's own fullscreen
  // shows only the iframe, and the question - which lives outside it - would
  // be hidden behind the video.
  const shell = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const player = useRef(null);
  const timer = useRef(null);
  const answers = useRef(state.answers);

  answers.current = state.answers;

  const checkpoints = lesson?.checkpoints || [];
  const videoId = lesson?.source?.videoId || "";

  useEffect(() => {
    if (!videoId || !mount.current) return undefined;
    let cancelled = false;

    youtubeApi().then((YT) => {
      if (cancelled || !mount.current) return;
      player.current = new YT.Player(mount.current, {
        videoId,
        // fs: 0 hides YouTube's fullscreen button; ours is beside it.
        playerVars: { rel: 0, modestbranding: 1, fs: 0, cc_lang_pref: "ar", hl: "ar", playsinline: 1 },
        events: {
          onReady: () => setReady(true),
          onError: () => setFailed(true),
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) dispatch({ type: "finished" });
          }
        }
      });
    });

    timer.current = setInterval(() => {
      const instance = player.current;
      if (!instance?.getCurrentTime) return;
      const seconds = instance.getCurrentTime();
      const due = dueCheckpoint(checkpoints, seconds, answers.current);
      if (due && instance.getPlayerState?.() === 1) {
        instance.pauseVideo();
        dispatch({ type: "reached", checkpoint: due });
      }
    }, TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(timer.current);
      player.current?.destroy?.();
      player.current = null;
    };
  }, [videoId, checkpoints]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

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
    dispatch({ type: "answered", checkpoint, choiceId, seconds: player.current?.getCurrentTime?.() || checkpoint.at });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: "resumed" });
    player.current?.playVideo?.();
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: "restarted" });
    player.current?.seekTo?.(0, true);
    player.current?.playVideo?.();
  }, []);

  return { state, mount, shell, ready, failed, fullscreen: fullscreen || expanded, expanded, toggleFullscreen, answer, resume, restart };
}
