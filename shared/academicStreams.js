export const academicStreams = [
  { value: "scientific", label: "علمي" },
  { value: "literary", label: "أدبي" },
  { value: "commercial", label: "تجاري" },
  { value: "industrial", label: "صناعي" },
  { value: "sharia", label: "شرعي" },
  { value: "hotel", label: "فندقي" }
];
export const streamLabel = (value) => academicStreams.find((stream) => stream.value === value)?.label || "المسار غير محدد";
