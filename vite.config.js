import { loadEnv, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "NIPRAS_");
  const target = env.NIPRAS_API_PROXY_TARGET || "http://127.0.0.1:5000";
  const proxy = { "/api": { target, changeOrigin: true }, "/uploads": { target, changeOrigin: true } };
  return {
    plugins: [react()],
    server: { host: "127.0.0.1", proxy },
    preview: { host: "127.0.0.1", proxy }
  };
});
