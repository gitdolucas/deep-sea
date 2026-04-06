/**
 * One-off / regen: fills `decorations` on map JSON files.
 * Rules: off paths, spawns, castle footprint, and build slots (docs/map-schema.md).
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = join(__dirname, "..", "data", "maps");

const DECORATION_TYPES = [
  "coral_branch",
  "coral_fan",
  "kelp_cluster",
  "rock_small",
  "rock_large",
  "shell_pile",
  "vent_bubble",
  "trench_edge",
  "anemone",
  "skull",
];

function gridCellKey(x, z) {
  return `${x},${z}`;
}

function cellsAlongSegment(a, b) {
  const [x0, z0] = a;
  const [x1, z1] = b;
  if (x0 === x1) {
    const out = [];
    const zLo = Math.min(z0, z1);
    const zHi = Math.max(z0, z1);
    for (let z = zLo; z <= zHi; z++) out.push([x0, z]);
    return out;
  }
  if (z0 === z1) {
    const out = [];
    const xLo = Math.min(x0, x1);
    const xHi = Math.max(x0, x1);
    for (let x = xLo; x <= xHi; x++) out.push([x, z0]);
    return out;
  }
  let cx = x0;
  let cz = z0;
  const out = [];
  const dx = Math.abs(x1 - x0);
  const dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1;
  const sz = z0 < z1 ? 1 : -1;
  let err = dx - dz;
  for (;;) {
    out.push([cx, cz]);
    if (cx === x1 && cz === z1) break;
    const e2 = 2 * err;
    if (e2 > -dz) {
      err -= dz;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cz += sz;
    }
  }
  return out;
}

function pathCellKeySet(waypoints) {
  const set = new Set();
  for (let i = 1; i < waypoints.length; i++) {
    for (const [x, z] of cellsAlongSegment(waypoints[i - 1], waypoints[i])) {
      set.add(gridCellKey(x, z));
    }
  }
  return set;
}

function pathCellKeySetUnion(paths) {
  const set = new Set();
  for (const p of paths) {
    for (const k of pathCellKeySet(p.waypoints)) set.add(k);
  }
  return set;
}

function hash32(n) {
  let x = (n >>> 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function idSeed(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h, 31) + id.charCodeAt(i);
    h >>>= 0;
  }
  return h;
}

function validDecorationCells(doc) {
  const [gw, gh] = doc.gridSize;
  const pathKeys = pathCellKeySetUnion(doc.paths);
  const [cx, cz] = doc.castle.position;
  const [cw, ch] = doc.castle.size;
  const inCastle = (x, z) =>
    x >= cx && x < cx + cw && z >= cz && z < cz + ch;
  const spawnKeys = new Set(
    doc.spawnPoints.map((s) => gridCellKey(s.position[0], s.position[1])),
  );
  const out = [];
  for (let x = 0; x < gw; x++) {
    for (let z = 0; z < gh; z++) {
      const k = gridCellKey(x, z);
      if (pathKeys.has(k)) continue;
      if (inCastle(x, z)) continue;
      if (spawnKeys.has(k)) continue;
      out.push([x, z]);
    }
  }
  return out;
}

function scatterDecorations(doc) {
  const valid = validDecorationCells(doc);
  const seed = idSeed(doc.id);
  const ratio = 0.2;
  const target = Math.min(
    110,
    Math.max(14, Math.floor(valid.length * ratio)),
  );
  const scored = valid.map(([x, z]) => ({
    x,
    z,
    h: hash32(seed ^ Math.imul(x, 73856093) ^ Math.imul(z, 19349663)),
  }));
  scored.sort((a, b) => a.h - b.h);
  const chosen = scored.slice(0, Math.min(target, scored.length));
  return chosen.map(({ x, z }, i) => {
    const h = hash32(seed ^ x * 1013 ^ z * 7023 ^ i * 2654435761);
    const type = DECORATION_TYPES[h % DECORATION_TYPES.length];
    const rot = ((h >>> 8) & 3) * 90;
    const scale = Math.round((0.78 + ((h >>> 16) % 45) / 100) * 100) / 100;
    const ox = (((h >>> 4) & 255) / 255) * 0.48 - 0.24;
    const oz = (((h >>> 12) & 255) / 255) * 0.48 - 0.24;
    // Cell (x,z) with renderer centered at integers; +0.5 base + jitter → trunc stays (x,z), organic offset in render.
    return {
      type,
      position: [
        Math.round((x + 0.5 + ox) * 100) / 100,
        0,
        Math.round((z + 0.5 + oz) * 100) / 100,
      ],
      rotation: rot,
      scale,
    };
  });
}

function main() {
  const files = readdirSync(MAPS_DIR).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const path = join(MAPS_DIR, f);
    const doc = JSON.parse(readFileSync(path, "utf8"));
    doc.decorations = scatterDecorations(doc);
    writeFileSync(path, JSON.stringify(doc, null, 2) + "\n", "utf8");
    console.log(f, "decorations:", doc.decorations.length);
  }
}

main();
