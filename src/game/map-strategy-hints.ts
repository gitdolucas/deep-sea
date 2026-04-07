import type { MapDocument } from "./map-types.js";
import { gridCellKey, pathCellKeySet, PATH_CONNECTION_ORDER } from "./path-cells.js";

/**
 * Non-blocking layout hints from `.cursor/skills/deep-sea-map-strategy/SKILL.md`
 * (union footprint, decoration coverage). Does not replace {@link validateMapDocument}.
 */
export interface MapStrategyHint {
  code: string;
  path: string;
  message: string;
}

function push(
  hints: MapStrategyHint[],
  code: string,
  path: string,
  message: string,
): void {
  hints.push({ code, path, message });
}

/**
 * True when some cell belongs only to path A and is cardinally adjacent to a cell
 * that belongs only to path B — the union then connects two independent polylines
 * and can draw false tees/crosses. Intentional merges share cells, so those cells
 * are excluded from the onlyA/onlyB check.
 */
function parallelStripHintForPathPair(
  pathIdA: string,
  cellsA: ReadonlySet<string>,
  pathIdB: string,
  cellsB: ReadonlySet<string>,
): MapStrategyHint | null {
  const onlyA = new Set<string>();
  for (const k of cellsA) {
    if (!cellsB.has(k)) onlyA.add(k);
  }
  const onlyB = new Set<string>();
  for (const k of cellsB) {
    if (!cellsA.has(k)) onlyB.add(k);
  }
  for (const k of onlyA) {
    const [gx, gz] = k.split(",").map(Number) as [number, number];
    for (const [dx, dz] of PATH_CONNECTION_ORDER) {
      const nk = gridCellKey(gx + dx, gz + dz);
      if (onlyB.has(nk)) {
        return {
          code: "layout.parallel_path_adjacency",
          path: "paths",
          message: `Paths "${pathIdA}" and "${pathIdB}" have adjacent corridor tiles that are not shared waypoints — the floor union may show false tees or crossings. Separate parallel lanes by at least one row/column of non-path tiles, or route both paths through the same cells where they should merge.`,
        };
      }
    }
  }
  return null;
}

/**
 * Returns strategy hints for an in-progress or complete map. Safe to call on invalid
 * documents; skips path-pair analysis if fewer than two paths.
 */
export function analyzeMapStrategyHints(doc: MapDocument): MapStrategyHint[] {
  const hints: MapStrategyHint[] = [];

  if (doc.decorations.length === 0) {
    push(
      hints,
      "decorations.empty",
      "decorations",
      "No decorations yet — shipped maps usually scatter props on open sand for ambience and to break up builds (see deep-sea-map-strategy skill).",
    );
  }

  const usedSpawns = new Set<string>();
  for (const wave of doc.waves ?? []) {
    for (const g of wave.groups ?? []) {
      if (g.spawnId) usedSpawns.add(g.spawnId);
    }
  }
  for (const sp of doc.spawnPoints ?? []) {
    if (!usedSpawns.has(sp.id)) {
      push(
        hints,
        "waves.unused_spawn",
        "waves",
        `Spawn "${sp.id}" is never referenced by any wave group (deep-sea-map-strategy spawn coverage).`,
      );
    }
  }

  const paths = doc.paths;
  if (paths.length < 2) {
    return hints;
  }

  const cellSets = paths.map((p) => ({
    id: p.id,
    keys: pathCellKeySet(p.waypoints),
  }));

  for (let i = 0; i < cellSets.length; i++) {
    for (let j = i + 1; j < cellSets.length; j++) {
      const a = cellSets[i]!;
      const b = cellSets[j]!;
      const h = parallelStripHintForPathPair(a.id, a.keys, b.id, b.keys);
      if (h) hints.push(h);
    }
  }

  return hints;
}
