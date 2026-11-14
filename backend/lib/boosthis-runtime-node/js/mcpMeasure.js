// @ts-nocheck
/* eslint-disable */
// Built from src/mcpMeasure.ts so plain node can run the kit. Do not edit.
import { record } from "./samples.js";
import { rateDuration } from "./thresholds.js";
import { routeLabelHasPII } from "./no-pii.js";
const MCP_METHODS = /* @__PURE__ */ new Set([
  "initialize",
  "initialized",
  "ping",
  "tools/list",
  "tools/call",
  "resources/list",
  "resources/read",
  "prompts/list",
  "prompts/get",
  "notifications/initialized",
  "notifications/cancelled"
]);
const MCP_CALL_PREFIX = "mcp.call.";
const MCP_ERROR_SUFFIX = ".error";
const MCP_MAX_TOOLS = 64;
const TOOL_NAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const registered = /* @__PURE__ */ new Set();
function validToolName(name) {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!TOOL_NAME_RE.test(trimmed)) return null;
  if (routeLabelHasPII(MCP_CALL_PREFIX + trimmed) !== null) return null;
  return trimmed;
}
function registerMcpTools(names) {
  if (!Array.isArray(names)) return;
  for (const n of names) {
    if (registered.size >= MCP_MAX_TOOLS) return;
    const ok = validToolName(n);
    if (ok) registered.add(ok);
  }
}
function _resetMcpToolsForTests() {
  registered.clear();
}
function mcpAutoLabel(msg) {
  if (Array.isArray(msg)) return msg.length > 0 ? "mcp.batch" : null;
  if (msg === null || typeof msg !== "object") return null;
  const m = msg;
  const method = typeof m["method"] === "string" ? m["method"] : "";
  if (!method) return null;
  if (!MCP_METHODS.has(method)) return "mcp.other";
  if (method !== "tools/call") return "mcp." + method.replace(/\//g, "_");
  const params = m["params"];
  const raw = typeof params?.["name"] === "string" ? params["name"] : "";
  return labelForTool(raw);
}
function labelForTool(name) {
  return registered.has(name) ? MCP_CALL_PREFIX + name : MCP_CALL_PREFIX + "other";
}
function recordMcpSample(label, durationMs, isError) {
  const name = isError ? label + MCP_ERROR_SUFFIX : label;
  const rating = isError ? "poor" : rateDuration(durationMs);
  if (routeLabelHasPII(name) === null) {
    record(name, durationMs, rating);
  }
}
function mcpTool(name, fn) {
  registerMcpTools([name]);
  return async (...args) => {
    const label = labelForTool(validToolName(name) ?? "");
    const start = performance.now();
    let failed = false;
    try {
      return await fn(...args);
    } catch (err) {
      failed = true;
      throw err;
    } finally {
      try {
        recordMcpSample(label, performance.now() - start, failed);
      } catch {
      }
    }
  };
}
function isMcpPath(path) {
  return path === "/mcp" || path.endsWith("/mcp");
}
export {
  MCP_CALL_PREFIX,
  MCP_ERROR_SUFFIX,
  MCP_MAX_TOOLS,
  _resetMcpToolsForTests,
  isMcpPath,
  labelForTool,
  mcpAutoLabel,
  mcpTool,
  recordMcpSample,
  registerMcpTools
};
