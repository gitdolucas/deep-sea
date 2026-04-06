/**
 * Tunable Current Cannon **visual** FX: enemy lift offset + impact column (Leva + render).
 * Gameplay stun duration stays in `combat-balance.ts` (`CANNON_HIT_STUN_LIFT_SEC`); column VFX duration may be longer (linger).
 */

export interface CannonLiftFxTuning {
  /** Max world Y added to enemy root during cannon lift. */
  peakWorldY: number;
  /** Ease-in duration (seconds) from 0 → peak. */
  riseSec: number;
  /** Ease-out duration (seconds) from peak → 0 at end of lift window. */
  fallSec: number;
  /** Max twist amplitude (radians) on each local axis while airborne. */
  twistAmpX: number;
  twistAmpY: number;
  twistAmpZ: number;
  /** Angular velocity (rad/s) driving sin/cos wobble per axis. */
  twistFreqX: number;
  twistFreqY: number;
  twistFreqZ: number;
}

export interface CannonColumnHitFxTuning {
  /** Total effect duration (usually matches stun; can differ for VFX-only stretch). */
  durationSec: number;
  /** Cylinder height (world units) at full growth. */
  height: number;
  /** Ground Y offset above cell base. */
  baseYOffset: number;
  /** Bottom radius of the hollow column (world units). */
  radiusBottom: number;
  /** Top radius before flare (world units). */
  radiusTop: number;
  /** Extra radial expansion at the top when `uOpen` = 1 (splash lip). */
  flareRadius: number;
  /** Normalized age (0–1) when vertical growth finishes. */
  growEndFrac: number;
  /** Normalized age when outward flare begins. */
  openStartFrac: number;
  /** Radial segments (smoothness of the lip). */
  radialSegments: number;
  /** Height segments (vertical smoothness for flare curve). */
  heightSegments: number;
  /** Spoke / line count for the “opening” rim pattern. */
  rimSpokeCount: number;
  /** Strength of rim spokes (0–1). */
  rimSpokeStrength: number;
  /** Shader time multiplier for ripple along column. */
  pulseSpeed: number;
  /** UV.y where outward flare begins (0–1). */
  flareCurveStart: number;
}

export const DEFAULT_CANNON_LIFT_FX_TUNING: CannonLiftFxTuning = {
  peakWorldY: 1.34,
  riseSec: 0.36,
  fallSec: 0.195,
  twistAmpX: 0.83,
  twistAmpY: 1,
  twistAmpZ: 0.16,
  twistFreqX: 7.5,
  twistFreqY: 14,
  twistFreqZ: 21,
};

export const DEFAULT_CANNON_COLUMN_HIT_FX_TUNING: CannonColumnHitFxTuning = {
  durationSec: 0.95,
  height: 1.15,
  baseYOffset: 0.1,
  radiusBottom: 0.12,
  radiusTop: 0.385,
  flareRadius: 1.3,
  growEndFrac: 0.15,
  openStartFrac: 0.09,
  rimSpokeCount: 41,
  rimSpokeStrength: 0.53,
  radialSegments: 19,
  heightSegments: 22,
  pulseSpeed: 3,
  flareCurveStart: 0.54,
};

export const cannonLiftFxTuning: CannonLiftFxTuning = {
  ...DEFAULT_CANNON_LIFT_FX_TUNING,
};

export const cannonColumnHitFxTuning: CannonColumnHitFxTuning = {
  ...DEFAULT_CANNON_COLUMN_HIT_FX_TUNING,
};

export function getCannonLiftFxTuning(): CannonLiftFxTuning {
  return cannonLiftFxTuning;
}

export function getCannonColumnHitFxTuning(): CannonColumnHitFxTuning {
  return cannonColumnHitFxTuning;
}

export function snapshotCannonHitFxTuning(): {
  lift: CannonLiftFxTuning;
  column: CannonColumnHitFxTuning;
} {
  return {
    lift: { ...cannonLiftFxTuning },
    column: { ...cannonColumnHitFxTuning },
  };
}

export function cannonHitFxTuningToJSON(): string {
  return `${JSON.stringify(snapshotCannonHitFxTuning(), null, 2)}\n`;
}

export async function copyCannonHitFxTuningToClipboard(): Promise<boolean> {
  const text = cannonHitFxTuningToJSON();
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

export function resetCannonHitFxTuning(): void {
  Object.assign(cannonLiftFxTuning, DEFAULT_CANNON_LIFT_FX_TUNING);
  Object.assign(cannonColumnHitFxTuning, DEFAULT_CANNON_COLUMN_HIT_FX_TUNING);
}
