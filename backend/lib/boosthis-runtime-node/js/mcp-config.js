// @ts-nocheck
/* eslint-disable */
// Built from src/mcp-config.ts so plain node can run the kit. Do not edit.
const args = ["--filter", "@workspace/boosthis-runtime-node", "run", "mcp"];
const env = {
  BOOSTHIS_PROJECT_ROOT: "<absolute path to the app that has the kit installed>"
};
const config = {
  mcpServers: {
    "boosthis-node": {
      command: "pnpm",
      args,
      env
    }
  }
};
const windowsConfig = {
  mcpServers: {
    "boosthis-node": {
      command: "cmd",
      args: ["/c", "pnpm", ...args],
      env
    }
  }
};
process.stdout.write(
  "# Paste this into your AI tool's MCP config\n# (Claude Desktop: claude_desktop_config.json · Cursor: .cursor/mcp.json · Replit AI: MCP settings)\n\n" + JSON.stringify(config, null, 2) + "\n\n# On Windows, `pnpm` is a script (pnpm.cmd) that an AI tool cannot start\n# without a shell. There, paste this form instead; it starts the same\n# server through cmd /c:\n\n" + JSON.stringify(windowsConfig, null, 2) + `

# BOOSTHIS_PROJECT_ROOT names the app whose state this server may read.
# Kit state is kept per application root, so two services on one machine
# never see each other's install — and your AI tool starts this server
# from its own working directory, not the app's. Point it at the app and
# the live tools below pick up that install's id and read token with
# nothing to copy; leave it out and they serve the on-device note.

# Optional — let the AI read this app's LIVE per-route meter (the four
# live-data tools: session_summary / recent_samples / budgets /
# what_should_i_look_at_next). Add an "env" block to the boosthis-node
# server above with credentials from this kit's own localhost-only
# GET /_boosthis/connect, or from the "Connect AI" card on this
# project's row in the Boosthis dashboard. On Windows, keep the cmd /c
# form's "command" and "args" and add the same block:
#
#   "boosthis-node": {
#     "command": "pnpm",
#     "args": ["--filter", "@workspace/boosthis-runtime-node", "run", "mcp"],
#     "env": {
#       "BOOSTHIS_INSTALL_ID": "<install id from the dashboard>",
#       "BOOSTHIS_READ_TOKEN": "<read token from the dashboard>"
#     }
#   }
#
# Without these the live-data tools return a note pointing at the dashboard.
# To read over Boosthis's HOSTED MCP instead, the dashboard's card prints a
# ready-to-paste { "url": "…/mcp", "headers": { "Authorization": "Bearer
# <YOUR_PROJECT_KEY>" } } config; pass the install id + read token as tool
# arguments. (Optional: set BOOSTHIS_ENDPOINT to point at a self-hosted server.)
`
);
