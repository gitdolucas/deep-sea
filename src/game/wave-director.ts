import { spawnEnemyFromWaveGroup } from "./enemy-spawner.js";
import type { MapController } from "./map-controller.js";
import type { WaveGroupDefinition } from "./map-types.js";
import type { EnemyController } from "./enemy-controller.js";
import type { WavePhase } from "./wave-types.js";

export interface WaveDirectorHooks {
  spawnEnemy(enemy: EnemyController): void;
  assignEnemyId(): string;
}

type GroupSpawnState = {
  remainingToSpawn: number;
  delayRemaining: number;
  interval: number;
  untilNextSpawn: number;
};

/**
 * Prep countdown, wave activation, and per-group spawn pacing (`interval` / `delay`).
 */
export class WaveDirector {
  private waveIndex = 0;
  private phase: WavePhase = "prep";
  private prepRemaining = 0;
  private groupStates: GroupSpawnState[] | null = null;

  constructor(
    private readonly map: MapController,
    private readonly hooks: WaveDirectorHooks,
  ) {
    this.resetPrepForCurrentWave();
  }

  getWaveIndex(): number {
    return this.waveIndex;
  }

  getPhase(): WavePhase {
    return this.phase;
  }

  getPrepRemaining(): number {
    return this.prepRemaining;
  }

  isWaveSpawnComplete(): boolean {
    if (this.phase !== "active" || !this.groupStates) return false;
    return this.groupStates.every((s) => s.remainingToSpawn <= 0);
  }

  /**
   * Fraction of enemies from the current wave that have **entered play** (0–1).
   * Only meaningful in `active` phase; otherwise 0.
   */
  getWaveSpawnReleaseFraction(): number {
    if (this.phase !== "active" || !this.groupStates) return 0;
    const wave = this.map.getWaves()[this.waveIndex];
    if (!wave) return 0;
    let total = 0;
    let remaining = 0;
    for (let i = 0; i < wave.groups.length; i++) {
      total += wave.groups[i]!.count;
      remaining += this.groupStates[i]!.remainingToSpawn;
    }
    if (total <= 0) return 1;
    return Math.min(1, Math.max(0, (total - remaining) / total));
  }

  /** Skip remaining prep time (e.g. "Send Wave"); next `tick` finishes prep if `dt` > 0. */
  skipPrep(): void {
    if (this.phase === "prep") this.prepRemaining = 0;
  }

  tick(dt: number): void {
    if (this.phase === "completed" || dt <= 0) return;

    let timeLeft = dt;

    if (this.phase === "prep") {
      const use = Math.min(timeLeft, this.prepRemaining);
      this.prepRemaining -= use;
      timeLeft -= use;
      if (this.prepRemaining > 0) return;
      this.enterActivePhase();
      if (this.phase !== "active") return;
    }

    if (!this.groupStates || timeLeft <= 0) return;

    const wave = this.map.getWaves()[this.waveIndex];
    if (!wave) return;

    for (let i = 0; i < wave.groups.length; i++) {
      const group = wave.groups[i]!;
      const st = this.groupStates[i]!;
      this.tickOneGroup(group, st, timeLeft);
    }
  }

  /**
   * When all enemies from this wave are spawned and none remain alive, advance prep for the next wave
   * or mark `completed` after the final wave.
   */
  tryAdvanceWaveIfCleared(livingEnemyCount: number): void {
    if (this.phase !== "active") return;
    if (!this.isWaveSpawnComplete() || livingEnemyCount > 0) return;

    const lastIndex = this.map.getWaves().length - 1;
    if (this.waveIndex >= lastIndex) {
      this.phase = "completed";
      this.groupStates = null;
      return;
    }

    this.waveIndex++;
    this.resetPrepForCurrentWave();
  }

  private resetPrepForCurrentWave(): void {
    const w = this.map.getWaves()[this.waveIndex];
    if (!w) {
      this.phase = "completed";
      this.prepRemaining = 0;
      this.groupStates = null;
      return;
    }
    this.phase = "prep";
    this.prepRemaining = w.prepTime;
    this.groupStates = null;
  }

  private enterActivePhase(): void {
    const w = this.map.getWaves()[this.waveIndex];
    if (!w) {
      this.phase = "completed";
      return;
    }
    this.phase = "active";
    this.groupStates = w.groups.map((g) => ({
      remainingToSpawn: g.count,
      delayRemaining: g.delay,
      interval: g.interval,
      untilNextSpawn: 0,
    }));
  }

  private tickOneGroup(
    group: WaveGroupDefinition,
    st: GroupSpawnState,
    dt: number,
  ): void {
    let remaining = dt;
    while (st.remainingToSpawn > 0) {
      if (st.delayRemaining > 0) {
        if (remaining <= 0) return;
        const use = Math.min(remaining, st.delayRemaining);
        st.delayRemaining -= use;
        remaining -= use;
        continue;
      }

      if (st.untilNextSpawn > 0) {
        if (remaining <= 0) return;
        const use = Math.min(remaining, st.untilNextSpawn);
        st.untilNextSpawn -= use;
        remaining -= use;
        continue;
      }

      const enemy = spawnEnemyFromWaveGroup(
        group,
        this.map,
        this.hooks.assignEnemyId(),
      );
      if (enemy) this.hooks.spawnEnemy(enemy);

      st.remainingToSpawn--;
      if (st.remainingToSpawn > 0) {
        st.untilNextSpawn = Math.max(0, st.interval);
      }
    }
  }
}
