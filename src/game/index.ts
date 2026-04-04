export { CastleController } from "./castle-controller.js";
export {
  DamageResolver,
  KILL_SHELL_REWARD,
  fireIntervalFor,
  primaryDamageFor,
} from "./damage-resolver.js";
export { DefenseController, type ChainEnemyRef } from "./defense-controller.js";
export { EconomyController, type EconomyInitialState } from "./economy-controller.js";
export { EnemyController } from "./enemy-controller.js";
export { ENEMY_BASE_MAX_HP, ENEMY_LEAK_DAMAGE } from "./enemy-stats.js";
export { spawnEnemyFromWaveGroup } from "./enemy-spawner.js";
export { GameSession } from "./game-session.js";
export { MapController } from "./map-controller.js";
export { TargetingSystem } from "./targeting-system.js";
export { WaveDirector, type WaveDirectorHooks } from "./wave-director.js";
export type { WavePhase } from "./wave-types.js";
export type {
  BuildSlotDefinition,
  BuildSlotType,
  CastleDefinition,
  DecorationDefinition,
  DecorationTypeKey,
  MapDifficulty,
  MapDocument,
  PathDefinition,
  SpawnPointDefinition,
  WaveDefinition,
  WaveGroupDefinition,
} from "./map-types.js";
export type {
  DefenseLevel,
  DefenseSnapshot,
  DefenseTypeKey,
  EconomySnapshot,
  EnemyInstanceInput,
  EnemyTypeKey,
  GridPos,
  TargetMode,
} from "./types.js";
