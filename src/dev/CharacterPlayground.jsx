import { useCallback, useEffect, useRef, useState } from 'react';
import CharacterViewport from '../character-engine/CharacterViewport.jsx';
import { CHARACTER_STATES } from '../character-engine/AnimationController.js';
import { TutorIntegration } from '../character-engine/TutorIntegration.js';
import { FishSpeechClient } from '../character-engine/FishSpeechClient.js';
import { API_BASE_URL } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import * as THREE from 'three';
import { retargetAnimationClip } from '../character-engine/retarget.js';

const initialHands = { left: [.42, 1.1, .25], right: [-.42, 1.1, .25] };
function Slider({ label, value, min, max, step = .02, disabled, onChange }) {
  return <label className="character-slider"><span>{label}<output>{Number(value).toFixed(2)}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={event => onChange(Number(event.target.value))} /></label>;
}
export default function CharacterPlayground() {
  const viewport = useRef(null), audio = useRef(null), bridge = useRef(null), audioContext = useRef(null), pointTarget = useRef(null), telemetry = useRef(null);
  const speechRequest = useRef(null);
  const { auth } = useAuth();
  const [avatar, setAvatar] = useState('male'), [state, setState] = useState('idle'), [expression, setExpression] = useState('neutral');
  const [capabilities, setCapabilities] = useState({}), [warnings, setWarnings] = useState([]), [status, setStatus] = useState('Loading avatar…');
  const [hands, setHands] = useState(initialHands), [enabled, setEnabled] = useState({ left: false, right: false }), [head, setHead] = useState({ yaw: 0, pitch: 0, roll: 0 });
  const [posture, setPosture] = useState({ lean: 0, twist: 0, sway: 0 });
  const [trackEyes, setTrackEyes] = useState(true), [reduced, setReduced] = useState(false), [source, setSource] = useState('');
  const [speechText, setSpeechText] = useState('مرحباً، أنا معلّم نبراس. المشتقة تصف معدل تغيّر الدالة.');
  const [audioStatus, setAudioStatus] = useState('No audio loaded'), [busy, setBusy] = useState(false);
  const latest = useRef(null); latest.current = { enabled, hands, head, expression, posture };
  const controls = () => viewport.current?.getControllers();
  useEffect(() => {
    const integration = new TutorIntegration({ getControllers: () => viewport.current?.getControllers(), onStatus: setAudioStatus }); bridge.current = integration;
    window.__niprasCharacter = { getSnapshot: () => viewport.current?.getSnapshot(), getControllers: () => viewport.current?.getControllers(), setCharacter: id => viewport.current?.setCharacter(id), pointAtElement: (el, side) => viewport.current?.pointAtElement(el, side), getSpeech: () => ({ playing: integration.playing, currentTime: integration.audio?.currentTime || 0 }) };
    return () => { speechRequest.current?.abort(); integration.dispose(); if (bridge.current === integration) bridge.current = null; delete window.__niprasCharacter; };
  }, []);
  useEffect(() => {
    if (audio.current && source) bridge.current?.attachAudio(audio.current);
    return () => { if (source) URL.revokeObjectURL(source); };
  }, [source]);
  useEffect(() => () => { audioContext.current?.close().catch(() => {}); }, []);
  const onReady = useCallback(engine => {
    const snapshot = engine.getSnapshot(); setCapabilities(snapshot.capabilities); setWarnings(snapshot.warnings); setStatus('Ready');
    const { enabled: currentEnabled, hands: currentHands, head: currentHead, expression: currentExpression, posture: currentPosture } = latest.current;
    for (const side of ['left', 'right']) if (currentEnabled[side]) engine.getControllers().ik.setHandTarget(side, currentHands[side]);
    engine.getControllers().ik.setHeadRotation(Object.fromEntries(Object.entries(currentHead).map(([key, value]) => [key, value * Math.PI / 180])));
    engine.getControllers().face.setExpression(currentExpression);
    engine.getControllers().ik.setPosture(Object.fromEntries(Object.entries(currentPosture).map(([key,value])=>[key,value*Math.PI/180])));
  }, []);
  const frame = useCallback((delta, elapsed) => {
    bridge.current?.update();
    if (telemetry.current && Math.floor(elapsed * 2) !== Number(telemetry.current.dataset.tick)) {
      const snapshot = viewport.current?.getSnapshot(); telemetry.current.dataset.tick = String(Math.floor(elapsed * 2));
      telemetry.current.textContent = snapshot?.renderer ? `${snapshot.renderer.triangles.toLocaleString()} triangles · ${snapshot.renderer.calls} draw calls` : 'Preparing renderer';
    }
  }, []);
  const handChange = (side, axis, value) => {
    const next = { ...hands, [side]: hands[side].map((old, index) => index === axis ? value : old) };
    setHands(next); controls()?.ik.setHandTarget(side, next[side]);
  };
  const handToggle = (side, checked) => { setEnabled({ ...enabled, [side]: checked }); controls()?.ik.setHandTarget(side, checked ? hands[side] : null); };
  const headChange = (axis, value) => { const next = { ...head, [axis]: value }; setHead(next); controls()?.ik.setHeadRotation(Object.fromEntries(Object.entries(next).map(([key, angle]) => [key, angle * Math.PI / 180]))); };
  const postureChange = (axis, value) => { const next = { ...posture, [axis]: value }; setPosture(next); controls()?.ik.setPosture(Object.fromEntries(Object.entries(next).map(([key,angle])=>[key,angle*Math.PI/180]))); };
  const startAnalysis = () => {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    if (bridge.current?.audio !== audio.current) bridge.current?.attachAudio(audio.current);
    audioContext.current ||= new Context(); bridge.current?.enableAudioAnalysis(audioContext.current); audioContext.current.resume().catch(() => {});
  };
  const generateSpeech = async () => {
    speechRequest.current?.abort(); const request = new AbortController(); speechRequest.current = request;
    setBusy(true); setAudioStatus('Requesting Fish speech…');
    try {
      const client = new FishSpeechClient({ endpoint: `${API_BASE_URL}/tutor/speech` });
      const blob = await client.synthesize(speechText, { token: auth?.token, signal: request.signal });
      if (request.signal.aborted) return;
      bridge.current?.interrupt(); setSource(URL.createObjectURL(blob)); setAudioStatus('Fish audio ready — press play');
    } catch (error) { if (!request.signal.aborted) setAudioStatus(error.message); } finally { if (speechRequest.current === request) { speechRequest.current = null; setBusy(false); } }
  };
  const stopSpeech = () => { speechRequest.current?.abort(); speechRequest.current = null; setBusy(false); bridge.current?.interrupt(); };
  const teachingGesture = action => {
    const controllers = controls(); if (!controllers) return;
    controllers.ik.clearTargets(); setEnabled({left:false,right:false});
    const animation = controllers.animation;
    if (action === 'switch') { animation.switchHands(); setState('speaking'); return; }
    if (action === 'idle') stopSpeech();
    animation.cancelGestures();
    const nextState = action === 'pocket-left' ? 'talking_right_hand' : action === 'pocket-right' ? 'talking_left_hand' : action === 'explain' || action === 'point' ? 'explaining' : 'idle';
    animation.setState(nextState); setState(nextState);
    if (action === 'greeting') animation.greet({force:true});
    if (action === 'pocket-left') animation.restHand('left');
    if (action === 'pocket-right') animation.restHand('right');
    if (action === 'explain' || action === 'point') animation.playGesture(action, {side:action === 'point'?'left':'right'});
    if (action === 'point') viewport.current?.pointAtElement(pointTarget.current,'left');
    if (action === 'idle') controllers.face.setExpression('neutral');
    if (action === 'encourage') { controllers.face.setExpression('happy',.55); animation.playGesture('encourage',{side:'right',duration:2}); }
  };
  const retargetDemo = async () => {
    const sourceRig = controls()?.rig; if (!sourceRig?.bones.Head) return;
    stopSpeech();
    const headBone = sourceRig.bones.Head, rest = sourceRig.restPose.get(headBone), values = [];
    for (const angle of [0, .2, -.1, 0]) {
      const world = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
      const delta = rest.worldQuaternion.clone().invert().multiply(world).multiply(rest.worldQuaternion);
      values.push(...rest.quaternion.clone().multiply(delta).toArray());
    }
    const clip = new THREE.AnimationClip('retargeted-head-nod', 1.4, [new THREE.QuaternionKeyframeTrack(`${headBone.name}.quaternion`, [0,.45,.9,1.4], values)]);
    const targetId = avatar === 'male' ? 'female' : 'male'; setStatus('Loading avatar…');
    const target = await viewport.current.setCharacter(targetId); if (!target) return;
    setAvatar(targetId); const result = retargetAnimationClip(clip, sourceRig, target.rig); controls()?.animation.playClip(result.clip); setWarnings([...target.rig.warnings, ...result.warnings]);
  };
  return <main className="character-lab">
    <header className="character-lab-header"><a href="/" className="character-lab-brand">N<span>✦</span>IPRAS</a><div><span className="character-eyebrow">DEVELOPER PLAYGROUND</span><h1>Character lab<span className="character-version">01</span></h1></div><span className="character-local-badge">● Local animation engine</span></header>
    <div className="character-lab-layout">
      <aside className="character-controls" aria-label="Character controls">
        <section aria-label="Teaching gesture controls"><span className="character-section-index">TEACHING GESTURES</span><h2>Test one movement.</h2><div className="character-button-row">
          <button onClick={() => teachingGesture('greeting')}>Greeting salute</button>
          <button onClick={() => teachingGesture('pocket-left')}>Left hand near pocket</button>
          <button onClick={() => teachingGesture('pocket-right')}>Right hand near pocket</button>
          <button onClick={() => teachingGesture('switch')}>Switch hands</button>
          <button onClick={() => teachingGesture('explain')}>Open-palm explanation</button>
          <button onClick={() => teachingGesture('point')}>Point to lesson</button>
          <button onClick={() => teachingGesture('encourage')}>Encourage student</button>
          <button onClick={() => teachingGesture('idle')}>Return to idle</button>
        </div><p>These closed clothing meshes have no operational pocket openings. Resting hands stay outside the trousers. Welcome salutes run once; this developer control can replay them.</p></section>
        <section><span className="character-section-index">01 / CHARACTER</span><h2>One engine. Any teacher.</h2><p>Switch the asset. Keep the movement.</p><label className="character-field">Test avatar<select aria-label="Test avatar" value={avatar} onChange={event => { bridge.current?.interrupt(); setStatus('Loading avatar…'); setAvatar(event.target.value); }}><option value="male">NIPRAS teacher · male</option><option value="female">Compatibility test · female</option></select></label><label className="character-field">Animation state<select aria-label="Animation state" value={state} onChange={event => setState(event.target.value)}>{CHARACTER_STATES.map(name => <option key={name}>{name}</option>)}</select></label><div className="character-button-row"><button onClick={() => controls()?.animation.playGesture('explain')}>Explain</button><button onClick={() => controls()?.animation.playGesture('point', { side: 'left' })}>Point left</button><button onClick={() => controls()?.animation.playGesture('point', { side: 'right' })}>Point right</button></div></section>
        <section><button className="character-retarget" disabled={!capabilities.head} onClick={retargetDemo}>Retarget nod & switch avatar</button><span className="character-section-index">02 / INDEPENDENT ARMS</span>{['left', 'right'].map(side => <fieldset key={side} disabled={!capabilities[`${side}Arm`]}><legend><label><input aria-label={`Enable ${side} hand target`} type="checkbox" checked={enabled[side]} onChange={event => handToggle(side, event.target.checked)} />{side === 'left' ? 'Left' : 'Right'} hand target</label></legend>{['X', 'Y', 'Z'].map((axis, index) => <Slider key={axis} label={`${side === 'left' ? 'Left' : 'Right'} hand ${axis}`} value={hands[side][index]} min={index === 1 ? .4 : -1} max={index === 1 ? 1.85 : 1} disabled={!enabled[side]} onChange={value => handChange(side, index, value)} />)}</fieldset>)}</section>
        <section><span className="character-section-index">03 / HEAD & FACE</span><fieldset disabled={!capabilities.body}><legend>Body posture ? degrees</legend>{['lean','twist','sway'].map(axis=><Slider key={axis} label={`Body ${axis}`} value={posture[axis]} min={axis==='twist'?-15:axis==='lean'?-8:-6} max={axis==='twist'?15:axis==='lean'?8:6} step={1} onChange={value=>postureChange(axis,value)} />)}</fieldset>{['yaw', 'pitch', 'roll'].map(axis => <Slider key={axis} label={`Head ${axis}`} value={head[axis]} min={axis === 'yaw' ? -35 : axis === 'pitch' ? -20 : -10} max={axis === 'yaw' ? 35 : axis === 'pitch' ? 20 : 10} step={1} disabled={!capabilities.head} onChange={value => headChange(axis, value)} />)}<label className="character-field">Expression<select aria-label="Expression" disabled={!capabilities.expressions} value={expression} onChange={event => { setExpression(event.target.value); controls()?.face.setExpression(event.target.value); }}>{['neutral', 'happy', 'curious', 'concerned'].map(name => <option key={name}>{name}</option>)}</select></label><label className="character-toggle"><input type="checkbox" checked={trackEyes} disabled={!capabilities.gaze} onChange={event => { setTrackEyes(event.target.checked); if (!event.target.checked) controls()?.face.setLookTarget(null); }} />Eyes follow the pointer</label><label className="character-toggle"><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} />Reduce motion</label></section>
      </aside>
      <section className="character-stage-area" aria-label="Live 3D character preview">
        <div className="character-stage-top"><span><i className={status === 'Ready' ? 'is-ready' : ''} />{status}</span><span>GLB · Humanoid adapter</span></div>
        <div className="character-stage" onPointerMove={event => { if (!trackEyes) return; const rect = event.currentTarget.getBoundingClientRect(); controls()?.face.setLookTarget([((event.clientX - rect.left) / rect.width - .5) * 1.5, 1.4 - ((event.clientY - rect.top) / rect.height - .5) * .5, 1]); }}>
          <div className="character-floor" /><CharacterViewport ref={viewport} avatarId={avatar} state={state} onReady={onReady} onError={error => setStatus(error.message)} onFrame={frame} reducedMotion={reduced || undefined} />
          <div className="character-stage-caption"><span className="character-eyebrow">LIVE RIG / REAL MORPH TARGETS</span><h2>Made to explain.</h2><p>Independent hands. A little presence. A teacher that listens.</p></div>
          <button ref={pointTarget} className="character-point-card" onClick={() => viewport.current?.pointAtElement(pointTarget.current, 'right')}><span>LESSON TARGET</span><strong>f′(x) = 2x</strong><small>Click to point here ↗</small></button>
        </div>
        <div className="character-stage-footer"><span ref={telemetry}>Preparing renderer</span><span>Speech movement ≠ verified lip-sync</span></div>
        <section className="character-audio-panel"><div><span className="character-section-index">04 / ACTUAL AUDIO PLAYBACK</span><h2>Let the voice lead.</h2><p>Play an audio file to test mouth movement and interruption. No voice cloning.</p></div><label className="character-upload">Choose audio<input aria-label="Choose audio file" type="file" accept="audio/*" onChange={event => { const file = event.target.files?.[0]; if (file) { stopSpeech(); setSource(URL.createObjectURL(file)); setAudioStatus('Audio ready — press play'); } }} /></label><audio ref={audio} src={source || undefined} controls preload="metadata" onPlay={startAnalysis} aria-label="Teacher audio playback" /><button className="character-stop" onClick={stopSpeech}>Stop & reset</button><p className="character-audio-status" role="status">{audioStatus}</p><details><summary>Use a configured Fish Audio service</summary><p>Requires a signed-in NIPRAS account and a running private Fish endpoint configured on the backend.</p><textarea aria-label="Arabic teacher response" dir="auto" value={speechText} onChange={event => setSpeechText(event.target.value)} maxLength={2000} /><button disabled={busy || !auth?.token} onClick={generateSpeech}>{busy ? 'Requesting audio…' : 'Generate with Fish S2 Pro'}</button></details></section>
        <section className="character-capabilities" aria-label="Avatar capabilities">{Object.entries(capabilities).map(([name, supported]) => <span key={name} data-supported={supported}>{supported ? '✓' : '—'} {name}</span>)}{warnings.map(warning => <p key={warning}>{warning}</p>)}</section>
      </section>
    </div>
  </main>;
}
