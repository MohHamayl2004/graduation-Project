import { Clock3, CirclePlay, Star, Flame } from "lucide-react";

export const dashboardStats = [
  { title: "هدف اليوم", value: "1 س 45 د", note: "مكتمل 60%", icon: Clock3, accent: "#152A63", bar: 60 },
  { title: "الدروس", value: "14 / 20", note: "باقي 6 لهدف الأسبوع", icon: CirclePlay, accent: "#1E7A3C" },
  { title: "متوسط العلامات", value: "78%", note: "تحسّن 6% هذا الأسبوع", icon: Star, accent: "#1E7A3C" },
  { title: "الالتزام", value: "9 أيام", note: "رقمك القياسي: 12 يومًا", icon: Flame, accent: "#B45309" }
];
