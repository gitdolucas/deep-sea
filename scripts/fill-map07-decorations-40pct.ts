/**
 * Ensures ~40% of open sand (grid − path union − citadel) has a decoration tile.
 * Run: npx tsx scripts/fill-map07-decorations-40pct.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gridCellKey, pathCellKeySetUnion } from "../src/game/path-cells.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const PROP_TYPES = [
  "coral_branch",
  "coral_fan",
  "kelp_cluster",
  "rock_small",
  "rock_large",
  "shell_pile",
  "vent_bubble",
  "anemone",
  "skull",
] as const;

function castleKeys(
  castle: { position: readonly [number, number]; size: readonly [number, number] },
  gw: number,
  gd: number,
): Set<string> {
  const set = new Set<string>();
  const [cx, cz] = castle.position;
  const [cw, ch] = castle.size;
  for (let x = cx; x < cx + cw; x++) {
    for (let z = cz; z < cz + ch; z++) {
      if (x >= 0 && z >= 0 && x < gw && z < gd) set.add(gridCellKey(x, z));
    }
  }
  return set;
}

function decorationKeySet(
  decs: readonly { position: readonly [number, number, number] }[],
): Set<string> {
  const set = new Set<string>();
  for (const d of decs) {
    set.add(gridCellKey(Math.floor(d.position[0]!), Math.floor(d.position[2]!)));
  }
  return set;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function processMap(relPath: string, seed: number): void {
  const filePath = path.join(ROOT, relPath);
  const doc = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    gridSize: [number, number];
    castle: { position: [number, number]; size: [number, number] };
    paths: { waypoints: readonly [number, number][] }[];
    decorations: {
      type: string;
      position: [number, number, number];
      rotation: number;
      scale: number;
    }[];
  };

  const [gw, gd] = doc.gridSize;
  const pathKeys = pathCellKeySetUnion(doc.paths);
  const cKeys = castleKeys(doc.castle, gw, gd);

  const openSand = new Set<string>();
  for (let x = 0; x < gw; x++) {
    for (let z = 0; z < gd; z++) {
      const k = gridCellKey(x, z);
      if (!pathKeys.has(k) && !cKeys.has(k)) openSand.add(k);
    }
  }

  const target = Math.round(0.4 * openSand.size);
  const decKeys = decorationKeySet(doc.decorations);

  let decOnSand = 0;
  for (const k of decKeys) {
    if (openSand.has(k)) decOnSand++;
  }

  const need = Math.max(0, target - decOnSand);
  const rand = mulberry32(seed);

  const candidates: [number, number][] = [];
  for (const k of openSand) {
    if (!decKeys.has(k)) {
      const [xs, zs] = k.split(",");
      candidates.push([Number(xs), Number(zs)]);
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = candidates[i]!;
    candidates[i] = candidates[j]!;
    candidates[j] = a;
  }

  const additions = [];
  const n = Math.min(need, candidates.length);
  for (let i = 0; i < n; i++) {
    const [x, z] = candidates[i]!;
    additions.push({
      type: PROP_TYPES[i % PROP_TYPES.length]!,
      position: [x, 0, z] as [number, number, number],
      rotation: [0, 90, 180, 270][i % 4]!,
      scale: Math.round((0.86 + (i % 7) * 0.02) * 100) / 100,
    });
  }

  doc.decorations = [...doc.decorations, ...additions];
  fs.writeFileSync(filePath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");

  let finalOnSand = 0;
  const finalKeys = decorationKeySet(doc.decorations);
  for (const k of finalKeys) {
    if (openSand.has(k)) finalOnSand++;
  }

  console.log(relPath, {
    openSand: openSand.size,
    target,
    decOnSandBefore: decOnSand,
    added: additions.length,
    decOnSandAfter: finalOnSand,
    pct: openSand.size ? (finalOnSand / openSand.size).toFixed(4) : "0",
  });
}

processMap("data/maps/map-07-symmetric-circuit.json", 0x07c1a1);
processMap("data/maps/map-07-abyssal-octopus.json", 0x07abe2);
