// Where the NIPRAS API is. Read by src/services/api.js before the app starts.
//
// `npm run dev` ignores this file and uses the local backend through Vite's
// /api proxy. Empty means /api on the same origin.
//
// On GitHub Pages: the https address deploy/vast/start.sh prints when the GPU
// server starts, ending in /api. Edit this one line on GitHub; the Pages
// workflow redeploys the site in about a minute.
//
//   window.NIPRAS_CONFIG = { apiUrl: "https://example-words.trycloudflare.com/api" };
window.NIPRAS_CONFIG = { apiUrl: "https://heater-thickness-promised-adjusted.trycloudflare.com/api" };
