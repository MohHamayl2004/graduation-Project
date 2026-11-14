// @ts-nocheck
/* eslint-disable */
// Built from src/failurePart.ts so plain node can run the kit. Do not edit.
import { currentRequestScope } from "./repeatedWork.js";
import { routeLabel } from "./routeInventory.js";
const FAILURE_PART_UNKNOWN = {
  /** Nothing was open: start-up, a background timer, a worker between jobs. */
  noPartOpen: "no-part-open",
  /** No route state was readable at this moment — this host never gives the
   *  kit one, or the framework had not named a route yet. */
  notTracked: "part-not-tracked",
  /** A part was known and the one part-name rule refused its name. */
  refused: "part-refused"
};
function templateOf(req) {
  const path = req.route?.path;
  if (typeof path !== "string" || path.length === 0) return null;
  const base = typeof req.baseUrl === "string" ? req.baseUrl : "";
  const joined = `${base}${path}`;
  return joined.startsWith("/") ? joined : `/${joined}`;
}
function currentFailurePart() {
  try {
    const scope = currentRequestScope();
    const req = scope?.trace;
    if (!scope || !req) {
      return { partUnknown: FAILURE_PART_UNKNOWN.noPartOpen };
    }
    const template = templateOf(req);
    if (template === null) {
      return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
    }
    const method = typeof req.method === "string" ? req.method : "GET";
    const label = routeLabel(method, template);
    if (label === null) return { partUnknown: FAILURE_PART_UNKNOWN.refused };
    return { routeLabel: label };
  } catch {
    return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
  }
}
function failurePartOfRequest(req) {
  try {
    if (!req || typeof req !== "object") {
      return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
    }
    const template = templateOf(req);
    if (template === null) return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
    const m = req.method;
    const label = routeLabel(typeof m === "string" ? m : "GET", template);
    if (label === null) return { partUnknown: FAILURE_PART_UNKNOWN.refused };
    return { routeLabel: label };
  } catch {
    return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
  }
}
function failurePartOf(method, template) {
  try {
    if (typeof template !== "string" || template.length === 0) {
      return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
    }
    const label = routeLabel(
      typeof method === "string" && method.length > 0 ? method : "GET",
      template.startsWith("/") ? template : `/${template}`
    );
    if (label === null) return { partUnknown: FAILURE_PART_UNKNOWN.refused };
    return { routeLabel: label };
  } catch {
    return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
  }
}
function findingPart(name) {
  try {
    if (typeof name !== "string" || name.length === 0) {
      return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
    }
    const space = name.indexOf(" ");
    if (space <= 0) return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
    const label = routeLabel(name.slice(0, space), name.slice(space + 1));
    if (label !== name) return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
    return { routeLabel: label };
  } catch {
    return { partUnknown: FAILURE_PART_UNKNOWN.notTracked };
  }
}
export {
  FAILURE_PART_UNKNOWN,
  currentFailurePart,
  failurePartOf,
  failurePartOfRequest,
  findingPart
};
