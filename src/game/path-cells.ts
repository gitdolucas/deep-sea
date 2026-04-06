import type { GridPos } from "./types.js";

export function gridCellKey(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

/** Integer cells along one path segment (axis-aligned or Bresenham for diagonals). */
export function cellsAlongSegment(a: GridPos, b: GridPos): GridPos[] {
  const [x0, z0] = a;
  const [x1, z1] = b;
  if (x0 === x1) {
    const out: GridPos[] = [];
    const zLo = Math.min(z0, z1);
    const zHi = Math.max(z0, z1);
    for (let z = zLo; z <= zHi; z++) out.push([x0, z]);
    return out;
  }
  if (z0 === z1) {
    const out: GridPos[] = [];
    const xLo = Math.min(x0, x1);
    const xHi = Math.max(x0, x1);
    for (let x = xLo; x <= xHi; x++) out.push([x, z0]);
    return out;
  }
  return bresenhamGrid(a, b);
}

function bresenhamGrid(a: GridPos, b: GridPos): GridPos[] {
  let x0 = a[0]!;
  let z0 = a[1]!;
  const x1 = b[0]!;
  const z1 = b[1]!;
  const out: GridPos[] = [];
  const dx = Math.abs(x1 - x0);
  const dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1;
  const sz = z0 < z1 ? 1 : -1;
  let err = dx - dz;
  for (;;) {
    out.push([x0, z0]);
    if (x0 === x1 && z0 === z1) break;
    const e2 = 2 * err;
    if (e2 > -dz) {
      err -= dz;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      z0 += sz;
    }
  }
  return out;
}

/** Every cell touched by any path on the map. */
export function pathCellKeySetUnion(
  paths: readonly { waypoints: readonly GridPos[] }[],
): Set<string> {
  const set = new Set<string>();
  for (const p of paths) {
    for (const k of pathCellKeySet(p.waypoints)) {
      set.add(k);
    }
  }
  return set;
}

/** Union of all cells visited by consecutive waypoint segments. */
export function pathCellKeySet(waypoints: readonly GridPos[]): Set<string> {
  const set = new Set<string>();
  for (let i = 1; i < waypoints.length; i++) {
    for (const [x, z] of cellsAlongSegment(waypoints[i - 1]!, waypoints[i]!)) {
      set.add(gridCellKey(x, z));
    }
  }
  return set;
}

/**
 * Orthogonal path tile topology for union footprint rendering (I / L / T / + on merged
 * `pathKeys`). Not per-`pathId` — see docs/map-schema.md “Path footprint and tiling”.
 */
export type PathCellVisualKind =
  | "straight"
  | "corner"
  | "end"
  | "tee"
  | "cross";

/**
 * Cardinal steps for autotiling bit order. Bit *i* in {@link pathConnectionMask} is set iff
 * the neighbor at `(gx + dx, gz + dz)` is in the **union** `pathKeys`.
 *
 * Order: `+x`, `-x`, `+z`, `-z` (grid axes from docs/map-schema.md).
 */
export const PATH_CONNECTION_ORDER: readonly GridPos[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * 4-bit connection mask for union path footprint (0..15). Union semantics: a cell shows
 * a true arm iff **some** path polyline continues to that neighbor on the merged corridor.
 * Shared segments between two `pathId`s are truthful when both definitions include those cells.
 */
export function pathConnectionMask(
  gx: number,
  gz: number,
  pathSet: ReadonlySet<string>,
): number {
  let m = 0;
  for (let i = 0; i < PATH_CONNECTION_ORDER.length; i++) {
    const [dx, dz] = PATH_CONNECTION_ORDER[i]!;
    if (pathSet.has(gridCellKey(gx + dx, gz + dz))) {
      m |= 1 << i;
    }
  }
  return m;
}

/** Inverse of {@link pathConnectionMask} for tests and tooling (bit order matches {@link PATH_CONNECTION_ORDER}). */
export function pathNeighborOffsetsFromMask(mask: number): GridPos[] {
  const out: GridPos[] = [];
  for (let i = 0; i < PATH_CONNECTION_ORDER.length; i++) {
    if ((mask >>> i) & 1) {
      const step = PATH_CONNECTION_ORDER[i]!;
      out.push([step[0]!, step[1]!]);
    }
  }
  return out;
}

/** Cardinal grid steps to adjacent path cells (same order as {@link PATH_CONNECTION_ORDER}). */
export function pathCellNeighborOffsets(
  gx: number,
  gz: number,
  pathSet: ReadonlySet<string>,
): GridPos[] {
  const out: GridPos[] = [];
  for (const [dx, dz] of PATH_CONNECTION_ORDER) {
    if (pathSet.has(gridCellKey(gx + dx, gz + dz))) {
      out.push([dx, dz]);
    }
  }
  return out;
}

/**
 * Shape of a path cell for visuals (only defined when (gx,gz) lies on the path union).
 */
export function pathCellVisualKind(
  gx: number,
  gz: number,
  pathSet: ReadonlySet<string>,
): PathCellVisualKind | null {
  if (!pathSet.has(gridCellKey(gx, gz))) return null;
  const neighbors = pathCellNeighborOffsets(gx, gz, pathSet);
  const n = neighbors.length;
  if (n <= 1) return "end";
  if (n === 4) return "cross";
  if (n === 3) return "tee";
  const d0 = neighbors[0]!;
  const d1 = neighbors[1]!;
  const opposite = d0[0] + d1[0] === 0 && d0[1] + d1[1] === 0;
  return opposite ? "straight" : "corner";
}
