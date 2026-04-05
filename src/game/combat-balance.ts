/**
 * Combat numbers from docs/combat.md (single source for balance tables).
 */
import type { DefenseLevel, DefenseTypeKey } from "./types.js";

/** L3 Vibration DoT per pulse (`EnemyController.tickDamageOverTime`). */
export const VIBRATION_DOT_DAMAGE_PER_TICK = 2;

/** Direct hit / beam tick damage before armor (0 = utility-only tick). */
export const DIRECT_DAMAGE: Record<DefenseTypeKey, Record<DefenseLevel, number>> =
  {
    tideheart_laser: { 1: 4, 2: 5, 3: 6 },
    bubble_shotgun: { 1: 25, 2: 30, 3: 35 },
    vibration_zone: { 1: 0, 2: 0, 3: VIBRATION_DOT_DAMAGE_PER_TICK },
    /** Buffed vs docs table; adds AoE splash in simulation (cannon-projectiles). */
    current_cannon: { 1: 12, 2: 19, 3: 28 },
    ink_veil: { 1: 0, 2: 0, 3: 0 },
    /** L1 tuned vs scaled Stoneclaw HP (12×ENEMY_GLOBAL_STRENGTH_MULT): ~3.5 primary hits to kill. */
    arc_spine: { 1: 12, 2: 15, 3: 18 },
  };

/** Bubble L3 extra splash damage (docs/combat.md §4). */
export const BUBBLE_SPLASH_L3 = 15;

/** Cooldown between “shots” or aura pulses (docs/combat.md §2). */
export const FIRE_COOLDOWN_SEC: Record<DefenseTypeKey, Record<DefenseLevel, number>> =
  {
    tideheart_laser: { 1: 0.1, 2: 0.1, 3: 0.08 },
    bubble_shotgun: { 1: 1.5, 2: 1.1, 3: 0.75 },
    vibration_zone: { 1: 0.5, 2: 0.5, 3: 0.3 },
    current_cannon: { 1: 2.5, 2: 2.0, 3: 1.5 },
    ink_veil: { 1: 3.0, 2: 3.0, 3: 3.0 },
    /** −15% vs docs/combat.md table (faster fire rate). */
    arc_spine: { 1: 1.275, 2: 1.02, 3: 0.85 },
  };

/** Vibration slow fraction (0–1) by level. */
export const VIBRATION_SLOW: Record<DefenseLevel, number> = {
  1: 0.3,
  2: 0.5,
  3: 0.7,
};

/** Ink blind: citadel damage multiplier (1 - reduction from doc). L1 30% reduction → 0.7 */
export const INK_CITADEL_DAMAGE_MULT: Record<DefenseLevel, number> = {
  1: 0.7,
  2: 0.5,
  3: 0.3,
};

export const INK_ARMOR_SHRED_L3 = 5;

/** Arc Spine L3 burn: damage per tick and total duration (refreshes on hit). */
export const ARC_BURN_DAMAGE_PER_TICK = 2;
export const ARC_BURN_TICK_INTERVAL = 0.5;
export const ARC_BURN_DURATION = 3;

/** Vibration L3 DoT tick matches aura tick at L3. */
export const VIBRATION_DOT_TICK = 0.3;
export const VIBRATION_DOT_LINGER_SEC = 1;

export const CURRENT_CANNON_STUN_SEC = 0.8;

/** Enemies within this tile radius of the primary hit take splash damage (no knockback/stun). */
export const CANNON_SPLASH_RADIUS_TILES: Record<DefenseLevel, number> = {
  1: 1.85,
  2: 2.35,
  3: 2.9,
};

/** Splash uses this fraction of the tower’s direct hit raw damage (before armor). */
export const CANNON_SPLASH_DAMAGE_FRAC = 0.5;

/** Knockback distance in path tiles (docs/combat.md §5). */
export const KNOCKBACK_TILES: Record<DefenseLevel, number> = {
  1: 1,
  2: 2,
  3: 3,
};

/** Bubble / cannon projectile speed (tiles / sec) — provisional. */
export const BUBBLE_PROJECTILE_SPEED = 7.5;
export const CANNON_PROJECTILE_SPEED = 14;

export const INK_BLIND_LINGER_SEC = 0.5;

const BASE_ATTACK_RANGE: Record<DefenseTypeKey, number> = {
  arc_spine: 3,
  tideheart_laser: 5,
  bubble_shotgun: 4,
  vibration_zone: 4,
  current_cannon: 5,
  ink_veil: 4,
};

/** Engagement radius in tiles (Arc Spine +25% vs doc baseline L1=3/L2+=4; others provisional). */
export function attackRangeTiles(
  type: DefenseTypeKey,
  level: DefenseLevel,
): number {
  if (type === "arc_spine") return level === 1 ? 3.75 : 5;
  return BASE_ATTACK_RANGE[type] + (level - 1);
}

/**
 * Aura towers use the same table as `attackRangeTiles`, plus a small margin so
 * the field covers path cells whose centers sit just beyond an integer radius
 * (otherwise many off-path placements look like they should slow enemies but don't).
 */
export const AURA_RADIUS_MARGIN_TILES = 0.5;

export function auraRadiusTiles(
  type: "vibration_zone" | "ink_veil",
  level: DefenseLevel,
): number {
  return attackRangeTiles(type, level) + AURA_RADIUS_MARGIN_TILES;
}
