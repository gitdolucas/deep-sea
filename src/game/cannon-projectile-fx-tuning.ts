/** Tunable cannon bolt length and fade timing (Leva + simulation + render). */

/** Cylinder geometry height in local space; `boltLength` scales vs this in the render loop. */
export const CANNON_BOLT_REFERENCE_LENGTH = 2.72;

export interface CannonProjectileFxTuning {
  /** Max bolt length along the shot axis when fully extended (world units). */
  boltLength: number;
  /**
   * Length at fire = `boltLength * boltLengthStartFrac` (0.15 → 15% of max).
   * Grows toward max while in flight; shrinks back toward this after hit.
   */
  boltLengthStartFrac: number;
  /**
   * After impact, time to shrink from max toward min before alpha fade-out.
   * 0 = skip shrink and go straight to fade-out.
   */
  shrinkBeforeFadeSec: number;
  /** Fade-in after spawn (seconds). 0 = fully visible immediately. */
  fadeInSec: number;
  /** Fade-out after shrink (seconds). 0 = remove same frame after shrink. */
  fadeOutSec: number;

  /** Cylinder mesh height in local space; length scale divides by this. */
  boltGeomHeight: number;
  boltRadiusBottom: number;
  boltRadiusTop: number;
  boltCylinderRadialSegs: number;
  boltCylinderHeightSegs: number;

  /** Vertical bob on the bolt mesh (worldFromGrid Y offset). */
  bobBase: number;
  bobSinAmp: number;
  bobSinTimeFreq: number;
  bobSinTravelFreq: number;
  bobSinIndexPhase: number;
  /** Multiplier on `traveled` for shader scroll. */
  boltScrollMult: number;
  /** Extra scale when tower level ≥ 3. */
  boltLevelScaleL3: number;
  boltLevelYBase: number;
  boltLevelYPerLevel: number;
  boltScaleWaveAmp: number;
  boltScaleWaveTimeFreq: number;
  boltScaleWaveTravelFreq: number;
}

export const DEFAULT_CANNON_PROJECTILE_FX_TUNING: CannonProjectileFxTuning = {
  boltLength: CANNON_BOLT_REFERENCE_LENGTH,
  boltLengthStartFrac: 0.14,
  shrinkBeforeFadeSec: 0.18,
  fadeInSec: 0.1,
  fadeOutSec: 0,

  boltGeomHeight: 2.12,
  boltRadiusBottom: 0.2,
  boltRadiusTop: 0.069,
  boltCylinderRadialSegs: 8,
  boltCylinderHeightSegs: 3,

  bobBase: 0.32,
  bobSinAmp: 0.04,
  bobSinTimeFreq: 14,
  bobSinTravelFreq: 2.8,
  bobSinIndexPhase: 0.7,
  boltScrollMult: 2.4,
  boltLevelScaleL3: 1.12,
  boltLevelYBase: 0.95,
  boltLevelYPerLevel: 0.04,
  boltScaleWaveAmp: 0,
  boltScaleWaveTimeFreq: 11,
  boltScaleWaveTravelFreq: 4,
};

export const cannonProjectileFxTuning: CannonProjectileFxTuning = {
  ...DEFAULT_CANNON_PROJECTILE_FX_TUNING,
};

export function getCannonProjectileFxTuning(): CannonProjectileFxTuning {
  return cannonProjectileFxTuning;
}

export function snapshotCannonProjectileFxTuning(): CannonProjectileFxTuning {
  return { ...cannonProjectileFxTuning };
}

export function cannonProjectileFxTuningToJSON(): string {
  return `${JSON.stringify(snapshotCannonProjectileFxTuning(), null, 2)}\n`;
}

export async function copyCannonProjectileFxTuningToClipboard(): Promise<boolean> {
  const text = cannonProjectileFxTuningToJSON();
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.append(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function resetCannonProjectileFxTuning(): void {
  Object.assign(cannonProjectileFxTuning, DEFAULT_CANNON_PROJECTILE_FX_TUNING);
}
