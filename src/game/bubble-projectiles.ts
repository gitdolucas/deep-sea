import { BUBBLE_PROJECTILE_SPEED, BUBBLE_SPLASH_L3, DIRECT_DAMAGE } from "./combat-balance.js";
import { damageAfterArmorEffective } from "./combat-damage.js";
import type { EnemyController } from "./enemy-controller.js";
import { KILL_SHELL_REWARD } from "./damage-resolver.js";
import type { EconomyController } from "./economy-controller.js";
import type { KillShellPop } from "./kill-shell-pop.js";
import { distanceSqPointToSegment, tileDistanceSq } from "./spatial.js";
import type { BubbleColumnFxEvent } from "./bubble-column-fx-events.js";
import type { DefenseLevel, GridPos } from "./types.js";

/** Per docs/defenses/bubble-shotgun.md — L1 3, L2 5, L3 7 bubbles. */
const BUBBLE_COUNT: Record<DefenseLevel, number> = { 1: 3, 2: 5, 3: 7 };

/** Half cone width (rad) for spread about aim; wider at higher tiers. */
const BUBBLE_SPREAD_HALF_RAD: Record<DefenseLevel, number> = {
  1: 0.35,
  2: 0.45,
  3: 0.55,
};

function spreadAnglesForLevel(level: DefenseLevel): number[] {
  const n = BUBBLE_COUNT[level];
  const half = BUBBLE_SPREAD_HALF_RAD[level];
  if (n <= 1) return [0];
  return Array.from({ length: n }, (_, i) => -half + (2 * half * i) / (n - 1));
}

export type BubbleProjectileState = {
  gx: number;
  gz: number;
  vgx: number;
  vgz: number;
  directDamage: number;
  splash: number;
  traveled: number;
  maxTravel: number;
};

/** One frame of impact feedback for render (bubble burst on enemy). */
export type BubblePopFx = {
  gx: number;
  gz: number;
  /** True when the projectile carried L3 splash. */
  splash: boolean;
};

/** Enemies can be skipped in one dt if we only test the endpoint; segment tests + forgiving radius. */
const HIT_RAD_SQ = 0.55 * 0.55;
const SPLASH_RAD_SQ = 1.01;
/** Grid-space extent for impact column axis along projectile velocity. */
const IMPACT_COLUMN_VEL_TILES = 0.4;

export function spawnBubbleVolley(
  towerPos: GridPos,
  aim: GridPos,
  level: DefenseLevel,
): BubbleProjectileState[] {
  const dx = aim[0] - towerPos[0];
  const dz = aim[1] - towerPos[1];
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const spreads = spreadAnglesForLevel(level);
  const dmg = DIRECT_DAMAGE.bubble_shotgun[level];
  const splash = level === 3 ? BUBBLE_SPLASH_L3 : 0;
  return spreads.map((s) => {
    const cos = Math.cos(s);
    const sin = Math.sin(s);
    const rx = ux * cos - uz * sin;
    const rz = ux * sin + uz * cos;
    return {
      gx: towerPos[0],
      gz: towerPos[1],
      vgx: rx,
      vgz: rz,
      directDamage: dmg,
      splash,
      traveled: 0,
      maxTravel: 9,
    };
  });
}

function collectKills(
  enemies: Map<string, EnemyController>,
  economy: EconomyController,
  onKillShell?: (pop: KillShellPop) => void,
): void {
  for (const e of [...enemies.values()]) {
    if (!e.isAlive()) {
      const pos = e.getGridPosition();
      economy.earn(KILL_SHELL_REWARD);
      onKillShell?.({
        gx: pos[0],
        gz: pos[1],
        shells: KILL_SHELL_REWARD,
      });
      enemies.delete(e.id);
    }
  }
}

export function tickBubbleProjectiles(
  projectiles: BubbleProjectileState[],
  dt: number,
  enemies: Map<string, EnemyController>,
  economy: EconomyController,
  popFxOut?: BubblePopFx[],
  columnFxOut?: BubbleColumnFxEvent[],
  onKillShell?: (pop: KillShellPop) => void,
): void {
  outer: for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]!;
    const step = BUBBLE_PROJECTILE_SPEED * dt;
    const ox = p.gx;
    const oz = p.gz;
    p.gx += p.vgx * step;
    p.gz += p.vgz * step;
    p.traveled += step;
    if (p.traveled >= p.maxTravel) {
      projectiles.splice(i, 1);
      continue;
    }
    for (const e of enemies.values()) {
      if (!e.isAlive()) continue;
      const pos = e.getGridPosition();
      const ep = pos[0];
      const ez = pos[1];
      const dSeg = distanceSqPointToSegment(ep, ez, ox, oz, p.gx, p.gz);
      const nearEnd =
        tileDistanceSq([p.gx, p.gz], pos) <= HIT_RAD_SQ;
      if (dSeg <= HIT_RAD_SQ || nearEnd) {
        popFxOut?.push({
          gx: ep,
          gz: ez,
          splash: p.splash > 0,
        });
        const vlen = Math.hypot(p.vgx, p.vgz) || 1;
        const ux = p.vgx / vlen;
        const uz = p.vgz / vlen;
        columnFxOut?.push({
          preset: "bubble_shotgun_impact",
          seed:
            (Math.imul(ep | 0, 73856093) ^
              Math.imul(ez | 0, 19349663) ^
              Math.imul(Math.floor(p.traveled * 1000) | 0, 50331653)) >>>
            0,
          from: [ep, ez],
          to: [ep + ux * IMPACT_COLUMN_VEL_TILES, ez + uz * IMPACT_COLUMN_VEL_TILES],
          axis: "segment",
          splash: p.splash > 0,
        });
        const dealt = damageAfterArmorEffective(e, p.directDamage);
        e.applyDamage(dealt);
        if (p.splash > 0) {
          for (const o of enemies.values()) {
            if (!o.isAlive() || o.id === e.id) continue;
            if (tileDistanceSq(pos, o.getGridPosition()) <= SPLASH_RAD_SQ) {
              const sd = damageAfterArmorEffective(o, p.splash);
              o.applyDamage(sd);
            }
          }
        }
        collectKills(enemies, economy, onKillShell);
        projectiles.splice(i, 1);
        continue outer;
      }
    }
  }
}
