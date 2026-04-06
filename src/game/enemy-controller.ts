import type { EnemyInstanceInput, EnemyTypeKey, GridPos } from "./types.js";
import {
  ARC_BURN_DAMAGE_PER_TICK,
  ARC_BURN_DURATION,
  ARC_BURN_TICK_INTERVAL,
  CANNON_HIT_STUN_LIFT_SEC,
  INK_BLIND_LINGER_SEC,
  VIBRATION_DOT_DAMAGE_PER_TICK,
  VIBRATION_DOT_TICK,
  VIBRATION_DOT_LINGER_SEC,
} from "./combat-balance.js";
import { getCannonLiftFxTuning } from "./cannon-hit-fx-tuning.js";

const ARC_BURN_TICK_COUNT = Math.round(ARC_BURN_DURATION / ARC_BURN_TICK_INTERVAL);
import { ENEMY_ARMOR } from "./enemy-stats.js";

const BASE_SPEED_TILES_PER_SEC: Record<EnemyTypeKey, number> = {
  stoneclaw: 1.5,
  razoreel: 1.1,
  abyssal_colossus: 0.35,
};

/** Cubic ease-in-out on [0, 1]. */
function easeInOutCubic(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Runtime enemy: path progress, HP, movement, and combat debuffs (docs/combat.md §5).
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

  private auraSlowFrac = 0;
  private inInkCloud = false;
  private inkArmorShredActive = 0;
  private inkCitadelMultActive = 1;

  private blindLingerSec = 0;
  private blindMultDuringLinger = 1;
  private wasInInkLastFrame = false;

  private stunRemaining = 0;
  /** Render-only lift after Current Cannon hit; decays with stun (docs/combat.md). */
  private cannonLiftRemainingSec = 0;
  /** Per-hit phase so twist wobble isn’t synchronized across enemies. */
  private cannonLiftTwistSeed = 0;
  /** Remaining Arc Spine L3 burn pulses (docs/combat.md §5). */
  private burnTickCharges = 0;
  private burnTickAccum = 0;

  private inVibrationL3DotZone = false;
  private vibrationDotLingerSec = 0;
  private vibrationDotTickAccum = 0;

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

  getInkArmorShred(): number {
    return this.inInkCloud ? this.inkArmorShredActive : 0;
  }

  getCitadelLeakMultiplier(): number {
    if (this.inInkCloud) return this.inkCitadelMultActive;
    if (this.blindLingerSec > 0) return this.blindMultDuringLinger;
    return 1;
  }

  resetAuraForTick(): void {
    this.auraSlowFrac = 0;
    this.inInkCloud = false;
    this.inkArmorShredActive = 0;
    this.inkCitadelMultActive = 1;
    this.inVibrationL3DotZone = false;
  }

  applyVibrationAura(slowFrac: number, isL3Zone: boolean): void {
    this.auraSlowFrac = Math.max(this.auraSlowFrac, slowFrac);
    if (isL3Zone) this.inVibrationL3DotZone = true;
  }

  applyInkAura(citadelMult: number, armorShred: number): void {
    this.inInkCloud = true;
    this.inkCitadelMultActive = Math.min(
      this.inkCitadelMultActive,
      citadelMult,
    );
    this.inkArmorShredActive = Math.max(
      this.inkArmorShredActive,
      armorShred,
    );
  }

  /** After scanning all auras: blind linger 0.5s after leaving ink (docs/combat.md §5). */
  postAuraTick(dt: number): void {
    if (this.inInkCloud) {
      this.blindMultDuringLinger = this.inkCitadelMultActive;
    } else if (this.wasInInkLastFrame) {
      this.blindLingerSec = INK_BLIND_LINGER_SEC;
    }
    if (!this.inInkCloud && this.blindLingerSec > 0) {
      this.blindLingerSec -= dt;
    }
    this.wasInInkLastFrame = this.inInkCloud;

    if (this.inVibrationL3DotZone) {
      this.vibrationDotLingerSec = VIBRATION_DOT_LINGER_SEC;
    } else if (this.vibrationDotLingerSec > 0) {
      this.vibrationDotLingerSec -= dt;
    }
  }

  addStun(seconds: number): void {
    this.stunRemaining = Math.max(this.stunRemaining, seconds);
  }

  addCannonLiftVisual(seconds: number): void {
    if (seconds <= 0) return;
    if (this.cannonLiftRemainingSec <= 0) {
      this.cannonLiftTwistSeed = Math.random() * Math.PI * 2;
    }
    this.cannonLiftRemainingSec = Math.max(this.cannonLiftRemainingSec, seconds);
  }

  /** World-space Y offset for sprite lift during cannon hit (render only). */
  getCannonLiftYOffset(): number {
    if (this.cannonLiftRemainingSec <= 0) return 0;
    const { peakWorldY, riseSec, fallSec } = getCannonLiftFxTuning();
    const total = CANNON_HIT_STUN_LIFT_SEC;
    const rem = this.cannonLiftRemainingSec;
    const elapsed = total - rem;
    if (elapsed < riseSec) {
      return peakWorldY * easeInOutCubic(elapsed / riseSec);
    }
    if (rem < fallSec) {
      return peakWorldY * easeInOutCubic(rem / fallSec);
    }
    return peakWorldY;
  }

  /**
   * Local Euler twist (radians) while cannon lift is active — wobble on X/Y/Z in the air.
   */
  getCannonLiftTwistEuler(): { x: number; y: number; z: number } {
    if (this.cannonLiftRemainingSec <= 0) {
      return { x: 0, y: 0, z: 0 };
    }
    const t = getCannonLiftFxTuning();
    const total = CANNON_HIT_STUN_LIFT_SEC;
    const elapsed = total - this.cannonLiftRemainingSec;
    const phase = Math.min(1, Math.max(0, elapsed / total));
    const env = Math.sin(Math.PI * phase);
    const seed = this.cannonLiftTwistSeed;
    const el = elapsed;
    return {
      x: env * t.twistAmpX * Math.sin(seed + el * t.twistFreqX),
      y: env * t.twistAmpY * Math.sin(seed * 1.31 + el * t.twistFreqY),
      z: env * t.twistAmpZ * Math.cos(seed * 0.73 + el * t.twistFreqZ),
    };
  }

  refreshArcBurn(): void {
    this.burnTickCharges = ARC_BURN_TICK_COUNT;
  }

  effectiveArmorValue(): number {
    const base = ENEMY_ARMOR[this.enemyType];
    return Math.max(0, base - this.getInkArmorShred());
  }

  tickDamageOverTime(
    dt: number,
    onDamage: (enemy: EnemyController, amount: number) => void,
  ): void {
    if (!this.isAlive()) return;
    if (this.burnTickCharges > 0) {
      this.burnTickAccum += dt;
      while (
        this.burnTickAccum >= ARC_BURN_TICK_INTERVAL &&
        this.burnTickCharges > 0
      ) {
        this.burnTickAccum -= ARC_BURN_TICK_INTERVAL;
        this.burnTickCharges -= 1;
        onDamage(this, ARC_BURN_DAMAGE_PER_TICK);
      }
    } else {
      this.burnTickAccum = 0;
    }

    const dotActive =
      this.inVibrationL3DotZone || this.vibrationDotLingerSec > 0;
    if (dotActive) {
      this.vibrationDotTickAccum += dt;
      while (this.vibrationDotTickAccum >= VIBRATION_DOT_TICK) {
        this.vibrationDotTickAccum -= VIBRATION_DOT_TICK;
        onDamage(this, VIBRATION_DOT_DAMAGE_PER_TICK);
      }
    } else {
      this.vibrationDotTickAccum = 0;
    }
  }

  tickMovement(deltaSeconds: number): void {
    if (!this.isAlive() || this.waypoints.length < 2) return;
    if (this.stunRemaining > 0) {
      this.stunRemaining -= deltaSeconds;
    }
    if (this.cannonLiftRemainingSec > 0) {
      this.cannonLiftRemainingSec -= deltaSeconds;
    }
    if (this.stunRemaining > 0) {
      return;
    }
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
    const slow = this.clamp(1 - this.auraSlowFrac, 0, 1);
    return (
      BASE_SPEED_TILES_PER_SEC[this.enemyType] *
      this.speedMultiplier *
      slow
    );
  }

  totalPathLength(): number {
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