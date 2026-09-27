// Passes contract-v1 events from the AI service to the student, one line at
// a time, and works out what to save. Knows nothing about HTTP or MongoDB,
// so every way a stream can end is testable on its own.
//
// Returns { status, content, sources, calculation, meta }:
//   complete     done, answered
//   refused      done, refused (out of scope / not in the book)
//   interrupted  the stream broke after some text - that text is kept
//   failed       an error event, or broke before any text
const INTERRUPTED = { code: "AI_INTERRUPTED", message: "انقطع الجواب قبل أن يكتمل. حاول مرة ثانية." };

// `interruption()` names why a stream stopped early (a timeout reads better
// than "interrupted"); by default it is AI_INTERRUPTED.
export async function relayTutorStream({ events, send, ids = {}, interruption = () => INTERRUPTED }) {
  const result = { status: "failed", content: "", sources: [], calculation: undefined, meta: {} };
  let text = "";
  let finished = false;

  try {
    for await (const event of events) {
      switch (event?.type) {
        case "meta":
          result.meta.model = event.model;
          send({ ...event, ...ids });
          break;
        case "sources":
          result.sources = (event.items || []).map(({ lesson, lessonTitle, document, pages, label, via }) => ({ lesson, lessonTitle, document, pages, label, via }));
          send(event);
          break;
        case "calculation":
          result.calculation = { answer: event.answer, facts: event.facts || [] };
          send(event);
          break;
        case "delta":
          text += event.text || "";
          send(event);
          break;
        case "done":
          result.status = event.refused ? "refused" : "complete";
          result.content = event.answer ?? text;
          result.meta.seconds = event.seconds;
          result.meta.warnings = event.warnings || [];
          send(event);
          finished = true;
          break;
        case "error":
          result.status = text ? "interrupted" : "failed";
          result.content = text;
          result.meta.errorCode = event.code;
          send(event);
          finished = true;
          break;
        default:
          // Unknown event types are ignored: v1 readers must tolerate
          // optional additions (docs/contracts/tutor-stream-v1.md).
          break;
      }
      if (finished) break;
    }
  } catch (error) {
    if (!finished) stopEarly();
    return { ...result, cause: error };
  }

  if (!finished) stopEarly();
  return result;

  function stopEarly() {
    const { code, message } = interruption();
    result.status = text ? "interrupted" : "failed";
    result.content = text;
    result.meta.errorCode = code;
    send({ type: "error", code, message });
  }
}
