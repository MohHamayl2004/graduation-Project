import { protect } from "./authMiddleware.js";
import { effectiveSubscription } from "../../shared/subscriptions.js";
import { ApiError } from "../errors/ApiError.js";
export const subscriptionAccess = (req, _res, next) => {
  if (!effectiveSubscription(req.user).canAccess) return next(new ApiError(403, "SUBSCRIPTION_EXPIRED", "انتهى اشتراكك أو تم تعطيله. افتح صفحة اشتراكي للتجديد."));
  next();
};
export const requireAdmin = (req, _res, next) => {
  if (req.auth?.role !== "admin" || req.user?.role !== "admin") return next(new ApiError(403, "ADMIN_REQUIRED", "هذه الصفحة مخصصة لإدارة نبراس"));
  next();
};
export const featureAccess = [protect, subscriptionAccess];
