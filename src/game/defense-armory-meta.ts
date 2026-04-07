import type { DefenseTypeKey } from "./types.js";

/**
 * High-level role for sorting / player mental model — design metadata only.
 * Tag strings in {@link ARMORY_ROLE_TAGS} must match real combat behavior.
 */
export type DefenseArmoryRole = "damage" | "control" | "support" | "aura";

/** Primary role per defense (one bucket for future grouped layouts). */
export const ARMORY_PRIMARY_ROLE: Record<DefenseTypeKey, DefenseArmoryRole> = {
  arc_spine: "damage",
  tideheart_laser: "damage",
  bubble_shotgun: "damage",
  vibration_zone: "control",
  current_cannon: "control",
  ink_veil: "aura",
};

/**
 * 1–2 short chips shown on inventory cards (player-facing; no stat claims beyond docs).
 */
export const ARMORY_ROLE_TAGS: Record<DefenseTypeKey, readonly string[]> = {
  arc_spine: ["Chain DPS", "Multi-target"],
  tideheart_laser: ["Beam DPS", "Focus fire"],
  bubble_shotgun: ["Burst DPS", "Close range"],
  vibration_zone: ["Crowd control", "Aura slow"],
  current_cannon: ["Crowd control", "Knockback"],
  ink_veil: ["Support", "Leak reduction"],
};

/** Short display names for armory cards (matches placed-defense-tooltip tone). */
export const ARMORY_DISPLAY_NAME: Record<DefenseTypeKey, string> = {
  arc_spine: "Arc Spine",
  tideheart_laser: "Tideheart Laser",
  bubble_shotgun: "Bubble Shotgun",
  vibration_zone: "Vibration Zone",
  current_cannon: "Current Cannon",
  ink_veil: "Ink Veil",
};

/**
 * One-line “main perk” for inventory cards — design copy; combat numbers stay in sim.
 */
export const ARMORY_CARD_PERK: Record<DefenseTypeKey, string> = {
  arc_spine: "Chain lightning to nearby targets",
  bubble_shotgun: "Close-range bubble volley",
  vibration_zone: "Aura slow and pulse damage",
  current_cannon: "Knockback bolts",
  ink_veil: "Leak reduction aura",
  tideheart_laser: "Sustained beam damage",
};
