import type { MapDocument } from "./map-types.js";
import { MapController } from "./map-controller.js";
import {
  EconomyController,
  type EconomyInitialState,
} from "./economy-controller.js";
import { CastleController } from "./castle-controller.js";
import { WaveDirector } from "./wave-director.js";
import { EnemyController } from "./enemy-controller.js";
import {
  DamageResolver,
  fireIntervalFor,
  KILL_SHELL_REWARD,
  type TowerAttackResult,
} from "./damage-resolver.js";
import { ENEMY_LEAK_DAMAGE } from "./enemy-stats.js";
import { buildCostL1 } from "./defense-build-costs.js";
import { MVP_STARTING_SHELLS } from "./mvp-constants.js";
import type { DefenseTypeKey, GridPos } from "./types.js";
import { applyAurasFromDefenses } from "./aura-system.js";
import { DefenseController } from "./defense-controller.js";
import {
  DIRECT_DAMAGE,
  FIRE_COOLDOWN_SEC,
  attackRangeTiles,
} from "./combat-balance.js";
import { damageAfterArmorEffective } from "./combat-damage.js";
import { TargetingSystem, type TargetingContext } from "./targeting-system.js";
import { tileDistanceSq } from "./spatial.js";
import {
  spawnBubbleVolley,
  tickBubbleProjectiles,
  type BubblePopFx,
  type BubbleProjectileState,
} from "./bubble-projectiles.js";
import {
  simulateCannonProjectiles,
  spawnCannonProjectile,
  type CannonProjectileState,
} from "./cannon-projectiles.js";

export type GameOutcome = "playing" | "win" | "lose";

/**
 * Headless game loop: waves, auras, DoTs, movement, leaks, tower fire, economy/castle.
 */
export class GameSession {
  readonly map: MapController;
  readonly economy: EconomyController;
  readonly castle: CastleController;
  readonly waveDirector: WaveDirector;

  private readonly enemies = new Map<string, EnemyController>();
  private defenseCooldowns = new Map<string, number>();
  private nextEnemyId = 1;
  private outcome: GameOutcome = "playing";
  private pendingCombat: TowerAttackResult[] = [];
  private readonly laserBeamAccum = new Map<string, number>();
  private bubbleProjectiles: BubbleProjectileState[] = [];
  private bubblePopFx: BubblePopFx[] = [];
  private cannonProjectiles: CannonProjectileState[] = [];

  constructor(
    doc: MapDocument,
    economy?: Partial<EconomyInitialState>,
  ) {
    this.map = new MapController(doc);
    this.economy = new EconomyController({
      shells: economy?.shells ?? MVP_STARTING_SHELLS,
      totalShellsEarned: economy?.totalShellsEarned ?? 0,
    });
    this.castle = new CastleController(this.map.castle.hp);
    this.waveDirector = new WaveDirector(this.map, {
      spawnEnemy: (e) => {
        this.enemies.set(e.id, e);
      },
      assignEnemyId: () => `enemy_${this.nextEnemyId++}`,
    });
  }

  private targetingCtx(): TargetingContext {
    const c = this.map.castle.position;
    return { castlePosition: [c[0], c[1]] };
  }

  getOutcome(): GameOutcome {
    return this.outcome;
  }

  getEnemies(): ReadonlyMap<string, EnemyController> {
    return this.enemies;
  }

  getLivingEnemyCount(): number {
    return [...this.enemies.values()].filter((e) => e.isAlive()).length;
  }

  getDefenseCooldownRemaining(defenseId: string): number {
    return Math.max(0, this.defenseCooldowns.get(defenseId) ?? 0);
  }

  consumeCombatEvents(): TowerAttackResult[] {
    const out = this.pendingCombat;
    this.pendingCombat = [];
    return out;
  }

  /** Simulated bubble positions for 3D visuals (read-only; mutated next tick). */
  getBubbleProjectiles(): readonly BubbleProjectileState[] {
    return this.bubbleProjectiles;
  }

  /** Current Cannon water bolts for render (read-only; mutated next tick). */
  getCannonProjectiles(): readonly CannonProjectileState[] {
    return this.cannonProjectiles;
  }

  /** Impact bursts from this tick’s bubble contacts; clears when consumed. */
  consumeBubblePopFx(): BubblePopFx[] {
    if (this.bubblePopFx.length === 0) return [];
    const out = this.bubblePopFx.slice();
    this.bubblePopFx.length = 0;
    return out;
  }

  tryPurchaseDefenseL1(
    type: DefenseTypeKey,
    defenseId: string,
    position: GridPos,
  ): boolean {
    if (this.outcome !== "playing") return false;
    const cost = buildCostL1(type);
    if (!this.economy.trySpend(cost)) return false;
    const placed = this.map.placeDefense({
      id: defenseId,
      type,
      position: [position[0], position[1]],
      level: 1,
      targetMode: "first",
    });
    if (!placed) {
      this.economy.refund(cost);
      return false;
    }
    return true;
  }

  tryPurchaseArcSpineL1(defenseId: string, position: GridPos): boolean {
    return this.tryPurchaseDefenseL1("arc_spine", defenseId, position);
  }

  startWaveEarly(): void {
    if (this.outcome !== "playing") return;
    if (this.waveDirector.getPhase() !== "prep") return;
    this.waveDirector.skipPrep();
    this.waveDirector.tick(1e-9);
  }

  getTideDisplayNumber(): number {
    return this.waveDirector.getWaveIndex() + 1;
  }

  tick(deltaSeconds: number): void {
    if (this.outcome !== "playing" || deltaSeconds <= 0) return;

    this.waveDirector.tick(deltaSeconds);

    applyAurasFromDefenses(
      this.enemies,
      this.map.getDefenses(),
      deltaSeconds,
    );

    for (const enemy of [...this.enemies.values()]) {
      if (!enemy.isAlive()) continue;
      enemy.tickDamageOverTime(deltaSeconds, (e, amt) => {
        e.applyDamage(amt);
      });
    }
    this.collectDeadEnemies();

    for (const enemy of [...this.enemies.values()]) {
      if (!enemy.isAlive()) {
        this.enemies.delete(enemy.id);
        continue;
      }
      enemy.tickMovement(deltaSeconds);
      if (enemy.getPathProgress() >= 1) {
        const base = ENEMY_LEAK_DAMAGE[enemy.enemyType];
        const mult = enemy.getCitadelLeakMultiplier();
        this.castle.applyDamage(Math.max(0, Math.floor(base * mult)));
        this.enemies.delete(enemy.id);
      }
    }

    if (this.castle.isDestroyed()) {
      this.outcome = "lose";
      return;
    }

    tickBubbleProjectiles(
      this.bubbleProjectiles,
      deltaSeconds,
      this.enemies,
      this.economy,
      this.bubblePopFx,
    );
    this.tickTideheartLasers(deltaSeconds);
    this.tickMainDefenses(deltaSeconds);
    simulateCannonProjectiles(
      this.cannonProjectiles,
      deltaSeconds,
      {
        enemies: this.enemies,
        economy: this.economy,
        targeting: this.targetingCtx(),
      },
      (defenseId) =>
        this.map.getDefenses().find((d) => d.id === defenseId),
      (r) => {
        this.pendingCombat.push(r);
      },
    );

    this.waveDirector.tryAdvanceWaveIfCleared(this.getLivingEnemyCount());

    if (this.castle.isDestroyed()) {
      this.outcome = "lose";
      return;
    }
    if (this.waveDirector.getPhase() === "completed") {
      this.outcome = "win";
    }
  }

  private collectDeadEnemies(): void {
    for (const e of [...this.enemies.values()]) {
      if (!e.isAlive()) {
        this.economy.earn(KILL_SHELL_REWARD);
        this.enemies.delete(e.id);
      }
    }
  }

  private tickTideheartLasers(dt: number): void {
    const ctx = this.targetingCtx();
    for (const snap of this.map.getDefenses()) {
      if (snap.type !== "tideheart_laser") continue;
      let acc = this.laserBeamAccum.get(snap.id) ?? 0;
      acc += dt;
      const interval = FIRE_COOLDOWN_SEC.tideheart_laser[snap.level];
      const dmg = DIRECT_DAMAGE.tideheart_laser[snap.level];
      const beamCount =
        snap.level === 1 ? 1 : snap.level === 2 ? 2 : 3;
      const defense = new DefenseController(snap);
      const range = attackRangeTiles(snap.type, snap.level);
      const hits: TowerAttackResult["hits"] = [];

      while (acc >= interval) {
        acc -= interval;
        const living = [...this.enemies.values()].filter((e) => e.isAlive());
        if (living.length === 0) continue;
        const targets = TargetingSystem.selectTargetsUnique(
          defense,
          living,
          snap.targetMode,
          { maxAttackRangeTiles: range },
          ctx,
          beamCount,
        );
        for (const t of targets) {
          if (!t.isAlive()) continue;
          const dealt = damageAfterArmorEffective(t, dmg);
          t.applyDamage(dealt);
          hits.push({
            enemyId: t.id,
            damage: dealt,
            position: [...t.getGridPosition()] as GridPos,
          });
        }
        this.collectDeadEnemies();
      }

      this.laserBeamAccum.set(snap.id, acc);
      if (hits.length > 0) {
        this.pendingCombat.push({ defenseId: snap.id, hits });
      }
    }
  }

  private tickMainDefenses(dt: number): void {
    const ctx = this.targetingCtx();
    for (const snap of this.map.getDefenses()) {
      if (
        snap.type === "tideheart_laser" ||
        snap.type === "vibration_zone" ||
        snap.type === "ink_veil"
      ) {
        continue;
      }

      let cd = this.defenseCooldowns.get(snap.id) ?? 0;
      cd -= dt;
      if (cd > 0) {
        this.defenseCooldowns.set(snap.id, cd);
        continue;
      }

      if (snap.type === "bubble_shotgun") {
        const alive = [...this.enemies.values()].filter((e) => e.isAlive());
        const range = attackRangeTiles(snap.type, snap.level);
        const rSq = range * range;
        const hasInRange =
          alive.length > 0 &&
          alive.some(
            (e) => tileDistanceSq(snap.position, e.getGridPosition()) <= rSq,
          );
        if (hasInRange) {
          const aim = TargetingSystem.selectBubbleAimTile(
            snap.position,
            alive,
            range,
            ctx,
          );
          this.bubbleProjectiles.push(
            ...spawnBubbleVolley(snap.position, aim, snap.level),
          );
        }
        this.defenseCooldowns.set(
          snap.id,
          fireIntervalFor(snap.type, snap.level),
        );
        continue;
      }

      if (snap.type === "current_cannon") {
        const cannonAlive = [...this.enemies.values()].filter((e) =>
          e.isAlive(),
        );
        if (cannonAlive.length > 0) {
          const defense = new DefenseController(snap);
          const cannonRange = attackRangeTiles(snap.type, snap.level);
          const aimTarget = TargetingSystem.selectTarget(
            defense,
            cannonAlive,
            snap.targetMode,
            { maxAttackRangeTiles: cannonRange },
            ctx,
          );
          if (aimTarget) {
            this.cannonProjectiles.push(
              spawnCannonProjectile(
                snap.position,
                aimTarget.id,
                snap.level,
                snap.id,
              ),
            );
          }
        }
        this.defenseCooldowns.set(
          snap.id,
          fireIntervalFor(snap.type, snap.level),
        );
        continue;
      }

      const result = DamageResolver.resolveTowerAttack(
        this.enemies,
        this.economy,
        snap,
        ctx,
      );
      if (result) {
        this.pendingCombat.push(result);
        this.defenseCooldowns.set(
          snap.id,
          fireIntervalFor(snap.type, snap.level),
        );
      }
    }
  }
}
