// Where the NIPRAS API is. Read by src/services/api.js before the app starts.
//
// Empty: the API is on the same origin under /api (local development, where
// Vite proxies /api to the backend on port 5000).
//
// On GitHub Pages: the https address deploy/vast/start.sh prints when the GPU
// server starts, ending in /api. Edit this one line on GitHub; the Pages
// workflow redeploys the site in about a minute.
//
//   window.NIPRAS_CONFIG = { apiUrl: "https://example-words.trycloudflare.com/api" };
window.NIPRAS_CONFIG = { apiUrl: "" };
