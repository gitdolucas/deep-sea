import type { EnemyTypeKey } from "./types.js";

/** Baseline tuning until per-enemy doc stats are wired. */
export const ENEMY_BASE_MAX_HP: Record<EnemyTypeKey, number> = {
  stoneclaw: 12,
  razoreel: 28,
  abyssal_colossus: 400,
};

export const ENEMY_LEAK_DAMAGE: Record<EnemyTypeKey, number> = {
  stoneclaw: 1,
  razoreel: 2,
  abyssal_colossus: 5,
};
