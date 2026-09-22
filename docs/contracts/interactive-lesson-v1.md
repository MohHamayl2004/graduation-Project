# Interactive lesson contract — v1

One shape for a lesson the student *does*, not only watches. The source can be a video (embedded from its own platform) or NIPRAS slides; the checkpoints, the answers and the progress are the same either way, so a lesson can change source without changing anything else.

## Shape

```json
{
  "version": 1,
  "code": "1-2",
  "title": "قواعد الاشتقاق",
  "source": { "kind": "youtube", "videoId": "XXXXXXXXXXX", "channel": "اسم المعلّم", "url": "https://www.youtube.com/watch?v=..." },
  "checkpoints": [
    {
      "id": "cp1",
      "at": 260,
      "question": "شو مشتقة ق(س) = (س^٢ + ١)(٣س − ٢)؟",
      "kind": "choice",
      "choices": [
        { "id": "a", "text": "٩س^٢ − ٤س + ٣", "correct": true,  "feedback": "بالضبط: ك′ م + ك م′." },
        { "id": "b", "text": "٦س", "feedback": "هاي مشتقة كل قوس لحاله مضروبين — قاعدة الضرب مش هيك." }
      ],
      "source": { "lesson": "1-2", "pages": [17] }
    }
  ]
}
```

- `at` is a second on the video's own timeline (or a slide index when `kind` is `"slides"`). The player pauses **once** at each checkpoint, in order, and resumes when the student answers.
- `kind` is `choice` (one correct option) or `input` (the student types; the answer is checked by the calculator, so any equivalent form is accepted).
- `feedback` is written per option: a wrong option names the mistake ("نسيت تشتق الداخل"), it does not just say "خطأ".
- `source` lets every checkpoint point back at the book page it came from.

## Rights

A `youtube` source is **embedded through YouTube's own player**, never downloaded or re-hosted, and the channel is credited with a link. A video whose owner disabled embedding cannot be used. Permission from the teacher is what makes a video part of the product; without it, the lesson falls back to NIPRAS slides.

## Rules a player must follow

1. Never pause twice at the same checkpoint, and never for one the student already answered.
2. Seeking backwards replays the video but does not re-ask; seeking past a checkpoint does not skip it — the next pause is the first unanswered checkpoint at or before the current time.
3. The student can always ask the tutor about the current checkpoint; the lesson stays paused.
4. Progress is `{ checkpointId, answerId | text, correct, atSeconds }` — enough to show what the student missed, and to tell a focus problem from a misunderstanding.
