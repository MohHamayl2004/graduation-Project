// @ts-nocheck
/* eslint-disable */
// Built from src/sourceNotice.ts so plain node can run the kit. Do not edit.
import { readFileSync, readdirSync } from "node:fs";
import { sayAfterStartupLine } from "./startAnnounce.js";
let checked = false;
let cgroupProbeForTests = null;
let procfsProbeForTests = null;
function cgroupMissingCause() {
  if (cgroupProbeForTests) {
    try {
      return cgroupProbeForTests();
    } catch {
      return "the cgroup probe failed";
    }
  }
  const groups = [
    ["memory", [
      ["/sys/fs/cgroup/memory.current", "/sys/fs/cgroup/memory.max"],
      ["/sys/fs/cgroup/memory/memory.usage_in_bytes", "/sys/fs/cgroup/memory/memory.limit_in_bytes"]
    ]],
    ["CPU", [
      ["/sys/fs/cgroup/cpu.max", "/sys/fs/cgroup/cpu.stat"],
      ["/sys/fs/cgroup/cpu/cpu.cfs_quota_us", "/sys/fs/cgroup/cpu/cpu.stat"]
    ]]
  ];
  const missing = [];
  for (const [name, pairs] of groups) {
    let readable = false;
    for (const pair of pairs) {
      try {
        readFileSync(pair[0], "utf8");
        readFileSync(pair[1], "utf8");
        readable = true;
        break;
      } catch {
      }
    }
    if (!readable) missing.push(name);
  }
  if (!missing.length) return null;
  return `no readable cgroup ${missing.join(" or ")} controller is visible`;
}
function procfsMissingCause() {
  if (procfsProbeForTests) {
    try {
      return procfsProbeForTests();
    } catch {
      return "the procfs probe failed";
    }
  }
  try {
    readdirSync("/proc/self/fd");
    readFileSync("/proc/self/limits", "utf8");
    return null;
  } catch {
    return "/proc/self/fd or /proc/self/limits is unreadable";
  }
}
function unreadableSourcesLine(cgroupCause, procfsCause) {
  const parts = [];
  if (cgroupCause) {
    parts.push(
      `container memory pressure and CPU throttling (${cgroupCause}): container limits and throttling come from Linux cgroup controllers`
    );
  }
  if (procfsCause) {
    parts.push(
      `descriptor headroom (${procfsCause}): open descriptors and their limit come from Linux procfs`
    );
  }
  if (!parts.length) return null;
  const tail = `. ${parts.length === 1 ? "That one meter stays" : "Those meters stay"} absent for the life of this process; nothing else about Boosthis is affected.`;
  return parts.length === 1 ? `[boosthis] This Node runtime cannot report ${parts[0]}${tail}` : `[boosthis] This Node runtime cannot report ${parts.length} of Boosthis's readings — ${parts.join("; ")}${tail}`;
}
function announceUnreadableSources() {
  if (checked) return;
  checked = true;
  try {
    const line = unreadableSourcesLine(cgroupMissingCause(), procfsMissingCause());
    if (line) {
      try {
        sayAfterStartupLine(line);
      } catch {
      }
    }
  } catch {
  }
}
function _setSourceNoticeProbesForTests(cgroup, procfs) {
  cgroupProbeForTests = cgroup;
  procfsProbeForTests = procfs;
}
function _resetSourceNoticeForTests() {
  checked = false;
  cgroupProbeForTests = null;
  procfsProbeForTests = null;
}
export {
  _resetSourceNoticeForTests,
  _setSourceNoticeProbesForTests,
  announceUnreadableSources,
  cgroupMissingCause,
  procfsMissingCause,
  unreadableSourcesLine
};
