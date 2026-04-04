import type { WaveGroupDefinition } from "./map-types.js";
import {
  ENEMY_BASE_MAX_HP,
  ENEMY_GLOBAL_STRENGTH_MULT,
} from "./enemy-stats.js";
import { EnemyController } from "./enemy-controller.js";
import type { MapController } from "./map-controller.js";

/**
 * Builds `EnemyController` instances from wave group + map paths/spawns.
 */
export function spawnEnemyFromWaveGroup(
  group: WaveGroupDefinition,
  map: MapController,
  enemyId: string,
): EnemyController | null {
  const spawn = map.getSpawnPoint(group.spawnId);
  const waypoints = map.getPathWaypoints(group.pathId);
  if (!spawn || !waypoints || waypoints.length < 2) return null;

  const baseHp = ENEMY_BASE_MAX_HP[group.enemyType];
  const maxHp = Math.max(
    1,
    Math.floor(baseHp * ENEMY_GLOBAL_STRENGTH_MULT * group.hpMultiplier),
  );

  return new EnemyController({
    id: enemyId,
    enemyType: group.enemyType,
    pathId: group.pathId,
    waypoints,
    pathProgress: 0,
    hp: maxHp,
    maxHp,
    speedMultiplier: group.speedMultiplier,
  });
}
