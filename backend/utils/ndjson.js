// Newline-delimited JSON, read from a byte stream that arrives in arbitrary
// chunks: a line (or a multi-byte Arabic character) may be split across two.
// Contract: docs/contracts/tutor-stream-v1.md
export async function* readNdjson(byteStream) {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  for await (const chunk of byteStream) {
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
