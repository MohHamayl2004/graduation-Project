# Teaching gesture ownership and pose contract

Codex owns AnimationController state/scheduling/integration, hand articulation and developer controls/tests. Gemini authors `TeachingPoses.js` as a code artifact returned by the CLI, which Codex reviews and applies. This small pure module does not need CLI terminal/file-edit permissions. No overlapping file edits, new dependencies or asset changes.

Gemini's module exports:

- `greetingEnvelope(seconds)`: 0 at/before 0; smooth rise to 1 over 0.8 seconds; hold 1 for 1.25 seconds (0.8..2.05); smooth return to 0 over .85 seconds (ends at 2.9). Never loops.
- `gestureTarget(pose, side, landmarks, seconds=0, reducedMotion=false)`: return a NEW numeric array `[x,y,z]` in the anatomical body frame; return null for invalid side/pose/landmarks. Landmarks are `{shoulder:[x,y,z], head:[x,y,z], hips:[x,y,z], armLength, halfWidth}`. Axes: +X anatomical left, +Y up, +Z forward. Inputs must not be mutated. Pose names: salute (right only), pocket, explain, point, encourage. No THREE import.

Use proportions, not model-specific bone names. Salute wrist near the right temple, slightly below the fingertips' intended forehead contact: approximately `[head.x-halfWidth*.65,head.y+armLength*.08,head.z+halfWidth*.7]`. Fingers are articulated separately by Codex. Both current teacher GLBs have finger bones but no operational pocket opening: pocket must stay outside trousers at the side/front hip, e.g. `[sideSign*halfWidth*1.2,hips.y+armLength*.05,hips.z+halfWidth*.95]`. Explanation/point/encouragement targets are comfortably reachable in front of the shoulder, using restrained slow bilateral variation when reducedMotion is false. Main controller and analytic IK perform continuous body/garment collision safety, joint limits and smoothing.

Codex states remain compatible with existing lowercase idle/listening/thinking/speaking/explaining/celebrating callers. Add greeting, talking_left_hand, talking_right_hand, switching_hands, pointing and encouraging as additive states/gesture metadata. Greeting is explicitly triggered once per welcome session and held for the stated interval; never auto-looped. Pocket switching goes through both hands neutral before swapping, with long variable dwell intervals. Only the selected free arm receives automatic teaching gestures; explicit external IK has priority. Actual media pause/end/interruption already cancels gestures.

Verification: real assets, front/side screenshot sequences, target safety, bounded joint/finger movement, stationary roots, transition continuity, speech interruption, existing mouth/white silhouette and mobile layout. A visually poor/unverified pose must remain marked limited instead of complete.
