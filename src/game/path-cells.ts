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

export type PathCellVisualKind = "straight" | "corner" | "end" | "junction";

const CARDINAL: readonly GridPos[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Shape of a path cell for visuals (only defined when (gx,gz) lies on the path).
 */
export function pathCellVisualKind(
  gx: number,
  gz: number,
  pathSet: Set<string>,
): PathCellVisualKind | null {
  if (!pathSet.has(gridCellKey(gx, gz))) return null;
  const neighbors: GridPos[] = [];
  for (const [dx, dz] of CARDINAL) {
    if (pathSet.has(gridCellKey(gx + dx, gz + dz))) {
      neighbors.push([dx, dz]);
    }
  }
  const n = neighbors.length;
  if (n <= 1) return "end";
  if (n >= 3) return "junction";
  const d0 = neighbors[0]!;
  const d1 = neighbors[1]!;
  const opposite = d0[0] + d1[0] === 0 && d0[1] + d1[1] === 0;
  return opposite ? "straight" : "corner";
}
