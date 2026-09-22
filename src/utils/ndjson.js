// Newline-delimited JSON from a fetch() body. A line - or a multi-byte Arabic
// character - may arrive split across two network chunks.
// Contract: docs/contracts/tutor-stream-v1.md
export async function* readNdjson(body) {
  const reader = body.getReader ? body.getReader() : null;
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const chunks = reader
    ? (async function* () {
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) return;
            yield value;
          }
        } finally {
          reader.releaseLock?.();
        }
      })()
    : body;

  for await (const chunk of chunks) {
    buffer += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) yield JSON.parse(buffer.trim());
}
