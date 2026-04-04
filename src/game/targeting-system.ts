import type { DefenseController } from "./defense-controller.js";
import { EnemyController } from "./enemy-controller.js";
import type { GridPos, TargetMode } from "./types.js";

function distSq(a: GridPos, b: GridPos): number {
  const dx = a[0] - b[0];
  const dz = a[1] - b[1];
  return dx * dx + dz * dz;
}

function maxScoreEnemy(
  enemies: EnemyController[],
  score: (e: EnemyController) => number,
): EnemyController {
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

function minScoreEnemy(
  enemies: EnemyController[],
  score: (e: EnemyController) => number,
): EnemyController {
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

/**
 * Tower targeting modes (`targetMode` on map defenses).
 */
export class TargetingSystem {
  static selectTarget(
    defense: DefenseController,
    enemies: readonly EnemyController[],
    mode: TargetMode,
  ): EnemyController | undefined {
    const alive = enemies.filter((e) => e.isAlive());
    if (alive.length === 0) return undefined;

    const pos = defense.position;
    switch (mode) {
      case "first":
        return maxScoreEnemy(alive, (e) => e.getPathProgress());
      case "last":
        return minScoreEnemy(alive, (e) => e.getPathProgress());
      case "strongest":
        return maxScoreEnemy(alive, (e) => e.hp);
      case "weakest":
        return minScoreEnemy(alive, (e) => e.hp);
      case "closest":
        return minScoreEnemy(alive, (e) => distSq(pos, e.getGridPosition()));
      default:
        return alive[0];
    }
  }
}
