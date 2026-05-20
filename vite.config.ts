import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// Resolve to the private studio submodule when present, fall back to public
// stubs. This keeps CI and public checkouts buildable even when the submodule
// is absent or not initialized.
const studioImplPath = (() => {
  const privatePath = resolve(__dirname, "./src/studio/private");
  const stubsPath   = resolve(__dirname, "./src/studio/stubs");
  const privateRenderer = resolve(privatePath, "renderer/useStudioRenderer.ts");
  return fs.existsSync(privateRenderer) ? privatePath : stubsPath;
})();

export default defineConfig(async () => ({
  base: "./",
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      "@studio-impl": studioImplPath,
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        "quick-access": resolve(__dirname, "quick-access.html"),
        settings: resolve(__dirname, "settings.html"),
        delay: resolve(__dirname, "delay.html"),
        pin: resolve(__dirname, "pin.html"),
      },
    },
  },
}));
