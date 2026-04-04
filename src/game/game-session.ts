import type { MapDocument } from "./map-types.js";
import { MapController } from "./map-controller.js";
import { EconomyController, type EconomyInitialState } from "./economy-controller.js";
import { CastleController } from "./castle-controller.js";
import { WaveDirector } from "./wave-director.js";
import { EnemyController } from "./enemy-controller.js";
import {
  DamageResolver,
  fireIntervalFor,
  type TowerAttackResult,
} from "./damage-resolver.js";
import { ENEMY_LEAK_DAMAGE } from "./enemy-stats.js";
import { MVP_ARC_SPINE_BUILD_COST, MVP_STARTING_SHELLS } from "./mvp-constants.js";
import type { GridPos } from "./types.js";

export type GameOutcome = "playing" | "win" | "lose";

/**
 * Headless game loop: waves, movement, leaks, tower fire, economy/castle.
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

  getOutcome(): GameOutcome {
    return this.outcome;
  }

  getEnemies(): ReadonlyMap<string, EnemyController> {
    return this.enemies;
  }

  getLivingEnemyCount(): number {
    return [...this.enemies.values()].filter((e) => e.isAlive()).length;
  }

  /** Seconds until this tower may fire again after its last shot (0 if ready or never fired). */
  getDefenseCooldownRemaining(defenseId: string): number {
    return Math.max(0, this.defenseCooldowns.get(defenseId) ?? 0);
  }

  /** Combat events from the last `tickDefenses` pass (for VFX). */
  consumeCombatEvents(): TowerAttackResult[] {
    const out = this.pendingCombat;
    this.pendingCombat = [];
    return out;
  }

  /**
   * MVP: spend 30 shells and place Arc Spine L1 on a free off-path tile.
   */
  tryPurchaseArcSpineL1(defenseId: string, position: GridPos): boolean {
    if (this.outcome !== "playing") return false;
    if (!this.economy.trySpend(MVP_ARC_SPINE_BUILD_COST)) return false;
    const placed = this.map.placeDefense({
      id: defenseId,
      type: "arc_spine",
      position: [position[0], position[1]],
      level: 1,
      targetMode: "first",
    });
    if (!placed) {
      this.economy.refund(MVP_ARC_SPINE_BUILD_COST);
      return false;
    }
    return true;
  }

  /** End prep immediately (UI "Send Wave"). */
  startWaveEarly(): void {
    if (this.outcome !== "playing") return;
    if (this.waveDirector.getPhase() !== "prep") return;
    this.waveDirector.skipPrep();
    this.waveDirector.tick(1e-9);
  }

  /** Display wave number (1-based) during play. */
  getTideDisplayNumber(): number {
    return this.waveDirector.getWaveIndex() + 1;
  }

  tick(deltaSeconds: number): void {
    if (this.outcome !== "playing" || deltaSeconds <= 0) return;

    this.waveDirector.tick(deltaSeconds);

    for (const enemy of [...this.enemies.values()]) {
      if (!enemy.isAlive()) {
        this.enemies.delete(enemy.id);
        continue;
      }
      enemy.tick(deltaSeconds);
      if (enemy.getPathProgress() >= 1) {
        this.castle.applyDamage(ENEMY_LEAK_DAMAGE[enemy.enemyType]);
        this.enemies.delete(enemy.id);
      }
    }

    if (this.castle.isDestroyed()) {
      this.outcome = "lose";
      return;
    }

    this.tickDefenses(deltaSeconds);
    this.waveDirector.tryAdvanceWaveIfCleared(this.getLivingEnemyCount());

    if (this.castle.isDestroyed()) {
      this.outcome = "lose";
      return;
    }
    if (this.waveDirector.getPhase() === "completed") {
      this.outcome = "win";
    }
  }

  private tickDefenses(dt: number): void {
    for (const snap of this.map.getDefenses()) {
      let cd = this.defenseCooldowns.get(snap.id) ?? 0;
      cd -= dt;
      if (cd > 0) {
        this.defenseCooldowns.set(snap.id, cd);
        continue;
      }
      const result = DamageResolver.resolveTowerAttack(
        this.enemies,
        this.economy,
        snap,
      );
      if (result) {
        this.pendingCombat.push(result);
        this.defenseCooldowns.set(snap.id, fireIntervalFor(snap.type));
      }
    }
  }
}
