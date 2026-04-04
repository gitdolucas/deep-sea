import type { GridPos } from "./types.js";

export function tileDistanceSq(a: GridPos, b: GridPos): number {
  const dx = a[0] - b[0];
  const dz = a[1] - b[1];
  return dx * dx + dz * dz;
}

export function tileDistance(a: GridPos, b: GridPos): number {
  return Math.sqrt(tileDistanceSq(a, b));
}

/** Squared distance from point P to segment A→B (grid x/z plane). */
export function distanceSqPointToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const abLenSq = abx * abx + abz * abz;
  if (abLenSq < 1e-12) return apx * apx + apz * apz;
  let t = (apx * abx + apz * abz) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx;
  const cz = az + t * abz;
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz;
}
