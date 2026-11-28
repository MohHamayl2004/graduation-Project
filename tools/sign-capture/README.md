# Sign capture: a signer's video → the 3D character

The companion beside a lesson video (`src/pages/InteractiveLesson/LessonAvatar.jsx`)
can perform real signs: a person who knows sign language signs the sentences on
camera, this tool reads their arms, hands and face, and the character repeats
the movement in time with the lesson video. Nothing is invented: a sentence
without a recording stays a caption.

## 1. Record

- Front camera, the signer's upper body fully in frame: face, both hands, both elbows.
- Even light, plain background, nothing crossing in front of the hands.
- One take for all the sentences is fine; note where each sentence starts and ends.

The sentences and their times in the video are in
`src/data/interactive/1-1-stickman.captions.json`.

## 2. Set up (once)

```
python -m pip install mediapipe opencv-python
curl -L -o tools/sign-capture/models/holistic_landmarker.task https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task
```

## 3. Extract one clip per sentence

```
python -I tools/sign-capture/extract.py signer.mp4 public/signs/s01.json --start 0.0 --end 3.4 --source "اسم المترجم"
python -I tools/sign-capture/extract.py signer.mp4 public/signs/s02.json --start 3.4 --end 6.1 --source "اسم المترجم"
```

It prints how many frames had no hands; if many, re-record with the hands in view.

## 4. Place the clips on the video's timeline

`src/data/signs/1-1-stickman.track.json`:

```json
{ "segments": [
  { "start": 0.23, "end": 2.82, "clip": "s01", "gloss": "هاد سامي…" },
  { "start": 2.87, "end": 4.57, "clip": "s02", "gloss": "غريب…" }
] }
```

`start`/`end` are the sentence's times in the lesson video. A clip longer or
shorter than its sentence is stretched to fit, so it starts and ends with it,
follows the playback speed, holds on pause and lands on the right frame after a seek.
