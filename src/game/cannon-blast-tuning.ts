/**
 * Tunable Current Cannon **ground splash** decal (Leva + render).
 */

export interface CannonBlastFxTuning {
  /** Full effect length (seconds). */
  durationSec: number;
  /** World Y of the decal above the cell base. */
  groundYOffset: number;
  /** Minimum world radius (also clamps small splash radii from gameplay). */
  minRadiusWorld: number;
  /** Tessellation of the blast disk. */
  circleSegments: number;
  /** Fade curve: `fade = 1 - k ** fadeExponent` over lifetime. */
  fadeExponent: number;
}

export const DEFAULT_CANNON_BLAST_FX_TUNING: CannonBlastFxTuning = {
  durationSec: 0.62,
  groundYOffset: 0.24,
  minRadiusWorld: 0.23,
  circleSegments: 30,
  fadeExponent: 2.8,
};

export const cannonBlastFxTuning: CannonBlastFxTuning = {
  ...DEFAULT_CANNON_BLAST_FX_TUNING,
};

export function getCannonBlastFxTuning(): CannonBlastFxTuning {
  return cannonBlastFxTuning;
}

export function snapshotCannonBlastFxTuning(): CannonBlastFxTuning {
  return { ...cannonBlastFxTuning };
}

export function cannonBlastFxTuningToJSON(): string {
  return `${JSON.stringify(snapshotCannonBlastFxTuning(), null, 2)}\n`;
}

export async function copyCannonBlastFxTuningToClipboard(): Promise<boolean> {
  const text = cannonBlastFxTuningToJSON();
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

export function resetCannonBlastFxTuning(): void {
  Object.assign(cannonBlastFxTuning, DEFAULT_CANNON_BLAST_FX_TUNING);
}
