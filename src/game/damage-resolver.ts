import { DefenseController } from "./defense-controller.js";
import { EnemyController } from "./enemy-controller.js";
import { TargetingSystem } from "./targeting-system.js";
import type { EconomyController } from "./economy-controller.js";
import type { DefenseLevel, DefenseSnapshot, DefenseTypeKey } from "./types.js";

const PRIMARY_DAMAGE: Record<DefenseTypeKey, Record<DefenseLevel, number>> = {
  tideheart_laser: { 1: 6, 2: 10, 3: 15 },
  bubble_shotgun: { 1: 4, 2: 7, 3: 10 },
  vibration_zone: { 1: 3, 2: 5, 3: 8 },
  current_cannon: { 1: 8, 2: 12, 3: 18 },
  ink_veil: { 1: 2, 2: 4, 3: 6 },
  arc_spine: { 1: 5, 2: 8, 3: 11 },
};

const FIRE_INTERVAL_SEC: Record<DefenseTypeKey, number> = {
  tideheart_laser: 0.55,
  bubble_shotgun: 0.9,
  vibration_zone: 0.35,
  current_cannon: 1.2,
  ink_veil: 0.6,
  arc_spine: 0.75,
};

export const KILL_SHELL_REWARD = 5;

export function primaryDamageFor(
  type: DefenseTypeKey,
  level: DefenseLevel,
): number {
  return PRIMARY_DAMAGE[type][level];
}

export function fireIntervalFor(type: DefenseTypeKey): number {
  return FIRE_INTERVAL_SEC[type];
}

/**
 * Applies one tower attack cycle: single-target or Arc Spine chain.
 */
export class DamageResolver {
  static resolveTowerAttack(
    enemies: Map<string, EnemyController>,
    economy: EconomyController,
    snap: DefenseSnapshot,
  ): void {
    const alive = [...enemies.values()].filter((e) => e.isAlive());
    if (alive.length === 0) return;

    const defense = new DefenseController(snap);
    const target = TargetingSystem.selectTarget(
      defense,
      alive,
      snap.targetMode,
    );
    if (!target) return;

    const dmg = primaryDamageFor(snap.type, snap.level);

    if (snap.type === "arc_spine") {
      const refs = alive.map((e) => ({
        id: e.id,
        position: e.getGridPosition(),
        alive: true as boolean,
      }));
      for (const id of defense.computeArcChainHits(target.id, refs)) {
        const e = enemies.get(id);
        if (e?.isAlive()) e.applyDamage(dmg);
      }
    } else {
      target.applyDamage(dmg);
    }

    for (const e of [...enemies.values()]) {
      if (!e.isAlive()) {
        economy.earn(KILL_SHELL_REWARD);
        enemies.delete(e.id);
      }
    }
  }
}
