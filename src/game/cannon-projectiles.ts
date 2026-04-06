import { CANNON_PROJECTILE_SPEED } from "./combat-balance.js";
import { getCannonProjectileFxTuning } from "./cannon-projectile-fx-tuning.js";
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
  /** Seconds since spawn; used for fade-in (visual). */
  timeAlive: number;
  /** Distance to target (tiles) on first flight tick — drives length growth 0→1. */
  spawnDistToTarget?: number;
  /** 0 = min length, 1 = max; updated while in flight. */
  flightLengthProgress?: number;
  /** Post-hit: shrink length for this many seconds, then alpha fade. */
  shrinkRemaining?: number;
  /** Initial shrink duration (for normalizing length lerp). */
  shrinkDurationSec?: number;
  /** After shrink: alpha fade-out (seconds remaining). */
  fadeOutRemaining?: number;
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
    timeAlive: 0,
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

    if (p.shrinkRemaining !== undefined) {
      p.shrinkRemaining -= dt;
      if (p.shrinkRemaining <= 0) {
        p.shrinkRemaining = undefined;
        p.shrinkDurationSec = undefined;
        p.fadeOutRemaining = getCannonProjectileFxTuning().fadeOutSec;
      }
      continue;
    }

    if (p.fadeOutRemaining !== undefined) {
      p.fadeOutRemaining -= dt;
      if (p.fadeOutRemaining <= 0) {
        projectiles.splice(i, 1);
      }
      continue;
    }

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
    if (p.spawnDistToTarget === undefined) {
      p.spawnDistToTarget = Math.max(dist, HIT_DIST_TILES);
    }
    const step = CANNON_PROJECTILE_SPEED * dt;
    const moved = Math.min(step, dist);
    p.gx += p.vgx * moved;
    p.gz += p.vgz * moved;
    p.traveled += moved;
    p.timeAlive += dt;

    const distNow = Math.hypot(tw[0] - p.gx, tw[1] - p.gz);
    const s = p.spawnDistToTarget!;
    const denom = Math.max(s - HIT_DIST_TILES, 1e-6);
    p.flightLengthProgress = Math.max(
      0,
      Math.min(1, (s - distNow) / denom),
    );

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
      const tuning = getCannonProjectileFxTuning();
      const shrinkSec = tuning.shrinkBeforeFadeSec;
      if (shrinkSec <= 0) {
        p.fadeOutRemaining = tuning.fadeOutSec;
      } else {
        p.shrinkRemaining = shrinkSec;
        p.shrinkDurationSec = shrinkSec;
      }
      continue outer;
    }
  }
}
