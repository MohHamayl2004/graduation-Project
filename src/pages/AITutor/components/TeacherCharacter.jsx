import { useState } from 'react';
import CharacterViewport from '../../../character-engine/CharacterViewport.jsx';
import { mascotConfig } from '../../../config/mascotConfig';
import { teacherState } from '../teacherAnimation';

// Preserve student-facing markup and framing; the engine owns 3D behavior.
export default function TeacherCharacter({ speechPlayback, idleOnly = false, animationState, viewportRef, onReady, onFrame }) {
  const [failed, setFailed] = useState(false), [loaded, setLoaded] = useState(false);
  // With a speech bridge, it owns controller state; React playback renders
  // must not overwrite its contextual gesture with generic speaking.
  const canvas = <CharacterViewport ref={viewportRef} avatarId="male" framing="portrait" state={onFrame ? 'idle' : animationState || teacherState(speechPlayback)} className={idleOnly ? 'sidebar-teacher-canvas' : 'tutor-teacher-canvas'} onReady={engine => { setLoaded(true); setFailed(false); onReady?.(engine); }} onError={() => setFailed(true)} onFrame={onFrame} />;
  if (idleOnly) return <span className="sidebar-teacher" aria-hidden="true">
    {(!loaded || failed) && <img src={mascotConfig.image} alt="" />}
    {canvas}
  </span>;
  return <span className="tutor-teacher" data-state={animationState || teacherState(speechPlayback)} aria-hidden="true">
    <span className="tutor-teacher-visual">
      {(!loaded || failed) && <img src={mascotConfig.image} alt="" />}
      {canvas}
    </span>
  </span>;
}
