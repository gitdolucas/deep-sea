import type { DefenseController } from "./defense-controller.js";
import type { EnemyController } from "./enemy-controller.js";
import type { GridPos, TargetMode } from "./types.js";

function distSq(a: GridPos, b: GridPos): number {
  const dx = a[0] - b[0];
  const dz = a[1] - b[1];
  return dx * dx + dz * dz;
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

export type TargetingOptions = {
  /** Euclidean tile distance from tower `position`; enemies farther are ignored. */
  maxAttackRangeTiles?: number;
};

/**
 * Always picks the enemy furthest along its path (nearest the castle), in range.
 * `targetMode` on snapshots is ignored — kept for map/schema compatibility.
 */
export class TargetingSystem {
  static selectTarget(
    defense: DefenseController,
    enemies: readonly EnemyController[],
    _targetMode: TargetMode,
    options?: TargetingOptions,
  ): EnemyController | undefined {
    const pos = defense.position;
    let alive = enemies.filter((e) => e.isAlive());
    const cap = options?.maxAttackRangeTiles;
    if (cap !== undefined) {
      const rSq = cap * cap;
      alive = alive.filter(
        (e) => distSq(pos, e.getGridPosition()) <= rSq,
      );
    }
    if (alive.length === 0) return undefined;
    return maxScoreEnemy(alive, (e) => e.getPathProgress());
  }
}
