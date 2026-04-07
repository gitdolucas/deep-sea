import { DefenseController } from "./defense-controller.js";
import { EnemyController } from "./enemy-controller.js";
import { TargetingSystem, type TargetingContext } from "./targeting-system.js";
import type { EconomyController } from "./economy-controller.js";
import {
  CANNON_HIT_STUN_LIFT_SEC,
  DIRECT_DAMAGE,
  FIRE_COOLDOWN_SEC,
  CANNON_SPLASH_RADIUS_TILES,
  CANNON_SPLASH_DAMAGE_FRAC,
  attackRangeTiles,
} from "./combat-balance.js";
import { tileDistanceSq } from "./spatial.js";
import { damageAfterArmorEffective } from "./combat-damage.js";
import type { KillShellPop } from "./kill-shell-pop.js";
import type {
  DefenseLevel,
  DefenseSnapshot,
  DefenseTypeKey,
  GridPos,
} from "./types.js";

/** Per-hop multiplier after primary (docs/prd-mvp.md + combat.md §4). */
export const CHAIN_DAMAGE_FALLOFF = 0.8;

export const KILL_SHELL_REWARD = 8;

export { attackRangeTiles, auraRadiusTiles } from "./combat-balance.js";

export function primaryDamageFor(
  type: DefenseTypeKey,
  level: DefenseLevel,
): number {
  return DIRECT_DAMAGE[type][level];
}

export function fireIntervalFor(
  type: DefenseTypeKey,
  level: DefenseLevel,
): number {
  return FIRE_COOLDOWN_SEC[type][level];
}

export type TowerHitRecord = {
  enemyId: string;
  damage: number;
  position: GridPos;
};
export type TowerAttackResult = {
  defenseId: string;
  hits: TowerHitRecord[];
  /** When false, skip Arc Spine-style chain lightning between tower and hits. */
  chainLightningVfx?: boolean;
  /** Ground blast decal / shader at impact (Current Cannon splash). */
  cannonBlast?: {
    gx: number;
    gz: number;
    radiusTiles: number;
  };
  /** Upward current column VFX at primary hit (tower cell + impact cell). */
  cannonColumnHit?: {
    gx: number;
    gz: number;
    fromGx: number;
    fromGz: number;
  };
};

export type CombatResolveContext = {
  enemies: Map<string, EnemyController>;
  economy: EconomyController;
  targeting: TargetingContext;
  /** When enemies die during this collect pass, attribute kill credit to this defense (HUD pops). */
  onDefensePop?: (defenseId: string, count: number) => void;
  /** One callback per enemy removed with {@link KILL_SHELL_REWARD} this tick. */
  onKillShell?: (pop: KillShellPop) => void;
};

function chainRawDamage(primaryRaw: number, chainIndex: number): number {
  if (chainIndex <= 0) return primaryRaw;
  return Math.floor(primaryRaw * CHAIN_DAMAGE_FALLOFF ** chainIndex);
}

function collectKills(
  ctx: CombatResolveContext,
  creditDefenseId: string | undefined,
): void {
  let n = 0;
  for (const e of [...ctx.enemies.values()]) {
    if (!e.isAlive()) {
      n++;
      const pos = e.getGridPosition();
      ctx.economy.earn(KILL_SHELL_REWARD);
      ctx.onKillShell?.({
        gx: pos[0],
        gz: pos[1],
        shells: KILL_SHELL_REWARD,
      });
      ctx.enemies.delete(e.id);
    }
  }
  if (n > 0 && creditDefenseId && ctx.onDefensePop) {
    ctx.onDefensePop(creditDefenseId, n);
  }
}

/**
 * Arc Spine chain attack (hitscan + chain falloff). L3 applies burn on primary hits only (handled here).
 */
export function resolveArcSpineAttack(
  ctx: CombatResolveContext,
  snap: DefenseSnapshot,
): TowerAttackResult | null {
  const alive = [...ctx.enemies.values()].filter((e) => e.isAlive());
  if (alive.length === 0) return null;

  const defense = new DefenseController(snap);
  const range = attackRangeTiles(snap.type, snap.level);
  const target = TargetingSystem.selectTarget(
    defense,
    alive,
    snap.targetMode,
    { maxAttackRangeTiles: range },
    ctx.targeting,
  );
  if (!target) return null;

  const primaryRaw = DIRECT_DAMAGE.arc_spine[snap.level];
  const hits: TowerHitRecord[] = [];
  const refs = alive.map((e) => ({
    id: e.id,
    position: e.getGridPosition(),
    alive: true as boolean,
  }));
  const ids = defense.computeArcChainHits(target.id, refs);

  ids.forEach((id, index) => {
    const e = ctx.enemies.get(id);
    if (!e?.isAlive()) return;
    const raw = chainRawDamage(primaryRaw, index);
    const dealt = damageAfterArmorEffective(e, raw);
    e.applyDamage(dealt);
    if (snap.level === 3 && index === 0) e.refreshArcBurn();
    hits.push({
      enemyId: id,
      damage: dealt,
      position: [...e.getGridPosition()] as GridPos,
    });
  });

  collectKills(ctx, snap.id);
  return { defenseId: snap.id, hits, chainLightningVfx: true };
}

/**
 * Current Cannon impact: direct hit (stun + lift, no knockback) and splash near blast center.
 */
export function applyCurrentCannonImpact(
  ctx: CombatResolveContext,
  snap: DefenseSnapshot,
  primaryEnemyId: string,
): TowerAttackResult | null {
  const primary = ctx.enemies.get(primaryEnemyId);
  if (!primary?.isAlive()) return null;

  const blastCenter = primary.getGridPosition();
  const raw = DIRECT_DAMAGE.current_cannon[snap.level];
  const dealtPrimary = damageAfterArmorEffective(primary, raw);
  primary.applyDamage(dealtPrimary);

  if (primary.enemyType !== "abyssal_colossus") {
    primary.addStun(CANNON_HIT_STUN_LIFT_SEC);
    primary.addCannonLiftVisual(CANNON_HIT_STUN_LIFT_SEC);
  }

  const hits: TowerHitRecord[] = [
    {
      enemyId: primary.id,
      damage: dealtPrimary,
      position: [...primary.getGridPosition()] as GridPos,
    },
  ];

  const splashR = CANNON_SPLASH_RADIUS_TILES[snap.level];
  const splashRsq = splashR * splashR;
  const splashRaw = Math.max(
    0,
    Math.floor(raw * CANNON_SPLASH_DAMAGE_FRAC),
  );
  if (splashRaw > 0) {
    for (const e of ctx.enemies.values()) {
      if (!e.isAlive() || e.id === primary.id) continue;
      if (tileDistanceSq(blastCenter, e.getGridPosition()) > splashRsq) continue;
      const sd = damageAfterArmorEffective(e, splashRaw);
      if (sd <= 0) continue;
      e.applyDamage(sd);
      hits.push({
        enemyId: e.id,
        damage: sd,
        position: [...e.getGridPosition()] as GridPos,
      });
    }
  }

  collectKills(ctx, snap.id);
  return {
    defenseId: snap.id,
    hits,
    chainLightningVfx: false,
    cannonBlast: {
      gx: blastCenter[0],
      gz: blastCenter[1],
      radiusTiles: splashR,
    },
    cannonColumnHit: {
      gx: blastCenter[0],
      gz: blastCenter[1],
      fromGx: snap.position[0],
      fromGz: snap.position[1],
    },
  };
}

/** Current Cannon (tests / tools): acquire target and resolve impact immediately. */
export function resolveCurrentCannonAttack(
  ctx: CombatResolveContext,
  snap: DefenseSnapshot,
): TowerAttackResult | null {
  const alive = [...ctx.enemies.values()].filter((e) => e.isAlive());
  if (alive.length === 0) return null;

  const defense = new DefenseController(snap);
  const range = attackRangeTiles(snap.type, snap.level);
  const target = TargetingSystem.selectTarget(
    defense,
    alive,
    snap.targetMode,
    { maxAttackRangeTiles: range },
    ctx.targeting,
  );
  if (!target) return null;
  return applyCurrentCannonImpact(ctx, snap, target.id);
}

/** Legacy entry for tests / tools — delegates by type. */
export class DamageResolver {
  static resolveTowerAttack(
    snap: DefenseSnapshot,
    ctx: CombatResolveContext,
  ): TowerAttackResult | null {
    if (snap.type === "arc_spine") return resolveArcSpineAttack(ctx, snap);
    if (
      snap.type === "ink_veil" ||
      snap.type === "vibration_zone" ||
      snap.type === "tideheart_laser"
    ) {
      return null;
    }
    return resolveDirectSingleHit(ctx, snap);
  }
}

function resolveDirectSingleHit(
  ctx: CombatResolveContext,
  snap: DefenseSnapshot,
): TowerAttackResult | null {
  const alive = [...ctx.enemies.values()].filter((e) => e.isAlive());
  if (alive.length === 0) return null;

  const defense = new DefenseController(snap);
  const range = attackRangeTiles(snap.type, snap.level);
  const target = TargetingSystem.selectTarget(
    defense,
    alive,
    snap.targetMode,
    { maxAttackRangeTiles: range },
    ctx.targeting,
  );
  if (!target) return null;

  const raw = DIRECT_DAMAGE[snap.type][snap.level];
  if (raw <= 0) return null;

  const dealt = damageAfterArmorEffective(target, raw);
  target.applyDamage(dealt);
  collectKills(ctx, snap.id);
  return {
    defenseId: snap.id,
    hits: [
      {
        enemyId: target.id,
        damage: dealt,
        position: [...target.getGridPosition()] as GridPos,
      },
    ],
  };
}
