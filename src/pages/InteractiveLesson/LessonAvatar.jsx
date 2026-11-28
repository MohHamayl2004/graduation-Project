import { useEffect, useRef, useState } from "react";
import { CharacterViewport } from "../../character-engine/CharacterViewport.jsx";
import { avatarAction, cueAt, mouthEnergy, wordAt } from "./avatarTimeline";
import { applySignFrame, frameAt, releaseSign, segmentAt, signBlend } from "../../character-engine/SignMotion.js";

// The companion character beside the lesson video, in the same frame. It has no
// player of its own: it reads the video element's clock and events, so it starts,
// pauses, seeks, changes speed and ends exactly with the video.
// track: recorded signs for sentences, [{ start, end, clip, gloss }] in video seconds;
// each clip is public/signs/<clip>.json, made from a signer's video by tools/sign-capture.
export default function LessonAvatar({ videoRef, cues, track = [], source = "" }) {
  const character = useRef(null);
  const [clock, setClock] = useState({ t: 0, playing: false, ended: false, rate: 1 });
  const [seeks, setSeeks] = useState(0);
  const live = useRef(clock);
  live.current = clock;
  const pointedCue = useRef(-1);
  const clips = useRef({});
  const [, setLoaded] = useState(0);
  // Load the clips the track uses.
  useEffect(() => {
    let alive = true;
    for (const name of new Set(track.map((s) => s.clip))) {
      if (clips.current[name]) continue;
      fetch(`${import.meta.env.BASE_URL}signs/${name}.json`).then((r) => (r.ok ? r.json() : null)).then((clip) => { if (alive && clip) { clips.current[name] = clip; setLoaded((n) => n + 1); } }).catch(() => {});
    }
    return () => { alive = false; };
  }, [track]);
  const signedTrack = track.map((s) => ({ ...s, clipDuration: clips.current[s.clip]?.duration }));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    let frame = 0;
    const read = () => setClock({ t: video.currentTime, playing: !video.paused && !video.ended, ended: video.ended, rate: video.playbackRate || 1 });
    // While playing, follow the video every animation frame for word-level timing.
    const follow = () => { read(); if (!video.paused && !video.ended) frame = requestAnimationFrame(follow); };
    const start = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(follow); };
    const events = { play: start, playing: start, pause: read, seeked: () => { read(); setSeeks((n) => n + 1); }, seeking: read, ratechange: read, ended: read, timeupdate: () => video.paused && read() };
    for (const [name, fn] of Object.entries(events)) video.addEventListener(name, fn);
    read();
    return () => { cancelAnimationFrame(frame); for (const [name, fn] of Object.entries(events)) video.removeEventListener(name, fn); };
  }, [videoRef]);

  const signing = !clock.ended && segmentAt(signedTrack.filter((s) => clips.current[s.clip]), clock.t);
  const action = signing ? { state: "idle", cue: cueAt(cues, clock.t), point: false } : avatarAction({ cues, t: clock.t, playing: clock.playing, ended: clock.ended });

  // Point at the video once per sentence that talks about what is on screen.
  useEffect(() => {
    if (!action.point || !clock.playing || pointedCue.current === action.cue) return;
    pointedCue.current = action.cue;
    character.current?.pointAtElement(videoRef.current, "right");
  }, [action.point, action.cue, clock.playing, videoRef]);
  useEffect(() => { if (clock.ended) pointedCue.current = -1; }, [clock.ended]);

  // Lips move on the video's clock: read the time again on every rendered frame.
  const onFrame = () => {
    const video = videoRef.current, face = character.current?.getControllers()?.face;
    if (!video || !face) return;
    const playing = !video.paused && !video.ended;
    const energy = mouthEnergy({ cues, t: video.currentTime, playing });
    face.setSpeech({ playing: energy > 0, energy });
  };

  // After the teacher's own animation, put the arms and fingers where the signer's were.
  const onAfterFrame = (controllers) => {
    const video = videoRef.current;
    if (!video) return;
    const ready = signedTrack.filter((s) => clips.current[s.clip]);
    const live = !video.ended && segmentAt(ready, video.currentTime);
    if (!live) { releaseSign(controllers.rig); return; }
    const blend = signBlend(ready, video.currentTime);
    // Coming straight from another sign: start from that sign's pose, then blend into this one.
    if (blend?.previous && blend.into < 1) applySignFrame(controllers.rig, frameAt(clips.current[blend.previous.clip], blend.previous.clipDuration ?? 0));
    applySignFrame(controllers.rig, frameAt(clips.current[live.seg.clip], live.clipTime), blend?.previous ? Math.min(blend.into, blend.weight) : blend?.weight ?? 1);
  };

  const index = cueAt(cues, clock.t);
  const caption = index >= 0 ? wordAt(cues[index], clock.t) : null;
  return <div className="lesson-avatar" dir="rtl" data-state={action.state} data-playing={clock.playing || undefined}>
    <div className="lesson-avatar-stage">
      <CharacterViewport ref={character} framing="signer" state={action.state} paused={!clock.playing} timeScale={clock.rate} onFrame={onFrame} onAfterFrame={onAfterFrame} settleKey={seeks} outline={false} />
      {signing && <span className="lesson-avatar-gloss">{signing.seg.gloss}</span>}
    </div>
    <p className="lesson-avatar-caption" aria-live="off">
      {caption ? caption.words.map((w, i) => <span key={`${index}-${i}`} className={i === caption.index ? "is-now" : i < caption.index ? "is-said" : ""}>{w} </span>) : <span className="is-idle">{clock.ended ? "انتهى الشرح" : clock.playing ? "…" : "شغّل الفيديو"}</span>}
    </p>
    <p className="lesson-avatar-note">{track.length ? (source || "إشارات مسجّلة") + " · باقي الشرح شخصية مرافقة" : "شخصية مرافقة تتبع الشرح · ليست ترجمة رسمية بلغة الإشارة"}</p>
  </div>;
}
