import mongoose from 'mongoose';

const attempt = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, required: true },
  video: String, revision: String, questionId: String, status: String,
  answer: String, correct: Boolean, feedback: String,
  history: [{ answer: String, correct: Boolean, feedback: String, status: String, at: Date }],
}, { timestamps: true });
attempt.index({ owner: 1, video: 1, revision: 1, questionId: 1 }, { unique: true });
export const VideoAttempt = mongoose.model('VideoAttempt', attempt);
