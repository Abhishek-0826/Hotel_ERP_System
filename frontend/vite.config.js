import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      ...(proxyTarget
        ? { proxy: { "/api": { target: proxyTarget, changeOrigin: true } } }
        : {}),
    },
    preview: {
      port: 4173,
      host: true,
    },
  };
});
