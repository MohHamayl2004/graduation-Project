import User from "../models/User.js";
import Membership from "../models/Membership.js";
import Workspace from "../models/Workspace.js";
import StudyPlan from "../models/StudyPlan.js";
import LearningAssessment from "../models/LearningAssessment.js";
import AIChat from "../models/AIChat.js";
import Analysis from "../models/Analysis.js";
import Lecture from "../models/Lecture.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Progress from "../models/Progress.js";
import Material from "../models/Material.js";
import AdminEvent from "../models/AdminEvent.js";
import { ApiError } from "../errors/ApiError.js";

export async function deleteStudent(actor, student, input, reason) {
  if (String(input.confirmEmail || "").trim().toLowerCase() !== student.email) throw new ApiError(400, "DELETE_CONFIRMATION_REQUIRED", "اكتب إيميل الطالب كاملًا لتأكيد الحذف");
  if (await Workspace.exists({ ownerId: student._id, type: "SCHOOL" })) throw new ApiError(409, "SCHOOL_OWNER", "انقل ملكية مساحة المدرسة قبل حذف هذا الحساب");
  await User.updateOne({ _id: student._id }, { $set: { status: "INACTIVE", blockReason: "جاري حذف الحساب" } });
  const personal = await Workspace.find({ ownerId: student._id, type: "PERSONAL" }).select("_id").lean();
  await Promise.all([
    Membership.deleteMany({ $or: [{ userId: student._id }, { workspaceId: { $in: personal.map((w) => w._id) } }] }),
    Workspace.deleteMany({ ownerId: student._id, type: "PERSONAL" }), Material.deleteMany({ userId: student._id }),
    ...[StudyPlan, LearningAssessment, AIChat, Analysis, Lecture, Quiz, QuizAttempt, Progress].map((model) => model.deleteMany({ owner: student._id }))
  ]);
  // Financial receipts and the admin audit are retained; study records are removed.
  await AdminEvent.create({ actor: actor._id, student: student._id, action: "delete", reason, details: { deletedEmail: student.email, fullName: student.fullName } });
  await User.deleteOne({ _id: student._id, role: { $ne: "admin" } });
  return { deleted: true, studentId: String(student._id) };
}
