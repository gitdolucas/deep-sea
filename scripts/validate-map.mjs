#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("validate-map-cli.ts", import.meta.url));
const r = spawnSync(
  process.execPath,
  ["--import", "tsx/esm", entry, ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(r.status === null ? 1 : r.status);
