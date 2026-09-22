# Full-screen NIPRAS video showcase

The homepage uses `src/assets/videos/main-page-library-video.mp4` through `src/config/journeyAssets.js`. Replace that file with another H.264 MP4 using the same filename, then rebuild/redeploy. No React edit is required. An optional still image can be set using `intro.poster`. Responsive crop positions are in the same config.

The video replaces only the first hero. The illustrated school welcome showcase is preserved as a separate second container. It sits directly below the preserved navbar, fills the full section with object-fit: cover, and occupies approximately the remaining viewport height (at least 85vh). No padding, margins, native controls, custom buttons, volume bar or fullscreen UI are shown. Playback is automatic, muted, inline, preload=auto, and pauses offscreen. It does not automatically loop and holds the final frame. Reduced-motion users see a still frame/poster instead of autoplay.

Missing media shows a simple branded placeholder without the old building illustration or headlines. Final media is not included. Keep important subjects within a central safe area for portrait cover cropping.

The separate school illustration section follows the video. The former scroll-controlled WebGL campus has been removed.
