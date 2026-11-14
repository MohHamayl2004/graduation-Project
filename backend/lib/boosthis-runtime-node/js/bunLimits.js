// @ts-nocheck
/* eslint-disable */
// Built from src/bunLimits.ts so plain node can run the kit. Do not edit.
const BUN_UNMEASURABLE = [
  {
    axis: "gcPressure",
    title: "Garbage-collection pressure",
    why: "Bun accepts a garbage-collection observer without complaint and then never delivers a single entry to it, so there is nothing to measure collections from.",
    probe: "gcObserverFires"
  },
  {
    axis: "gcPauseTail",
    title: "Worst garbage-collection pause",
    why: "Pause lengths come from the same collection events Bun never delivers.",
    probe: "gcObserverFires"
  },
  {
    axis: "gcGenerationBalance",
    title: "Garbage-collection mix",
    why: "Telling a short collection from a full one needs the collection events Bun never delivers.",
    probe: "gcObserverFires"
  },
  {
    axis: "gcTrend",
    title: "Garbage-collection trend",
    why: "A trend needs a run of collection events over time, and Bun delivers none.",
    probe: "gcObserverFires"
  },
  {
    axis: "gcTax",
    title: "Collector tax per request",
    why: "The share of a request's time that went to the collector is collection time divided by the time the request took, and the collection time half comes from the same collection events Bun never delivers. The request timings are unaffected.",
    probe: "gcObserverFires"
  },
  {
    axis: "memoryPerRequest",
    title: "Memory per Request",
    why: "Memory a request leaves behind is what is still alive after a collection, set beside the requests served. The memory read at the end of a request is not it: that still holds everything the request allocated and the next collection frees. Telling when a collection has just happened needs the collection events Bun never delivers.",
    probe: "gcObserverFires"
  },
  {
    axis: "heapSpacePressure",
    title: "Memory pressure by area",
    why: "The call that breaks the heap into its separate areas is not implemented on Bun — it raises an error instead of returning figures. Overall memory readings are unaffected.",
    probe: "v8HeapSpaceStatistics"
  },
  {
    axis: "heapFragmentation",
    title: "Stranded heap",
    why: "Heap that is stuck — committed, holding nothing, and not on a free list — can only be told apart from ordinary spare room by the per-area breakdown Bun does not implement. The whole-heap totals Bun does report cannot distinguish the two, and guessing from them is the arithmetic that used to rate a leaking process healthier than a clean one.",
    probe: "v8HeapSpaceStatistics"
  },
  // codeCachePressure USED to be listed here as a Bun limit. It is not one any
  // more, because the kit no longer takes that reading on ANY engine: it asks
  // how full the compiled-code cache is as a share of its capacity, and V8
  // publishes no such capacity on Node either. Saying "Bun cannot" would
  // subtract a reading the kit does not offer on the engine Bun is being
  // compared against, which reads as a Bun shortcoming that does not exist.
  {
    axis: "network",
    title: "Outbound call health",
    why: "Node's own `fetch` announces every outbound call on a channel this kit listens to, and that announcement is the kit's only outbound observation point. Bun's `fetch` announces nothing, so outbound calls pass by unseen.",
    probe: "undiciDiagnostics"
  },
  {
    axis: "connectionSetup",
    title: "Connection reuse",
    why: "Counting fresh connections against reused ones needs the same outbound announcements Bun's `fetch` does not make.",
    probe: "undiciDiagnostics"
  },
  {
    axis: "startupImport",
    title: "Startup loading time",
    why: "Bun reports the moment startup finished as a wall-clock time rather than as time since the process began, so it cannot be subtracted to get how long loading took. The kit refuses the impossible answer that subtraction produces rather than publishing it.",
    probe: "nodeTimingSameClock"
  },
  {
    axis: "blockingAsync",
    title: "Blocked event loop",
    why: "This reading is how OFTEN the loop was blocked, so it needs to know how long the loop was watched. On Node that comes out of the event-loop histogram itself, whose every sample is one whole interval between ticks. Bun fills the same field with the delay alone and does not report the interval it was added to, nor keep to the one it was asked for: the same watcher ticked every 21ms, 41ms and 58ms in three runs on this machine while the delay it reported moved separately, so the samples add up to anywhere between 3 and 52 per cent of the time that really passed. A rate divided by that is wrong by as much as thirty times, and wrong in the alarming direction. The kit publishes no rate here on Bun rather than an invented one. The worst block itself needs no window and still arrives.",
    probe: "eventLoopWatchTimeReadable"
  },
  {
    axis: "eventLoopUtilization",
    title: "Event Loop Utilization",
    why: "This reading is the share of time the event loop spent busy rather than idle. Bun provides the call that reports it, but the call answers zero busy time and zero idle time however long the loop has run, so there is nothing to divide. The kit publishes no share here on Bun rather than a 0 per cent that would rate any load as healthy. The event-loop delay readings are unaffected.",
    probe: "eventLoopUtilizationAdvances"
  }
];
const BUN_UNMEASURABLE_AXES = BUN_UNMEASURABLE.map(
  (l) => l.axis
).sort();
const BUN_UNAFFECTED_NOTE = "Everything else works on Bun exactly as it does on Node: request timings and ratings, the event-loop delay and CPU readings, overall memory, the in-app panel, the performance checklist, crash reporting, snapshot uploads and the privacy guard. Nothing needs configuring differently, and no reading is silently degraded — a reading is either taken properly or listed above as one Bun cannot give us.";
export {
  BUN_UNAFFECTED_NOTE,
  BUN_UNMEASURABLE,
  BUN_UNMEASURABLE_AXES
};
