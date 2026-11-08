import { useEffect, useState } from "react";
import { fetchDashboardResource } from "../services/dashboardService.js";

const pending = () => ({ data: [], loading: true, error: null });
export const dashboardResources = ["plans", "materials", "chats"];
const initial = () => Object.fromEntries(dashboardResources.map((kind) => [kind, pending()]));

export function useDashboard(token) {
  const [resources, setResources] = useState(initial);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let disposed = false;
    const controllers = [];
    const timers = [];
    setResources(initial());
    for (const kind of dashboardResources) {
      const controller = new AbortController();
      controllers.push(controller);
      const timeout = setTimeout(() => controller.abort(), 15000);
      timers.push(timeout);
      fetchDashboardResource(kind, token, { signal: controller.signal }).then(
        (data) => { if (!disposed) setResources((current) => ({ ...current, [kind]: { data, loading: false, error: null } })); },
        (failure) => {
          const error = controller.signal.aborted ? new Error("استغرق تحميل البيانات وقتًا طويلًا. أعد المحاولة.") : failure;
          if (!disposed) setResources((current) => ({ ...current, [kind]: { data: [], loading: false, error } }));
        }
      ).finally(() => clearTimeout(timeout));
    }
    return () => { disposed = true; timers.forEach(clearTimeout); controllers.forEach((controller) => controller.abort()); };
  }, [token, revision]);

  const refresh = () => { setNow(new Date()); setRevision((value) => value + 1); };
  return { resources, now, refresh };
}
