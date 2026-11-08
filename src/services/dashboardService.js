import { listStudyPlans } from "./studyPlanService.js";
import { getMaterials } from "./materialService.js";
import { listChats } from "./tutorService.js";

const sources = { plans: listStudyPlans, materials: getMaterials, chats: listChats };

export async function fetchDashboardResource(kind, token, { signal } = {}) {
  if (!Object.hasOwn(sources, kind)) throw new Error("Unknown dashboard resource");
  const response = await sources[kind](token, { signal });
  const list = response?.[kind];
  if (!Array.isArray(list) || !list.every((item) => item && typeof (kind === "chats" ? item.id : item._id) === "string" && typeof item.title === "string")) {
    throw new Error("تعذّر قراءة البيانات المحفوظة. أعد المحاولة.");
  }
  return list;
}
