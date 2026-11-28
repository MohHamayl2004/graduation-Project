# Reusable NIPRAS character engine

The active teacher remains the existing male avatar. The independent developer entry is `/character-playground.html` on the Vite dev server. It must not change student routing or book layout. No paid animation service is used.

## Avatar interchangeability

Add a descriptor to `src/character-engine/avatars.js`, with a GLB URL, adapter ID and intended height. Add asset-specific bone/morph aliases and calibration in `adapters.js`. Core controllers know semantic humanoid roles only. Do not reset imported root rotations/scales: the manager normalizes an outer wrapper and saves each bone's authored local rest transform.

Capabilities are validated per avatar. Missing/ambiguous bone chains disable only the affected arm; absent facial channels disable their controls. The supplied male/female assets share 80 joint names and 67 morph names, but neither contains animation clips. `retargetAnimationClip` transfers semantic quaternion tracks through source/target world rest frames; it explicitly skips translation, scale, unmapped and unsupported tracks with warnings. A generated head-nod clip can be retargeted to the other avatar in the playground. Unit tests also cover renamed joints and different rest axes. This is not a claim of general locomotion/root-motion or facial-clip retargeting. VRM is an optional future loader extension, not an installed dependency.

## Animation and speech

One viewport frame restores rest pose before motion, IK and facial layers. All targets use normalized scene world coordinates. Expression, gaze, blink and mouth channels must blend without changing the bind pose. Reduced motion and hidden/offscreen rendering are respected.

`TutorIntegration` observes real media events. Generating text is thinking, not speaking. Pause, buffering, interruption, failed requests and unmount close the mouth. Explicit externally supplied viseme cues follow `audio.currentTime`; Web Audio amplitude is an approximate mouth-opening fallback, not phoneme lip-sync. No lip-sync-quality claim is made without visual and audio review.

## Optional local Fish S2 Pro proxy

The application route is `POST /api/tutor/speech`, authenticated and subscription-gated like existing tutor endpoints. JSON input is `{ "text": "..." }` (maximum 2000 characters). It forwards multipart `text` and bounded generation settings to the native s2.cpp `/generate` endpoint. It does not accept voice references or clone voices. API secrets remain on the backend.

Set these variables in the backend's private environment only:

```dotenv
# Leave unset to keep speech explicitly unavailable (HTTP 503).
FISH_TTS_BASE_URL=http://127.0.0.1:8081
FISH_TTS_MODEL_ID=s2-pro-q6_k
FISH_TTS_TIMEOUT_MS=60000
FISH_TTS_MAX_TOKENS=1024
# FISH_TTS_API_KEY=<private server credential if required>
```

The URL must reach an already-running real Fish service from the backend (for example through an existing private tunnel). Downloaded model weights alone do not provide that service. This work does not start, stop, install or change anything on Vast.ai. Fish model licensing and voice authorization still apply. The proxy serializes generation and rejects non-audio, empty and oversized responses. Failed/missing services produce explicit errors rather than simulated speech.

The developer playground can use an actual local audio file without any Fish endpoint. That tests playback synchronization and interruption; it does not verify Fish synthesis or pronunciation. Production automatic speech stays opt-in via `VITE_NIPRAS_TUTOR_SPEECH=true`; the default user flow remains text-only. A browser may require a user gesture before playing audio. `nipras:speech-stop` interrupts playback; `nipras:teacher-point` accepts `{element}` or `{targetId,side}` and targets an existing lesson DOM element without changing its layout.

## Explicit emotion and gesture cues

Future tutor metadata can map `encouraging` to `face.setExpression('happy')`, `curious` to `curious`, `concerned` to `concerned`, and unknown/neutral to `neutral`. Teaching intents map to `animation.playGesture('explain')` or `viewport.pointAtElement(element, side)`. Existing tutor NDJSON does not supply emotion/phoneme timings; none are fabricated. Text streaming selects thinking; only actual media playback selects speaking. Avatar calibration, speech cue generation and animation remain independent.
