/** Per-preset bubble column VFX (Leva + render). */

export interface BubbleColumnPresetTuning {
  /** Multiplies base preset particle count from code. */
  particleCountMul: number;
  lengthMul: number;
  radiusMul: number;
  durationMul: number;
  baseY: number;
  wobble: number;
  /** Max upward drift in world Y over the column lifetime (after release). */
  worldRiseMax: number;
  /** Ease curve for rise (higher = waits longer then shoots up). */
  risePow: number;
  /** Stagger: particles wait up to this fraction of `uAge` before full motion (0 = simultaneous). */
  releaseLag: number;
  /** Along-column undulation frequency / strength. */
  columnNoiseFreq: number;
  columnNoiseAmp: number;
  /** Separate higher-frequency noise for “bubble release” feel. */
  releaseNoiseFreq: number;
  releaseNoiseAmp: number;
  /** Point sprite sizing (same semantics as Bubble Shotgun cluster). */
  pointSizeMul: number;
  pointSizeBase: number;
  pointSizePhaseMul: number;
  pointSizeCamDiv: number;
  pointSizeZMin: number;
  pointSizeClampMin: number;
  pointSizeClampMax: number;
  /** Shrinks sprites as column effect ages (0–1). */
  pointAgeFade: number;
  /** Extra spread: small bubbles at bottom vs top of column (along). */
  pointAlongSpread: number;
  colorCore: string;
  colorRim: string;
  renderOrder: number;
  depthWrite: boolean;
  blending: "normal" | "additive";
}

export interface BubbleColumnFxTuning {
  /** When false, column renderer uses inline defaults only. */
  applyOverrides: boolean;
  muzzle: BubbleColumnPresetTuning;
  impact: BubbleColumnPresetTuning;
  impactSplash: BubbleColumnPresetTuning;
}

const preset = (o: Partial<BubbleColumnPresetTuning> & { particleCountMul: number }): BubbleColumnPresetTuning => ({
  particleCountMul: o.particleCountMul,
  lengthMul: o.lengthMul ?? 1,
  radiusMul: o.radiusMul ?? 1,
  durationMul: o.durationMul ?? 1,
  baseY: o.baseY ?? 0.37,
  wobble: o.wobble ?? 0.024,
  worldRiseMax: o.worldRiseMax ?? 0.55,
  risePow: o.risePow ?? 1.25,
  releaseLag: o.releaseLag ?? 0.45,
  columnNoiseFreq: o.columnNoiseFreq ?? 2.1,
  columnNoiseAmp: o.columnNoiseAmp ?? 0.085,
  releaseNoiseFreq: o.releaseNoiseFreq ?? 7.0,
  releaseNoiseAmp: o.releaseNoiseAmp ?? 0.12,
  pointSizeMul: o.pointSizeMul ?? 20,
  pointSizeBase: o.pointSizeBase ?? 0.82,
  pointSizePhaseMul: o.pointSizePhaseMul ?? 0.36,
  pointSizeCamDiv: o.pointSizeCamDiv ?? 300,
  pointSizeZMin: o.pointSizeZMin ?? 0.12,
  pointSizeClampMin: o.pointSizeClampMin ?? 2,
  pointSizeClampMax: o.pointSizeClampMax ?? 180,
  pointAgeFade: o.pointAgeFade ?? 0.38,
  pointAlongSpread: o.pointAlongSpread ?? 0.14,
  colorCore: o.colorCore ?? "#3a9cc8",
  colorRim: o.colorRim ?? "#b2f4ff",
  renderOrder: o.renderOrder ?? 3,
  depthWrite: o.depthWrite ?? false,
  blending: o.blending ?? "normal",
});

/** Shot origin column — lower density, stronger column noise vs impact. */
const DEFAULT_BUBBLE_COLUMN_MUZZLE: Partial<BubbleColumnPresetTuning> & {
  particleCountMul: number;
} = {
  particleCountMul: 0.45,
  lengthMul: 0.6,
  radiusMul: 5,
  durationMul: 8,
  baseY: 0.54,
  wobble: 0.35,
  worldRiseMax: 4,
  risePow: 1.5,
  releaseLag: 0.1,
  columnNoiseFreq: 3.5,
  columnNoiseAmp: 0.475,
  releaseNoiseFreq: 6,
  releaseNoiseAmp: 0.22,
  pointSizeMul: 4.5,
  pointSizeBase: 0.2,
  pointSizePhaseMul: 0.22,
  pointSizeCamDiv: 340,
  pointSizeZMin: 0.2,
  pointSizeClampMin: 6,
  pointSizeClampMax: 96,
  pointAgeFade: 0.95,
  pointAlongSpread: 0.61,
  colorCore: "#d4eefa",
  colorRim: "#ffffff",
  renderOrder: 3,
  depthWrite: false,
  blending: "normal",
};

/** Hit + L3 splash columns (same tuning). */
const DEFAULT_BUBBLE_COLUMN_IMPACT: Partial<BubbleColumnPresetTuning> & {
  particleCountMul: number;
} = {
  particleCountMul: 4.45,
  lengthMul: 0.6,
  radiusMul: 5,
  durationMul: 8,
  baseY: 0.54,
  wobble: 0.35,
  worldRiseMax: 4,
  risePow: 1.5,
  releaseLag: 0.1,
  columnNoiseFreq: 3.5,
  columnNoiseAmp: 0.08,
  releaseNoiseFreq: 6,
  releaseNoiseAmp: 0.035,
  pointSizeMul: 4.5,
  pointSizeBase: 0.2,
  pointSizePhaseMul: 0.22,
  pointSizeCamDiv: 340,
  pointSizeZMin: 0.2,
  pointSizeClampMin: 6,
  pointSizeClampMax: 96,
  pointAgeFade: 0.95,
  pointAlongSpread: 0.61,
  colorCore: "#d4eefa",
  colorRim: "#ffffff",
  renderOrder: 3,
  depthWrite: false,
  blending: "normal",
};

/** Shipped defaults (tunable via `?bubbleFx=1` → Bubble column). */
export const DEFAULT_BUBBLE_COLUMN_FX_TUNING: BubbleColumnFxTuning = {
  applyOverrides: true,
  muzzle: preset({ ...DEFAULT_BUBBLE_COLUMN_MUZZLE }),
  impact: preset({ ...DEFAULT_BUBBLE_COLUMN_IMPACT }),
  impactSplash: preset({ ...DEFAULT_BUBBLE_COLUMN_IMPACT }),
};

export const bubbleColumnFxTuning: BubbleColumnFxTuning = {
  ...DEFAULT_BUBBLE_COLUMN_FX_TUNING,
};

export function getBubbleColumnFxTuning(): BubbleColumnFxTuning {
  return bubbleColumnFxTuning;
}

export function snapshotBubbleColumnFxTuning(): BubbleColumnFxTuning {
  return {
    applyOverrides: bubbleColumnFxTuning.applyOverrides,
    muzzle: { ...bubbleColumnFxTuning.muzzle },
    impact: { ...bubbleColumnFxTuning.impact },
    impactSplash: { ...bubbleColumnFxTuning.impactSplash },
  };
}

export function bubbleColumnFxTuningToJSON(): string {
  return `${JSON.stringify(snapshotBubbleColumnFxTuning(), null, 2)}\n`;
}

export async function copyBubbleColumnFxTuningToClipboard(): Promise<boolean> {
  const text = bubbleColumnFxTuningToJSON();
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

export function resetBubbleColumnFxTuning(): void {
  bubbleColumnFxTuning.applyOverrides =
    DEFAULT_BUBBLE_COLUMN_FX_TUNING.applyOverrides;
  bubbleColumnFxTuning.muzzle = { ...DEFAULT_BUBBLE_COLUMN_FX_TUNING.muzzle };
  bubbleColumnFxTuning.impact = { ...DEFAULT_BUBBLE_COLUMN_FX_TUNING.impact };
  bubbleColumnFxTuning.impactSplash = {
    ...DEFAULT_BUBBLE_COLUMN_FX_TUNING.impactSplash,
  };
}
