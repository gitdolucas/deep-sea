import type { DefenseTypeKey } from "./types.js";

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
