/** Live tuning for Bubble Shotgun cluster + pop rings (Leva + render loop). */

export interface BubbleAttackFxTuning {
  /** Bump (or use Rebuild button) so pooled point clouds pick up shape/count changes. */
  geometryRev: number;

  // —— Cluster shape (CPU) ——
  clusterCount: number;
  dropR: number;
  dropTail: number;
  dropYHalf: number;
  /** Lower = more particles in the forward bulb (try 0.2–0.5). */
  headBiasExponent: number;

  // —— Motion (world sync) ——
  bobBase: number;
  bobAmp: number;
  bobTimeScale: number;
  bobIndexSpread: number;
  bobTravelPhase: number;
  scaleSplashMul: number;
  scalePulseAmp: number;
  scalePulseTime: number;
  scaleTravelPhase: number;

  // —— Points material ——
  renderOrder: number;
  depthWrite: boolean;
  /** "normal" | "additive" */
  blending: "normal" | "additive";

  // —— Vertex / point sprite ——
  wobbleAmp: number;
  wobbleFreqX: number;
  wobbleFreqY: number;
  wobbleFreqZ: number;
  wobbleAmpYMul: number;
  wobbleAmpZMul: number;
  pointSizeMul: number;
  pointSizeBase: number;
  pointSizePhaseMul: number;
  pointSizeCamDiv: number;
  pointSizeZMin: number;
  pointSizeClampMin: number;
  pointSizeClampMax: number;

  // —— Fragment bubble look ——
  colorCore: string;
  colorRim: string;
  colorCoreL3: string;
  colorRimL3: string;
  coreSmoothOuter: number;
  coreSmoothInner: number;
  rimInner0: number;
  rimInner1: number;
  rimOuter0: number;
  rimOuter1: number;
  rimColorMix: number;
  alphaCore: number;
  alphaRim: number;
  alphaBodyMin: number;
  alphaCoreBoost: number;
  alphaMax: number;
  twinkleBase: number;
  twinkleAmp: number;
  twinklePhaseMul: number;
  twinkleD: number;

  // —— Pop rings ——
  popDuration: number;
  popDurationSplash: number;
  ringInner: number;
  ringOuter: number;
  ringInnerSplash: number;
  ringOuterSplash: number;
  ringColor: string;
  ringColorSplash: string;
  ringOpacity: number;
  ringScaleGrowth: number;
  ringSegments: number;
}

/** Defaults synced from tuned Leva preset (geometryRev is runtime-only). */
export const DEFAULT_BUBBLE_ATTACK_FX_TUNING: BubbleAttackFxTuning = {
  geometryRev: 0,

  clusterCount: 13,
  dropR: 0.04,
  dropTail: 0.45,
  dropYHalf: 0.12,
  headBiasExponent: 0.37,

  bobBase: 0.55,
  bobAmp: 0.15,
  bobTimeScale: 3,
  bobIndexSpread: 0.45,
  bobTravelPhase: 0,
  scaleSplashMul: 1.6,
  scalePulseAmp: 0.19,
  scalePulseTime: 1.75,
  scaleTravelPhase: 0,

  renderOrder: 4,
  depthWrite: false,
  blending: "normal",

  wobbleAmp: 0.0195,
  wobbleFreqX: 0,
  wobbleFreqY: 10.5,
  wobbleFreqZ: 8.5,
  wobbleAmpYMul: 1.5,
  wobbleAmpZMul: 0,
  pointSizeMul: 4,
  pointSizeBase: 0.2,
  pointSizePhaseMul: 0.22,
  pointSizeCamDiv: 250,
  pointSizeZMin: 0.23,
  pointSizeClampMin: 7.5,
  pointSizeClampMax: 246,

  colorCore: "#3aa8cc",
  colorRim: "#b8f8ff",
  colorCoreL3: "#28b8e8",
  colorRimL3: "#66ffff",

  coreSmoothOuter: 0.63,
  coreSmoothInner: 0.41,
  rimInner0: 0.68,
  rimInner1: 0.9,
  rimOuter0: 1.02,
  rimOuter1: 0.86,
  rimColorMix: 1.05,
  alphaCore: 0.32,
  alphaRim: 0.95,
  alphaBodyMin: 0.72,
  alphaCoreBoost: 0.28,
  alphaMax: 0.92,
  twinkleBase: 0.97,
  twinkleAmp: 0.14,
  twinklePhaseMul: 40.783,
  twinkleD: 17,

  popDuration: 0.39,
  popDurationSplash: 0.3,
  ringInner: 0.05,
  ringOuter: 0.32,
  ringInnerSplash: 0.1,
  ringOuterSplash: 0.5,
  ringColor: "#aaeeff",
  ringColorSplash: "#55ffff",
  ringOpacity: 0.88,
  ringScaleGrowth: 1.85,
  ringSegments: 26,
};

export const bubbleAttackFxTuning: BubbleAttackFxTuning = {
  ...DEFAULT_BUBBLE_ATTACK_FX_TUNING,
};

export function getBubbleAttackFxTuning(): BubbleAttackFxTuning {
  return bubbleAttackFxTuning;
}

export function snapshotBubbleAttackFxTuning(): BubbleAttackFxTuning {
  return { ...bubbleAttackFxTuning };
}

export function bubbleAttackFxTuningToJSON(): string {
  return `${JSON.stringify(snapshotBubbleAttackFxTuning(), null, 2)}\n`;
}

export async function copyBubbleAttackFxTuningToClipboard(): Promise<boolean> {
  const text = bubbleAttackFxTuningToJSON();
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

export function resetBubbleAttackFxTuning(): void {
  Object.assign(bubbleAttackFxTuning, DEFAULT_BUBBLE_ATTACK_FX_TUNING);
}

export function bumpBubbleAttackFxGeometryRev(): void {
  bubbleAttackFxTuning.geometryRev++;
}

/**
 * Opt-in dev panel: add `?bubbleFx=1` to the URL (keeps HUD clean).
 */
export function shouldMountBubbleAttackFxLeva(): boolean {
  try {
    return new URLSearchParams(window.location.search).has("bubbleFx");
  } catch {
    return false;
  }
}
