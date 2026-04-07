import { readFileSync } from "node:fs";
import process from "node:process";
import { analyzeMapStrategyHints } from "../src/game/map-strategy-hints.js";
import type { MapDocument } from "../src/game/map-types.js";
import { validateMapDocument } from "../src/game/map-validation.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate-map.mjs <path-to-map.json> [more.json ...]");
  process.exit(2);
}

let exit = 0;
for (const path of process.argv.slice(2)) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (e) {
    console.error(`${path}: ${e instanceof Error ? e.message : "read/parse failed"}`);
    exit = 1;
    continue;
  }
  const issues = validateMapDocument(parsed);
  if (issues.length > 0) {
    exit = 1;
    console.error(`\n${path} — ${issues.length} schema issue(s):`);
    for (const i of issues) {
      console.error(`  ${i.path}: ${i.message} (${i.code})`);
    }
  } else {
    console.log(`\n${path} — schema OK`);
    const hints = analyzeMapStrategyHints(parsed as MapDocument);
    if (hints.length > 0) {
      console.warn(`  ${hints.length} strategy hint(s):`);
      for (const h of hints) {
        console.warn(`  • [${h.code}] ${h.path}: ${h.message}`);
      }
    }
  }
}

process.exit(exit);
