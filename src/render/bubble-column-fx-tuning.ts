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
  colorCore: o.colorCore ?? "#3a9cc8",
  colorRim: o.colorRim ?? "#b2f4ff",
  renderOrder: o.renderOrder ?? 3,
  depthWrite: o.depthWrite ?? false,
  blending: o.blending ?? "normal",
});

export const DEFAULT_BUBBLE_COLUMN_FX_TUNING: BubbleColumnFxTuning = {
  applyOverrides: true,
  muzzle: preset({
    particleCountMul: 1,
    lengthMul: 1,
    radiusMul: 1,
    durationMul: 1,
    baseY: 0.38,
    wobble: 0.024,
    worldRiseMax: 0.62,
    risePow: 1.15,
    releaseLag: 0.35,
    columnNoiseFreq: 2.0,
    columnNoiseAmp: 0.08,
    releaseNoiseFreq: 5.5,
    releaseNoiseAmp: 0.1,
    colorCore: "#3a9cc8",
    colorRim: "#b2f4ff",
  }),
  impact: preset({
    particleCountMul: 1,
    lengthMul: 1,
    radiusMul: 1,
    durationMul: 1,
    baseY: 0.36,
    wobble: 0.028,
    worldRiseMax: 0.48,
    risePow: 1.35,
    releaseLag: 0.55,
    columnNoiseFreq: 2.4,
    columnNoiseAmp: 0.09,
    releaseNoiseFreq: 9.0,
    releaseNoiseAmp: 0.16,
    colorCore: "#3a9cc8",
    colorRim: "#b2f4ff",
  }),
  impactSplash: preset({
    particleCountMul: 1,
    lengthMul: 1,
    radiusMul: 1,
    durationMul: 1,
    baseY: 0.36,
    wobble: 0.032,
    worldRiseMax: 0.72,
    risePow: 1.2,
    releaseLag: 0.42,
    columnNoiseFreq: 2.6,
    columnNoiseAmp: 0.1,
    releaseNoiseFreq: 10.5,
    releaseNoiseAmp: 0.18,
    colorCore: "#22a8dd",
    colorRim: "#66ffff",
  }),
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
