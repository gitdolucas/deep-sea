import type { DefenseController } from "./defense-controller.js";
import type { EnemyController } from "./enemy-controller.js";
import type { GridPos, TargetMode } from "./types.js";
import { tileDistanceSq } from "./spatial.js";

/** UI / gameplay order when cycling tower priority (docs/combat.md §1). */
export const TARGET_MODE_CYCLE_ORDER: readonly TargetMode[] = [
  "first",
  "last",
  "strongest",
  "weakest",
  "closest",
] as const;

export function cycleTargetMode(current: TargetMode): TargetMode {
  const i = TARGET_MODE_CYCLE_ORDER.indexOf(current);
  const next = (i < 0 ? 0 : i + 1) % TARGET_MODE_CYCLE_ORDER.length;
  return TARGET_MODE_CYCLE_ORDER[next]!;
}

function maxScoreEnemy<T extends { id: string }>(
  enemies: T[],
  score: (e: T) => number,
): T {
  let best = enemies[0]!;
  let bestS = score(best);
  for (let i = 1; i < enemies.length; i++) {
    const e = enemies[i]!;
    const s = score(e);
    if (s > bestS || (s === bestS && e.id < best.id)) {
      best = e;
      bestS = s;
    }
  }
  return best;
}

function minScoreEnemy<T extends { id: string }>(
  enemies: T[],
  score: (e: T) => number,
): T {
  let best = enemies[0]!;
  let bestS = score(best);
  for (let i = 1; i < enemies.length; i++) {
    const e = enemies[i]!;
    const s = score(e);
    if (s < bestS || (s === bestS && e.id < best.id)) {
      best = e;
      bestS = s;
    }
  }
  return best;
}

export type TargetingOptions = {
  maxAttackRangeTiles?: number;
};

export type TargetingContext = {
  /** Citadel grid position for path-centric priorities. */
  castlePosition: GridPos;
};

/**
 * Target selection (docs/combat.md §1). Requires castle position for first/last.
 */
export class TargetingSystem {
  static selectTarget(
    defense: DefenseController,
    enemies: readonly EnemyController[],
    targetMode: TargetMode,
    options: TargetingOptions | undefined,
    ctx: TargetingContext,
  ): EnemyController | undefined {
    const pos = defense.position;
    let alive = enemies.filter((e) => e.isAlive());
    const cap = options?.maxAttackRangeTiles;
    if (cap !== undefined) {
      const rSq = cap * cap;
      alive = alive.filter(
        (e) => tileDistanceSq(pos, e.getGridPosition()) <= rSq,
      );
    }
    if (alive.length === 0) return undefined;

    switch (targetMode) {
      case "first":
        return maxScoreEnemy(alive, (e) => e.getPathProgress());
      case "last":
        return minScoreEnemy(alive, (e) => e.getPathProgress());
      case "strongest":
        return maxScoreEnemy(alive, (e) => e.hp);
      case "weakest":
        return minScoreEnemy(alive, (e) => e.hp);
      case "closest":
        return minScoreEnemy(alive, (e) => tileDistanceSq(pos, e.getGridPosition()));
      default:
        return maxScoreEnemy(alive, (e) => e.getPathProgress());
    }
  }

  /** Several independent lock-ons (Tideheart L2/L3). */
  static selectTargetsUnique(
    defense: DefenseController,
    enemies: readonly EnemyController[],
    targetMode: TargetMode,
    options: TargetingOptions | undefined,
    ctx: TargetingContext,
    count: number,
  ): EnemyController[] {
    const out: EnemyController[] = [];
    let pool = enemies.filter((e) => e.isAlive());
    const cap = options?.maxAttackRangeTiles;
    if (cap !== undefined) {
      const rSq = cap * cap;
      const pos = defense.position;
      pool = pool.filter((e) => tileDistanceSq(pos, e.getGridPosition()) <= rSq);
    }
    while (out.length < count && pool.length > 0) {
      const t = TargetingSystem.selectTarget(
        defense,
        pool,
        targetMode,
        options,
        ctx,
      );
      if (!t) break;
      out.push(t);
      pool = pool.filter((e) => e.id !== t.id);
    }
    return out;
  }
}
