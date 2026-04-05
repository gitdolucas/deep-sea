#!/usr/bin/env node
/**
 * Dev server reachable on your LAN (phone/tablet on same Wi‑Fi).
 * Default dev stays on 127.0.0.1:3000 for local / Playwright; use this for mobile.
 *
 * Usage: npm run dev:lan
 *        PORT=3000 npm run dev:lan
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import os from "node:os";

/** `npm run` sets cwd to the package root; avoid deriving from this file’s path (breaks with nested/worktree layouts). */
const rootDir = process.cwd();
let viteBin;
try {
  const require = createRequire(path.join(rootDir, "package.json"));
  const viteDir = path.dirname(require.resolve("vite/package.json"));
  viteBin = path.join(viteDir, "bin", "vite.js");
} catch {
  console.error("Could not resolve `vite`. Run `npm install` in this repo (directory with package.json).");
  process.exit(1);
}

/**
 * Bind-test on 0.0.0.0 (same as Vite) so “in use” matches real failures.
 * If the preferred port is taken (e.g. leftover dev:lan), use the next free one.
 *
 * @param {number} start
 * @param {number} maxAttempts
 */
async function findFreePort(start, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = start + i;
    if (port > 65535) break;
    const ok = await new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.once("error", (err) => {
        const e = /** @type {NodeJS.ErrnoException} */ (err);
        if (e.code === "EADDRINUSE") resolve(false);
        else reject(err);
      });
      srv.listen(port, "0.0.0.0", () => {
        srv.close((closeErr) => {
          if (closeErr) reject(closeErr);
          else resolve(true);
        });
      });
    });
    if (ok) return port;
  }
  throw new Error(
    `No free port in range ${start}–${start + maxAttempts - 1}. Close other dev servers or set PORT=.`,
  );
}

const preferred = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(preferred) || preferred < 1 || preferred > 65535) {
  console.error(`Invalid PORT: ${process.env.PORT ?? 3001}`);
  process.exit(1);
}
const PORT = await findFreePort(preferred);
const PORT_STR = String(PORT);

function ipv4LanAddresses() {
  const out = [];
  for (const rec of Object.values(os.networkInterfaces())) {
    if (!rec) continue;
    for (const iface of rec) {
      if (iface.family === "IPv4" && !iface.internal) out.push(iface.address);
    }
  }
  return out;
}

const addrs = ipv4LanAddresses();
console.log("");
console.log("  Deep Abyss TD — LAN dev server");
if (PORT !== preferred) {
  console.log(`  Port ${preferred} was busy — using ${PORT} (set PORT=… to pick a start)`);
} else {
  console.log(`  Port ${PORT} (set PORT=… to change; default avoids :3000 Playwright bind)`);
}
console.log("");
if (addrs.length === 0) {
  console.log("  No non-loopback IPv4 found — check Wi‑Fi / firewall.");
} else {
  for (const ip of addrs) {
    console.log(`  Phone:  http://${ip}:${PORT_STR}/`);
  }
}
console.log("");
console.log("  Portrait or landscape on phone — the canvas resizes with orientation.");
console.log("");

const child = spawn(process.execPath, [viteBin, "--host", "0.0.0.0", "--port", PORT_STR], {
  cwd: rootDir,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
