import { useEffect, useRef, useState } from 'react';
import { journeyAssets } from '../../config/journeyAssets';
import useReducedMotion from './useReducedMotion';
import './journey.css';

export default function Nipras3DIntro() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const ended = useRef(false);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [manualPlay, setManualPlay] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const media = journeyAssets.intro;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= .45) setNear(true);
      setVisible(entry.intersectionRatio >= .45);
    }, { threshold: [0, .45, .6] });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (visible && ready && (manualPlay || (!reduced && !manualPaused)) && !ended.current) {
      video.play().catch(() => {});
    } else video.pause();
  }, [visible, ready, reduced, manualPlay, manualPaused]);

  useEffect(() => {
    const header = sectionRef.current.parentElement.previousElementSibling;
    if (!header) return;
    const update = () => sectionRef.current?.style.setProperty('--showcase-nav-height', `${header.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(update);
    observer.observe(header); update();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) videoRef.current?.pause(); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  return (
    <section id="nipras-intro" ref={sectionRef} className="nipras-intro" aria-label="عرض نبراس"
      style={{ '--intro-desktop': media.position.desktop, '--intro-tablet': media.position.tablet, '--intro-mobile': media.position.mobile }}>
      <div className="showcase-placeholder" aria-hidden="true"><span>نبراس</span></div>
      {near && media.poster && !posterFailed && <img className="intro-poster" src={media.poster} alt="" onError={() => setPosterFailed(true)} />}
      {near && !failed && <video ref={videoRef} src={media.mp4} className={`intro-video ${ready ? 'is-ready' : ''}`} autoPlay={!reduced} muted playsInline preload="metadata" controls={false} disablePictureInPicture disableRemotePlayback
        controlsList="nodownload nofullscreen noremoteplayback" onContextMenu={event => event.preventDefault()}
        aria-label="فيلم ترحيبي في مدرسة نبراس" onLoadedData={() => setReady(true)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { ended.current = true; setPlaying(false); }} onError={() => setFailed(true)} />}
      {near && !failed && <button type="button" className="absolute bottom-4 end-4 z-10 min-h-11 rounded-lg bg-ink/80 px-4 py-2 text-sm text-white" aria-label={playing ? "إيقاف المقطع الترحيبي" : "تشغيل المقطع الترحيبي"} onClick={() => { if (playing) { setManualPlay(false); setManualPaused(true); videoRef.current?.pause(); } else { ended.current = false; setManualPlay(true); setManualPaused(false); videoRef.current?.play().catch(() => {}); } }}>{playing ? "إيقاف المقطع" : "تشغيل المقطع"}</button>}
    </section>
  );
}
