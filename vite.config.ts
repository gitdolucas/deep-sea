import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  publicDir: "public",
  // Bind explicitly so Playwright's `http://127.0.0.1:3000` readiness check matches (localhost/IPv6 mismatches time out).
  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,
    open: false,
  },
  build: { outDir: "dist", sourcemap: true },
  resolve: {
    alias: {
      "@game": path.join(rootDir, "src/game"),
    },
  },
});
