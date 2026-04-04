import {
  INK_ARMOR_SHRED_L3,
  INK_CITADEL_DAMAGE_MULT,
  VIBRATION_SLOW,
  auraRadiusTiles,
} from "./combat-balance.js";
import type { EnemyController } from "./enemy-controller.js";
import type { DefenseSnapshot } from "./types.js";
import { tileDistanceSq } from "./spatial.js";

/**
 * Resets per-enemy aura fields, then applies vibration + ink from all defenses.
 */
export function applyAurasFromDefenses(
  enemies: ReadonlyMap<string, EnemyController>,
  defenses: readonly DefenseSnapshot[],
  deltaSeconds: number,
): void {
  for (const e of enemies.values()) {
    if (!e.isAlive()) continue;
    e.resetAuraForTick();
  }

  for (const d of defenses) {
    if (d.type === "vibration_zone") {
      const r = auraRadiusTiles(d.type, d.level);
      const rSq = r * r;
      const slow = VIBRATION_SLOW[d.level];
      const isL3 = d.level === 3;
      for (const e of enemies.values()) {
        if (!e.isAlive()) continue;
        if (tileDistanceSq(d.position, e.getGridPosition()) <= rSq) {
          e.applyVibrationAura(slow, isL3);
        }
      }
    } else if (d.type === "ink_veil") {
      const r = auraRadiusTiles(d.type, d.level);
      const rSq = r * r;
      const mult = INK_CITADEL_DAMAGE_MULT[d.level];
      const shred = d.level === 3 ? INK_ARMOR_SHRED_L3 : 0;
      for (const e of enemies.values()) {
        if (!e.isAlive()) continue;
        if (tileDistanceSq(d.position, e.getGridPosition()) <= rSq) {
          /* d.level is 1 | 2 | 3 */
          e.applyInkAura(mult, shred);
        }
      }
    }
  }

  for (const e of enemies.values()) {
    if (!e.isAlive()) continue;
    e.postAuraTick(deltaSeconds);
  }
}
