import type { EnemyTypeKey } from "./types.js";

/**
 * Scales spawn HP and citadel leak damage for all enemy types.
 * Armor stays at baseline so per-hit damage from towers stays comparable to design docs.
 */
export const ENEMY_GLOBAL_STRENGTH_MULT = 3;

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

/** Armor subtracted before damage floor (docs/prd-mvp.md Stoneclaw = 2). */
export const ENEMY_ARMOR: Record<EnemyTypeKey, number> = {
  stoneclaw: 2,
  razoreel: 0,
  abyssal_colossus: 0,
};
