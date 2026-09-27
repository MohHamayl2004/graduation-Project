// The interactive lesson as plain data: which checkpoint is due, what the
// student answered, how the lesson scored. Pure functions, so the rules in
// docs/contracts/interactive-lesson-v1.md are testable without a browser.

// A YouTube link in any of the shapes a student or teacher pastes.
export function youtubeId(input) {
  const text = String(input || "").trim();
  if (!text) return "";
  if (/^[\w-]{11}$/.test(text)) return text;
  const match = text.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return match ? match[1] : "";
}

export const initialLessonState = { answers: {}, current: null, finished: false };

// The checkpoint the player must stop at: the first one, in order, that is
// at or before the current time and has not been answered. Seeking forward
// therefore does not skip a question, and seeking back does not re-ask one.
export function dueCheckpoint(checkpoints, seconds, answers) {
  return (checkpoints || []).find((cp) => seconds >= cp.at && !answers[cp.id]) || null;
}

export function isCorrect(checkpoint, choiceId) {
  return Boolean((checkpoint.choices || []).find((c) => c.id === choiceId)?.correct);
}

export function feedbackFor(checkpoint, choiceId) {
  return (checkpoint.choices || []).find((c) => c.id === choiceId)?.feedback || "";
}

export function lessonReducer(state, action) {
  switch (action.type) {
    case "reached":
      return state.current?.id === action.checkpoint.id ? state : { ...state, current: action.checkpoint };
    case "answered": {
      const { checkpoint, choiceId, seconds } = action;
      if (state.answers[checkpoint.id]) return state;
      return {
        ...state,
        answers: {
          ...state.answers,
          [checkpoint.id]: { choiceId, correct: isCorrect(checkpoint, choiceId), atSeconds: seconds }
        }
      };
    }
    case "resumed":
      return { ...state, current: null };
    case "finished":
      return { ...state, finished: true, current: null };
    case "restarted":
      return initialLessonState;
    default:
      return state;
  }
}

// What the student is told at the end. "focus" counts first attempts that
// were right: a wrong answer here is either a lapse in attention or a gap in
// understanding, and the feedback beside each question says which.
export function summarise(checkpoints, answers) {
  const total = (checkpoints || []).length;
  const answered = (checkpoints || []).filter((cp) => answers[cp.id]);
  const correct = answered.filter((cp) => answers[cp.id].correct);
  return {
    total,
    answered: answered.length,
    correct: correct.length,
    missed: answered.filter((cp) => !answers[cp.id].correct).map((cp) => ({ checkpoint: cp, answer: answers[cp.id] })),
    focus: total ? Math.round((correct.length / total) * 100) : 0
  };
}
