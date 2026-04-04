import type { MapDocument } from "./map-types.js";
import { MapController } from "./map-controller.js";
import { EconomyController, type EconomyInitialState } from "./economy-controller.js";
import { CastleController } from "./castle-controller.js";
import { WaveDirector } from "./wave-director.js";
import { EnemyController } from "./enemy-controller.js";
import { DamageResolver, fireIntervalFor } from "./damage-resolver.js";
import { ENEMY_LEAK_DAMAGE } from "./enemy-stats.js";

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

  constructor(
    doc: MapDocument,
    economy?: Partial<EconomyInitialState>,
  ) {
    this.map = new MapController(doc);
    this.economy = new EconomyController({
      shells: economy?.shells ?? 0,
      totalShellsEarned: economy?.totalShellsEarned,
    });
    this.castle = new CastleController(this.map.castle.hp);
    this.waveDirector = new WaveDirector(this.map, {
      spawnEnemy: (e) => {
        this.enemies.set(e.id, e);
      },
      assignEnemyId: () => `enemy_${this.nextEnemyId++}`,
    });
  }

  getEnemies(): ReadonlyMap<string, EnemyController> {
    return this.enemies;
  }

  getLivingEnemyCount(): number {
    return [...this.enemies.values()].filter((e) => e.isAlive()).length;
  }

  tick(deltaSeconds: number): void {
    if (this.castle.isDestroyed() || deltaSeconds <= 0) return;

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

    this.tickDefenses(deltaSeconds);
    this.waveDirector.tryAdvanceWaveIfCleared(this.getLivingEnemyCount());
  }

  private tickDefenses(dt: number): void {
    for (const snap of this.map.getDefenses()) {
      let cd = this.defenseCooldowns.get(snap.id) ?? 0;
      cd -= dt;
      if (cd > 0) {
        this.defenseCooldowns.set(snap.id, cd);
        continue;
      }
      DamageResolver.resolveTowerAttack(this.enemies, this.economy, snap);
      this.defenseCooldowns.set(snap.id, fireIntervalFor(snap.type));
    }
  }
}
