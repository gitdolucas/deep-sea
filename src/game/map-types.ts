import type { DefenseSnapshot, EnemyTypeKey, GridPos } from "./types.js";

export type MapDifficulty = "normal" | "hard" | "nightmare";

export interface CastleDefinition {
  position: GridPos;
  hp: number;
  size: readonly [number, number];
}

export interface SpawnPointDefinition {
  id: string;
  position: GridPos;
  pathIds: readonly string[];
}

export interface PathDefinition {
  id: string;
  waypoints: readonly GridPos[];
}

export type BuildSlotType = "standard" | "reinforced";

export interface BuildSlotDefinition {
  position: GridPos;
  type: BuildSlotType;
}

export interface WaveGroupDefinition {
  enemyType: EnemyTypeKey;
  count: number;
  spawnId: string;
  pathId: string;
  interval: number;
  delay: number;
  hpMultiplier: number;
  speedMultiplier: number;
}

export interface WaveDefinition {
  wave: number;
  prepTime: number;
  isBoss: boolean;
  groups: readonly WaveGroupDefinition[];
}

export type DecorationTypeKey =
  | "coral_branch"
  | "coral_fan"
  | "kelp_cluster"
  | "rock_small"
  | "rock_large"
  | "shell_pile"
  | "vent_bubble"
  | "trench_edge"
  | "anemone"
  | "skull";

export interface DecorationDefinition {
  type: DecorationTypeKey;
  position: readonly [number, number, number];
  rotation: number;
  scale: number;
}

/** Top-level map JSON (docs/map-schema.md); `saveState` is optional for runtime saves. */
export interface MapDocument {
  id: string;
  name: string;
  difficulty: MapDifficulty;
  gridSize: readonly [number, number];
  castle: CastleDefinition;
  spawnPoints: readonly SpawnPointDefinition[];
  paths: readonly PathDefinition[];
  buildSlots: readonly BuildSlotDefinition[];
  defenses: readonly DefenseSnapshot[];
  waves: readonly WaveDefinition[];
  decorations: readonly DecorationDefinition[];
}
