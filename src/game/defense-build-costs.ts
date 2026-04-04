import type { DefenseTypeKey } from "./types.js";

/**
 * L1 placement cost in shells. Arc Spine 30 is pinned in docs/prd-mvp.md.
 * Other values are provisional until docs pin per-tower build costs (docs/economy.md).
 */
export const DEFENSE_BUILD_COST_L1: Record<DefenseTypeKey, number> = {
  arc_spine: 30,
  tideheart_laser: 36,
  bubble_shotgun: 28,
  vibration_zone: 32,
  current_cannon: 34,
  ink_veil: 27,
};

/** UI / armory list order */
export const ARMORY_DEFENSE_ORDER: readonly DefenseTypeKey[] = [
  "arc_spine",
  "tideheart_laser",
  "bubble_shotgun",
  "vibration_zone",
  "current_cannon",
  "ink_veil",
];

export function buildCostL1(type: DefenseTypeKey): number {
  return DEFENSE_BUILD_COST_L1[type];
}
