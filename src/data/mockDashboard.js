import { Clock3, CirclePlay, Star, Flame } from "lucide-react";

export const dashboardStats = [
  { title: "Daily Goal", value: "1h 45m", note: "60% complete", icon: Clock3, accent: "#1656cb", bar: 60 },
  { title: "Lectures", value: "14 / 20", note: "6 more to reach weekly goal", icon: CirclePlay, accent: "#168056" },
  { title: "Avg. Score", value: "78%", note: "6% trend this week", icon: Star, accent: "#6b42ef" },
  { title: "Streak", value: "9 Days", note: "Personal record: 12 days", icon: Flame, accent: "#f37021" }
];
