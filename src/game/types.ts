/** Grid cell on the ocean floor (see docs/map-schema.md). */
export type GridPos = readonly [x: number, z: number];

export type DefenseTypeKey =
  | "tideheart_laser"
  | "bubble_shotgun"
  | "vibration_zone"
  | "current_cannon"
  | "ink_veil"
  | "arc_spine";

export type TargetMode =
  | "first"
  | "last"
  | "strongest"
  | "weakest"
  | "closest";

export type EnemyTypeKey =
  | "stoneclaw"
  | "razoreel"
  | "abyssal_colossus";

export type DefenseLevel = 1 | 2 | 3;

export interface DefenseSnapshot {
  id: string;
  type: DefenseTypeKey;
  position: GridPos;
  level: DefenseLevel;
  targetMode: TargetMode;
}

export interface EnemyInstanceInput {
  id: string;
  enemyType: EnemyTypeKey;
  pathId: string;
  waypoints: readonly GridPos[];
  pathProgress: number;
  hp: number;
  maxHp: number;
  speedMultiplier: number;
}

/** Matches `saveState.shells` / `saveState.totalShellsEarned` in docs/map-schema.md. */
export interface EconomySnapshot {
  shells: number;
  totalShellsEarned: number;
}
