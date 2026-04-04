import { DefenseController } from "./defense-controller.js";
import { EnemyController } from "./enemy-controller.js";
import { TargetingSystem } from "./targeting-system.js";
import type { EconomyController } from "./economy-controller.js";
import { ENEMY_ARMOR } from "./enemy-stats.js";
import type {
  DefenseLevel,
  DefenseSnapshot,
  DefenseTypeKey,
  GridPos,
} from "./types.js";

const PRIMARY_DAMAGE: Record<DefenseTypeKey, Record<DefenseLevel, number>> = {
  tideheart_laser: { 1: 6, 2: 10, 3: 15 },
  bubble_shotgun: { 1: 4, 2: 7, 3: 10 },
  vibration_zone: { 1: 3, 2: 5, 3: 8 },
  current_cannon: { 1: 8, 2: 12, 3: 18 },
  ink_veil: { 1: 2, 2: 4, 3: 6 },
  arc_spine: { 1: 8, 2: 8, 3: 11 },
};

const FIRE_INTERVAL_SEC: Record<DefenseTypeKey, number> = {
  tideheart_laser: 0.55,
  bubble_shotgun: 0.9,
  vibration_zone: 0.35,
  current_cannon: 1.2,
  ink_veil: 0.6,
  arc_spine: 1.5,
};

/** Per-hop multiplier after primary (docs/prd-mvp.md). */
export const CHAIN_DAMAGE_FALLOFF = 0.8;

export const KILL_SHELL_REWARD = 8;

export function damageAfterArmor(enemy: EnemyController, rawDamage: number): number {
  const armor = ENEMY_ARMOR[enemy.enemyType];
  return Math.max(1, Math.floor(rawDamage) - armor);
}

export function primaryDamageFor(
  type: DefenseTypeKey,
  level: DefenseLevel,
): number {
  return PRIMARY_DAMAGE[type][level];
}

export function fireIntervalFor(type: DefenseTypeKey): number {
  return FIRE_INTERVAL_SEC[type];
}

export function attackRangeTiles(
  type: DefenseTypeKey,
  level: DefenseLevel,
): number {
  if (type === "arc_spine" && level === 1) return 3;
  if (type === "arc_spine") return 4;
  return 99;
}

export type TowerHitRecord = {
  enemyId: string;
  damage: number;
  position: GridPos;
};
export type TowerAttackResult = {
  defenseId: string;
  hits: TowerHitRecord[];
};

function chainRawDamage(primaryRaw: number, chainIndex: number): number {
  if (chainIndex <= 0) return primaryRaw;
  return Math.floor(primaryRaw * CHAIN_DAMAGE_FALLOFF ** chainIndex);
}

/**
 * Applies one tower attack cycle: single-target or Arc Spine chain (armor + falloff).
 */
export class DamageResolver {
  static resolveTowerAttack(
    enemies: Map<string, EnemyController>,
    economy: EconomyController,
    snap: DefenseSnapshot,
  ): TowerAttackResult | null {
    const alive = [...enemies.values()].filter((e) => e.isAlive());
    if (alive.length === 0) return null;

    const defense = new DefenseController(snap);
    const range = attackRangeTiles(snap.type, snap.level);
    const target = TargetingSystem.selectTarget(
      defense,
      alive,
      snap.targetMode,
      { maxAttackRangeTiles: range },
    );
    if (!target) return null;

    const primaryRaw = primaryDamageFor(snap.type, snap.level);
    const hits: TowerHitRecord[] = [];

    if (snap.type === "arc_spine") {
      const refs = alive.map((e) => ({
        id: e.id,
        position: e.getGridPosition(),
        alive: true as boolean,
      }));
      const ids = defense.computeArcChainHits(target.id, refs);
      ids.forEach((id, index) => {
        const e = enemies.get(id);
        if (!e?.isAlive()) return;
        const raw = chainRawDamage(primaryRaw, index);
        const dealt = damageAfterArmor(e, raw);
        e.applyDamage(dealt);
        hits.push({
          enemyId: id,
          damage: dealt,
          position: [...e.getGridPosition()] as GridPos,
        });
      });
    } else {
      const dealt = damageAfterArmor(target, primaryRaw);
      target.applyDamage(dealt);
      hits.push({
        enemyId: target.id,
        damage: dealt,
        position: [...target.getGridPosition()] as GridPos,
      });
    }

    for (const e of [...enemies.values()]) {
      if (!e.isAlive()) {
        economy.earn(KILL_SHELL_REWARD);
        enemies.delete(e.id);
      }
    }

    return { defenseId: snap.id, hits };
  }
}
