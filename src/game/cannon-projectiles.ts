import { CANNON_PROJECTILE_SPEED } from "./combat-balance.js";
import { applyCurrentCannonImpact } from "./damage-resolver.js";
import type { CombatResolveContext, TowerAttackResult } from "./damage-resolver.js";
import type { DefenseLevel, DefenseSnapshot, GridPos } from "./types.js";

export type CannonProjectileState = {
  gx: number;
  gz: number;
  vgx: number;
  vgz: number;
  defenseId: string;
  targetEnemyId: string;
  level: DefenseLevel;
  traveled: number;
};

const HIT_DIST_TILES = 0.48;
const MAX_TRAVEL_TILES = 48;

export function spawnCannonProjectile(
  towerPos: GridPos,
  targetEnemyId: string,
  level: DefenseLevel,
  defenseId: string,
): CannonProjectileState {
  return {
    gx: towerPos[0],
    gz: towerPos[1],
    vgx: 0,
    vgz: 1,
    defenseId,
    targetEnemyId,
    level,
    traveled: 0,
  };
}

export function simulateCannonProjectiles(
  projectiles: CannonProjectileState[],
  dt: number,
  ctx: CombatResolveContext,
  getDefense: (defenseId: string) => DefenseSnapshot | undefined,
  onImpact: (result: TowerAttackResult) => void,
): void {
  outer: for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]!;
    const target = ctx.enemies.get(p.targetEnemyId);
    if (!target?.isAlive()) {
      projectiles.splice(i, 1);
      continue;
    }
    const tw = target.getGridPosition();
    let dx = tw[0] - p.gx;
    let dz = tw[1] - p.gz;
    let dist = Math.hypot(dx, dz);
    if (dist < 1e-6) {
      dx = p.vgx;
      dz = p.vgz;
      dist = Math.hypot(dx, dz) || 1;
    } else {
      p.vgx = dx / dist;
      p.vgz = dz / dist;
    }
    const step = CANNON_PROJECTILE_SPEED * dt;
    const moved = Math.min(step, dist);
    p.gx += p.vgx * moved;
    p.gz += p.vgz * moved;
    p.traveled += moved;

    const distNow = Math.hypot(tw[0] - p.gx, tw[1] - p.gz);
    if (distNow <= HIT_DIST_TILES || p.traveled >= MAX_TRAVEL_TILES) {
      if (p.traveled >= MAX_TRAVEL_TILES) {
        projectiles.splice(i, 1);
        continue;
      }
      const snap = getDefense(p.defenseId);
      if (snap?.type === "current_cannon") {
        const res = applyCurrentCannonImpact(ctx, snap, p.targetEnemyId);
        if (res) onImpact(res);
      }
      projectiles.splice(i, 1);
      continue outer;
    }
  }
}
