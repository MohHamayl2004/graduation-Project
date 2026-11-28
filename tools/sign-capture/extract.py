"""Turn a video of a person signing into motion for the 3D character.

    python -I tools/sign-capture/extract.py signer.mp4 public/signs/s01.json
    python -I tools/sign-capture/extract.py signer.mp4 public/signs/s02.json --start 3.2 --end 6.8

Uses Google MediaPipe's holistic landmarker (tools/sign-capture/models/holistic_landmarker.task)
to read, for every frame: the shoulders, elbows and wrists in metres, the 21 points
of each hand, and a few face expressions. The character's arms and fingers are later
pointed along the same directions (src/character-engine/SignMotion.js), so the
signer's real movement is what the character performs - nothing is invented.

Coordinates are converted to the character's space: x to the viewer's right,
y up, z toward the viewer. "left"/"right" are the signer's own hands.
"""
import argparse
import json
import os
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "models", "holistic_landmarker.task")
# Pose points the character needs: nose, ears, shoulders, elbows, wrists, hips.
POSE_POINTS = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24]
FACE = ["jawOpen", "mouthSmileLeft", "mouthSmileRight", "browInnerUp", "browDownLeft", "browDownRight", "eyeSquintLeft", "eyeSquintRight", "mouthPucker"]


def to_character(p):
    # MediaPipe: x right in the image, y down, z negative toward the camera.
    return [round(p.x, 4), round(-p.y, 4), round(-p.z, 4)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--start", type=float, default=0.0, help="seconds into the video")
    ap.add_argument("--end", type=float, default=None)
    ap.add_argument("--fps", type=float, default=25.0, help="frames kept per second")
    ap.add_argument("--source", default="", help="who signed it, for the record")
    args = ap.parse_args()

    if not os.path.exists(MODEL):
        sys.exit(f"Missing model: {MODEL}")
    options = vision.HolisticLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL),
        running_mode=vision.RunningMode.VIDEO,
        output_face_blendshapes=True,
        min_pose_detection_confidence=0.5,
        min_hand_landmarks_confidence=0.5,
    )
    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        sys.exit(f"Cannot open {args.video}")
    native = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames, step, next_keep, missing_hands = [], 1.0 / args.fps, args.start, 0
    with vision.HolisticLandmarker.create_from_options(options) as landmarker:
        cap.set(cv2.CAP_PROP_POS_MSEC, args.start * 1000)
        while True:
            ok, image = cap.read()
            if not ok:
                break
            t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
            if args.end is not None and t > args.end:
                break
            if t + 1e-6 < next_keep:
                continue
            next_keep += step
            rgb = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            result = landmarker.detect_for_video(rgb, int(t * 1000))
            if not result.pose_world_landmarks:
                continue
            pose = result.pose_world_landmarks
            frame = {
                "t": round(t - args.start, 3),
                "pose": {str(i): to_character(pose[i]) for i in POSE_POINTS},
                "left": [to_character(p) for p in result.left_hand_world_landmarks] or None,
                "right": [to_character(p) for p in result.right_hand_world_landmarks] or None,
            }
            if result.face_blendshapes:
                frame["face"] = {c.category_name: round(c.score, 3) for c in result.face_blendshapes if c.category_name in FACE}
            if not frame["left"] and not frame["right"]:
                missing_hands += 1
            frames.append(frame)
    cap.release()
    if not frames:
        sys.exit("No person found in the video.")
    out = {"version": 1, "fps": args.fps, "duration": frames[-1]["t"], "source": args.source,
           "video": os.path.basename(args.video), "from": args.start, "frames": frames}
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(frames)} frames, {out['duration']:.2f} s, native {native:.0f} fps, frames without hands: {missing_hands} -> {args.out}")


if __name__ == "__main__":
    main()
