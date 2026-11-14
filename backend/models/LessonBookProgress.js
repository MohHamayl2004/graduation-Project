import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({ activityId: { type: String, required: true }, answer: { type: String, required: true }, correct: { type: Boolean, required: true }, at: { type: Date, default: Date.now } }, { _id: false });
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lessonId: { type: String, required: true },
  lastPage: { type: Number, default: 1 },
  bookLeaf: { type: String },
  completedActivities: { type: [String], default: [] },
  attempts: { type: [attemptSchema], default: [] },
}, { timestamps: true });
schema.index({ owner: 1, lessonId: 1 }, { unique: true });
export default mongoose.model('LessonBookProgress', schema);
