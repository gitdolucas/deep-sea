export { CastleController } from "./castle-controller.js";
export {
  DamageResolver,
  KILL_SHELL_REWARD,
  CHAIN_DAMAGE_FALLOFF,
  attackRangeTiles,
  fireIntervalFor,
  primaryDamageFor,
  type CombatResolveContext,
  type TowerAttackResult,
  type TowerHitRecord,
} from "./damage-resolver.js";
export { damageAfterArmorEffective } from "./combat-damage.js";
export { DefenseController, type ChainEnemyRef } from "./defense-controller.js";
export { EconomyController, type EconomyInitialState } from "./economy-controller.js";
export { EnemyController } from "./enemy-controller.js";
export {
  ENEMY_ARMOR,
  ENEMY_BASE_MAX_HP,
  ENEMY_GLOBAL_STRENGTH_MULT,
  ENEMY_LEAK_DAMAGE,
} from "./enemy-stats.js";
export { spawnEnemyFromWaveGroup } from "./enemy-spawner.js";
export {
  GameSession,
  type DefenseMoveStep,
  type GameOutcome,
} from "./game-session.js";
export type {
  BubbleColumnFxAxisMode,
  BubbleColumnFxEvent,
  BubbleColumnFxPreset,
} from "./bubble-column-fx-events.js";
export {
  ARMORY_DEFENSE_ORDER,
  DEFENSE_BUILD_COST_L1,
  buildCostL1,
} from "./defense-build-costs.js";
export {
  ARMORY_CARD_PERK,
  ARMORY_DISPLAY_NAME,
} from "./defense-armory-meta.js";
export { hotbarIndexFromKey } from "./hotbar-key.js";
export {
  downgradeRefundForLevel,
  salvageShellsForDefense,
  totalInvestedShells,
} from "./defense-economy.js";
export { MVP_ARC_SPINE_BUILD_COST, MVP_STARTING_SHELLS } from "./mvp-constants.js";
export { MapController } from "./map-controller.js";
export {
  isValidMapDocument,
  validateMapDocument,
  type MapValidationIssue,
} from "./map-validation.js";
export {
  cellsAlongSegment,
  gridCellKey,
  pathCellKeySet,
  pathCellKeySetUnion,
  pathCellVisualKind,
  type PathCellVisualKind,
} from "./path-cells.js";
export {
  TargetingSystem,
  TARGET_MODE_CYCLE_ORDER,
  cycleTargetMode,
  type TargetingContext,
  type TargetingOptions,
} from "./targeting-system.js";
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
