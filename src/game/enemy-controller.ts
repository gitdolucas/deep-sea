import type { EnemyInstanceInput, EnemyTypeKey, GridPos } from "./types.js";

const BASE_SPEED_TILES_PER_SEC: Record<EnemyTypeKey, number> = {
  stoneclaw: 1.5,
  razoreel: 1.1,
  abyssal_colossus: 0.35,
};

/**
 * Runtime enemy: path progress, HP, and movement along waypoint polylines.
 */
export class EnemyController {
  readonly id: string;
  readonly enemyType: EnemyTypeKey;
  readonly pathId: string;

  private readonly waypoints: readonly GridPos[];
  private pathProgress: number;
  hp: number;
  readonly maxHp: number;
  speedMultiplier: number;

  constructor(input: EnemyInstanceInput) {
    this.id = input.id;
    this.enemyType = input.enemyType;
    this.pathId = input.pathId;
    this.waypoints = input.waypoints;
    this.pathProgress = input.pathProgress;
    this.hp = input.hp;
    this.maxHp = input.maxHp;
    this.speedMultiplier = input.speedMultiplier;
  }

  getPathProgress(): number {
    return this.pathProgress;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  getGridPosition(): GridPos {
    return this.positionFromProgress(this.pathProgress);
  }

  /**
   * Advance along the path in grid units/second (tiles/sec).
   */
  tick(deltaSeconds: number): void {
    if (!this.isAlive() || this.waypoints.length < 2) return;
    const length = this.totalPathLength();
    if (length <= 0) return;
    const speed = this.effectiveSpeedTilesPerSec();
    const deltaProgress = this.clamp(
      (speed * deltaSeconds) / length,
      0,
      1,
    );
    this.pathProgress = this.clamp(this.pathProgress + deltaProgress, 0, 1);
  }

  applyDamage(amount: number): void {
    if (amount <= 0 || !this.isAlive()) return;
    this.hp = Math.max(0, this.hp - amount);
  }

  private effectiveSpeedTilesPerSec(): number {
    return (
      BASE_SPEED_TILES_PER_SEC[this.enemyType] * this.speedMultiplier
    );
  }

  private totalPathLength(): number {
    if (this.waypoints.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < this.waypoints.length; i++) {
      sum += this.segmentLength(this.waypoints[i - 1]!, this.waypoints[i]!);
    }
    return sum;
  }

  private segmentLength(a: GridPos, b: GridPos): number {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    return Math.hypot(dx, dz);
  }

  private positionFromProgress(progress: number): GridPos {
    const p = this.clamp(progress, 0, 1);
    if (this.waypoints.length === 0) return [0, 0];
    if (this.waypoints.length === 1) return [...this.waypoints[0]!] as GridPos;

    const total = this.totalPathLength();
    if (total <= 0) return [...this.waypoints[0]!] as GridPos;

    let remaining = p * total;
    for (let i = 1; i < this.waypoints.length; i++) {
      const a = this.waypoints[i - 1]!;
      const b = this.waypoints[i]!;
      const len = this.segmentLength(a, b);
      if (remaining <= len || i === this.waypoints.length - 1) {
        const t = len > 0 ? Math.min(1, remaining / len) : 1;
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
      remaining -= len;
    }
    const last = this.waypoints[this.waypoints.length - 1]!;
    return [last[0], last[1]];
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
