// @ts-nocheck
/* eslint-disable */
// Built from src/mcp-stdio.ts so plain node can run the kit. Do not edit.
import { handleRequest } from "./mcp.js";
import { configureLiveData, isLiveDataConfigured } from "./liveData.js";
import { storage } from "./storage.js";
{
  const env = process.env;
  let installId = env.BOOSTHIS_INSTALL_ID || env.BOOSTEN_INSTALL_ID || "";
  let readToken = env.BOOSTHIS_READ_TOKEN || env.BOOSTEN_READ_TOKEN || "";
  if (!installId) {
    installId = storage.getSync("installId") || "";
  }
  if (installId && !readToken) {
    readToken = storage.getSync(`readToken:${installId}`) || "";
  }
  configureLiveData({
    installId,
    token: readToken,
    baseUrl: env.BOOSTHIS_ENDPOINT || env.BOOSTEN_ENDPOINT || void 0
  });
}
process.stderr.write(
  "boosthis-node MCP server starting. Note: the in-process sample buffer is empty when this is run standalone" + (isLiveDataConfigured() ? "; live-read tools (snapshot / crash_risk) are configured for this install's uploaded data." : "; for live perf data, use mount() in your Express app instead, or set BOOSTHIS_INSTALL_ID + BOOSTHIS_READ_TOKEN to read uploaded data.") + "\n"
);
let buffer = "";
const MAX_LINE_BYTES = 1 << 20;
let chain = Promise.resolve();
function dispatch(line) {
  chain = chain.then(async () => {
    if (line.length > MAX_LINE_BYTES) {
      process.stdout.write(
        JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request: line exceeds 1MiB cap" } }) + "\n"
      );
      return;
    }
    let req;
    try {
      req = JSON.parse(line);
    } catch {
      process.stdout.write(
        JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }) + "\n"
      );
      return;
    }
    const resp = await handleRequest(req);
    if (resp !== null) process.stdout.write(JSON.stringify(resp) + "\n");
  }).catch(() => {
  });
}
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    dispatch(line);
  }
  if (buffer.length > MAX_LINE_BYTES) {
    process.stderr.write(
      `boosthis-node MCP: dropping ${buffer.length}-byte unframed input (exceeds 1MiB cap)
`
    );
    buffer = "";
    process.stdout.write(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request: unframed input exceeds 1MiB cap" } }) + "\n"
    );
  }
});
process.stdin.on("end", () => process.exit(0));
