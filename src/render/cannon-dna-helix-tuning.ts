/** Live tuning for Current Cannon DNA helix lines (Leva + render loop). */

export interface CannonDnaHelixTuning {
  /** Full twists along the bolt length (0.5–16). */
  turns: number;
  strandCount: number;
  segments: number;
  /** Alternating helix radii in local bolt space (matches cylinder ~0.02–0.07). */
  radiusA: number;
  radiusB: number;
  /** 1 = evenly space strands around the cross-section; lower = tighter bunch. */
  phaseSpreadMul: number;

  timeTwistSpeed: number;
  timeTwistPerLevel: number;
  traveledTwistSpeed: number;
  traveledTwistPerLevel: number;

  wobbleAmplitude: number;
  wobbleTimeFreq: number;
  wobbleAxialFreq: number;
  wobbleStrandOffset: number;

  lineOpacity: number;
  lineRenderOrder: number;
  lineDepthWrite: boolean;
  blending: "additive" | "normal";

  color0: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
}

export const DEFAULT_CANNON_DNA_HELIX_TUNING: CannonDnaHelixTuning = {
  turns: 0.4,
  strandCount: 9,
  segments: 94,
  radiusA: 0.09,
  radiusB: 0.019,
  phaseSpreadMul: 1.41,

  timeTwistSpeed: 4.9,
  timeTwistPerLevel: 0,
  traveledTwistSpeed: 0,
  traveledTwistPerLevel: 0,

  wobbleAmplitude: 0.065,
  wobbleTimeFreq: 0.7,
  wobbleAxialFreq: 0,
  wobbleStrandOffset: 0,

  lineOpacity: 0.69,
  lineRenderOrder: 4,
  lineDepthWrite: false,
  blending: "additive",

  color0: "#66f0ff",
  color1: "#00d4ff",
  color2: "#a8b8ff",
  color3: "#55ffdd",
  color4: "#88eeff",
  color5: "#44ccff",
  color6: "#aac8ff",
  color7: "#66eedd",
};

export const cannonDnaHelixTuning: CannonDnaHelixTuning = {
  ...DEFAULT_CANNON_DNA_HELIX_TUNING,
};

export function getCannonDnaHelixTuning(): CannonDnaHelixTuning {
  return cannonDnaHelixTuning;
}

export function snapshotCannonDnaHelixTuning(): CannonDnaHelixTuning {
  return { ...cannonDnaHelixTuning };
}

export function cannonDnaHelixTuningToJSON(): string {
  return `${JSON.stringify(snapshotCannonDnaHelixTuning(), null, 2)}\n`;
}

export async function copyCannonDnaHelixTuningToClipboard(): Promise<boolean> {
  const text = cannonDnaHelixTuningToJSON();
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

export function resetCannonDnaHelixTuning(): void {
  Object.assign(cannonDnaHelixTuning, DEFAULT_CANNON_DNA_HELIX_TUNING);
}

/**
 * Opt-in dev panel: add `?cannonDna=1` to the URL (keeps HUD clean).
 */
export function shouldMountCannonDnaHelixLeva(): boolean {
  try {
    return new URLSearchParams(window.location.search).has("cannonDna");
  } catch {
    return false;
  }
}
