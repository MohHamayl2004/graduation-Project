# Unit 1 animated lesson production

The original mathematics PDF cover identifies Grade 12, scientific and industrial streams. PDF page 6 identifies Unit 1 as حساب التفاضل. PDF pages 8, 13 and 23 establish the first three lesson titles and sequence. PDF page numbers differ from printed page numbers by four.

The three videos are focused introductions using verified examples from these lessons. They cover average rate of change, constant/linear derivatives, and the sine/cosine rules with the product-rule example. They do not cover every exercise in each lesson.

## Workflow comparison

- Remotion offers React compositions and font management. It would introduce a new renderer dependency. https://www.remotion.dev/docs/fonts
- Motion Canvas provides canvas scenes and an FFmpeg exporter. It would require new scene/runtime setup. https://motioncanvas.io/docs/rendering/video/
- Manim supports mathematical scenes but requires an additional Python rendering and text stack. Arabic shaping must be verified separately.
- Hyperframes and the existing NIPRAS generator use HTML and browser frame capture with FFmpeg. The existing generator covers only lesson 1-1. https://hyperframes.app/docs/3-guides/4-rendering
- No usable stickman director installation or validated project workflow was identified during this work.


## Reproduction and retained material

- Scripts, objectives, source metadata, formulas and assessment questions are in `scripts/video/unit1Lessons.mjs`.
- Animation source is `scripts/video/unit1Stage.html`.
- Renderer is `scripts/video/renderUnit1.mjs`. Supply FFMPEG_PATH and FFPROBE_PATH pointing to installed tools.
- Rendered MP4 and WebVTT files are under `public/videos`.
- Each `public/videos/sources/unit1-lessonN` folder retains narrated audio clips, a timed storyboard and a standalone HTML animation.
- Backend plans are in `backend/data/video-assessments`. Answer keys remain on the backend.

Narration is cached by text hash and reused on repeat renders. A caption spans a scene's spoken narration. Assessment timestamps fall after narration with a short pause. Questions and answer keys were reviewed against the source content. The checkpoint record explicitly identifies authored selection unless a recorded model selection has been completed.

## RAG dependency

The vector index and matching metadata remain unavailable. Scripts were authored from the original PDF and existing curriculum extraction. No semantic retrieval claim is made for this workflow.
