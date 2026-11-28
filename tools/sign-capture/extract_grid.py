"""Turn a grid of sign pictures (one sign per panel) into one-pose clips.

    python -I tools/sign-capture/extract_grid.py tools/sign-capture/sources/ai-grid-1-1-first-20s.webp \
        --cols 6 --rows 4 --label-height 0.16 --ids this,seen,alif,meem,yaa,trip,road,mountain,strange,before,ask,teacher,question,one,rate,change,height,laugh,say,easy,straight,how,answer,down \
        --out public/signs --source "..."

Each panel is read with MediaPipe's holistic landmarker (IMAGE mode), like a single
video frame, and saved as public/signs/<id>.json with one frame. A picture shows one
moment of a sign, so the character holds that pose for the word; signs whose meaning
is in the movement are only approximated. Panels where no person or no hand is
found are reported and skipped.
"""
import argparse
import json
import os
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # run with -I: find extract.py next to this file
from extract import FACE, MODEL, POSE_POINTS, to_character  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--cols", type=int, required=True)
    ap.add_argument("--rows", type=int, required=True)
    ap.add_argument("--ids", required=True, help="comma-separated clip ids, panel order left to right, top to bottom")
    ap.add_argument("--label-height", type=float, default=0.0, help="share of each panel taken by its caption strip at the bottom")
    ap.add_argument("--out", default="public/signs")
    ap.add_argument("--source", default="")
    ap.add_argument("--scale", type=float, default=3.0, help="upscale small panels before detection")
    args = ap.parse_args()

    ids = [s.strip() for s in args.ids.split(",")]
    image = cv2.imread(args.image)
    if image is None:
        sys.exit(f"Cannot read {args.image}")
    h, w = image.shape[:2]
    cw, ch = w / args.cols, h / args.rows
    options = vision.HolisticLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL),
        running_mode=vision.RunningMode.IMAGE,
        output_face_blendshapes=True,
        min_pose_detection_confidence=0.3,
        min_hand_landmarks_confidence=0.3,
    )
    os.makedirs(args.out, exist_ok=True)
    report = []
    with vision.HolisticLandmarker.create_from_options(options) as landmarker:
        for n, clip_id in enumerate(ids):
            r, c = divmod(n, args.cols)
            x0, y0 = int(c * cw) + 2, int(r * ch) + 2
            x1, y1 = int((c + 1) * cw) - 2, int((r + 1) * ch - ch * args.label_height)
            panel = image[y0:y1, x0:x1]
            # A white border gives the detector room around a tightly cropped person.
            pad = int(max(panel.shape[:2]) * 0.25)
            panel = cv2.copyMakeBorder(panel, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(255, 255, 255))
            panel = cv2.resize(panel, None, fx=args.scale, fy=args.scale, interpolation=cv2.INTER_CUBIC)
            result = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(panel, cv2.COLOR_BGR2RGB)))
            if not result.pose_world_landmarks:
                report.append((n + 1, clip_id, "no person"))
                continue
            pose = result.pose_world_landmarks
            frame = {
                "t": 0,
                "pose": {str(i): to_character(pose[i]) for i in POSE_POINTS},
                "left": [to_character(p) for p in result.left_hand_world_landmarks] or None,
                "right": [to_character(p) for p in result.right_hand_world_landmarks] or None,
            }
            if result.face_blendshapes:
                frame["face"] = {b.category_name: round(b.score, 3) for b in result.face_blendshapes if b.category_name in FACE}
            hands = ("R" if frame["right"] else "") + ("L" if frame["left"] else "")
            clip = {"version": 1, "fps": 1, "duration": 0, "source": args.source, "video": os.path.basename(args.image),
                    "panel": n + 1, "still": True, "frames": [frame]}
            with open(os.path.join(args.out, f"{clip_id}.json"), "w", encoding="utf-8") as f:
                json.dump(clip, f, ensure_ascii=False, separators=(",", ":"))
            report.append((n + 1, clip_id, f"ok, hands: {hands or 'none'}"))
    for n, clip_id, status in report:
        print(f"{n:2d} {clip_id:10s} {status}")


if __name__ == "__main__":
    main()
