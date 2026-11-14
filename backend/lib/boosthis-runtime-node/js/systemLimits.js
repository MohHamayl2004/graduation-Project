// @ts-nocheck
/* eslint-disable */
// Built from src/systemLimits.ts so plain node can run the kit. Do not edit.
import { REASON_PLATFORM_DOES_NOT_EXPOSE } from "./axisReasons.js";
import { hostPlatform } from "./storage.js";
const SYSTEM_LACKS = {
  win32: {
    "proc-files": "Windows has no /proc process files",
    "cgroup-files": "Windows has no Linux control groups",
    // Node documents loadavg() as returning [0, 0, 0] here: a constant, not a
    // measurement of an idle machine.
    "load-average": "Windows keeps no load average"
  },
  darwin: {
    "proc-files": "macOS has no /proc process files",
    "cgroup-files": "macOS has no Linux control groups"
  }
};
const SYSTEM_LIMITED_READINGS = {
  // The load average is what the operating system tells every process about
  // the machine it runs on, which is why the contract lists the reading under
  // the process boundary. Taken from os.loadavg().
  systemLoad: {
    source: "load-average",
    boundary: "own-process",
    clause: "so there is no machine load to report"
  },
  // Taken from /proc/self/io.
  ioPressure: {
    source: "proc-files",
    boundary: "proc-filesystem",
    clause: "so there are no disk byte counters for this process"
  },
  // Taken from /proc/self/stat. Windows has a page-fault count of its own,
  // and it includes soft faults (a page that was already in memory). Feeding
  // it here would publish a different quantity under the major-fault name.
  pageFaults: {
    source: "proc-files",
    boundary: "proc-filesystem",
    clause: "so there is no major page-fault count for this process"
  },
  // Taken from /proc/self/fd.
  descriptorMix: {
    source: "proc-files",
    boundary: "proc-filesystem",
    clause: "so there is no list of this process's open descriptors"
  },
  // Taken from /proc/self/fd and /proc/self/limits.
  fdSaturation: {
    source: "proc-files",
    boundary: "proc-filesystem",
    clause: "so open descriptors cannot be set against their limit"
  },
  // Taken from /proc/self/status.
  contextSwitching: {
    source: "proc-files",
    boundary: "proc-filesystem",
    clause: "so there are no context-switch counts for this process"
  },
  // Taken from /sys/fs/cgroup (cpu.max, or the version-1 quota files).
  cpuEntitlement: {
    source: "cgroup-files",
    boundary: "proc-filesystem",
    clause: "so there is no CPU quota to read"
  },
  // Taken from /sys/fs/cgroup (memory.max and memory.current).
  containerPressure: {
    source: "cgroup-files",
    boundary: "container-limits",
    clause: "so there is no container memory limit to read"
  },
  // Taken from /sys/fs/cgroup (cpu.max and cpu.stat).
  cpuThrottling: {
    source: "cgroup-files",
    boundary: "container-limits",
    clause: "so there are no CPU throttling counters to read"
  }
};
import { hostPlatform as hostPlatform2, _setHostPlatformForTests } from "./storage.js";
function limitedSystem() {
  const p = hostPlatform();
  return p === "win32" || p === "darwin" ? p : null;
}
function systemLacksSourceOf(axis) {
  const system = limitedSystem();
  if (system === null) return null;
  const reading = SYSTEM_LIMITED_READINGS[axis];
  const lacks = SYSTEM_LACKS[system][reading.source];
  return lacks === void 0 ? null : `${lacks}, ${reading.clause}`;
}
function systemUnavailableReading(axis, extra = {}) {
  const why = systemLacksSourceOf(axis);
  if (why === null) return null;
  return {
    ...extra,
    score: null,
    rating: "not-available",
    measurable: 0,
    reasonCode: REASON_PLATFORM_DOES_NOT_EXPOSE,
    caption: `not available here — ${why}`
  };
}
export {
  SYSTEM_LACKS,
  SYSTEM_LIMITED_READINGS,
  _setHostPlatformForTests,
  hostPlatform2 as hostPlatform,
  systemLacksSourceOf,
  systemUnavailableReading
};
