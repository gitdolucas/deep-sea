/**
 * Live tuning for Ink Veil aura (custom shaders + particles). Decoupled from
 * {@link vibration-dome-tuning} so Vibration Zone and Ink Veil can diverge.
 */
export type InkVeilSurfaceBlending = "normal" | "additive" | "multiply";

export interface InkVeilTuning {
  applyOverrides: boolean;

  floorYOffset: number;
  /** Local Y for disk vs dome/particles (small lift only; large values float the pool). */
  diskYOffset: number;

  diskSegments: number;
  domeWidthSegments: number;
  domeHeightSegments: number;

  renderOrderSurface: number;
  renderOrderParticles: number;

  wobbleEnabled: boolean;
  wobbleAmp: number;
  wobbleFreq: number;
  wobbleRadial: number;
  wobbleTimeScale: number;

  inkCoreColor: string;
  inkRimColor: string;
  particleColor: string;

  /** Per upgrade level (L1, L2, L3). */
  swirlSpeed: readonly [number, number, number];
  noiseScaleBase: number;
  noiseScalePerLevel: number;
  edgeSoftnessBase: number;
  edgeSoftnessPerLevel: number;
  opacityMul: readonly [number, number, number];
  ringHint: readonly [number, number, number];

  particlePointSizeMul: number;
  particleCount: readonly [number, number, number];
  /** `aR` lower bound for spawn ring (random adds up to `particleSpawnRRange`). */
  particleSpawnRMin: number;
  particleSpawnRRange: number;

  /** Vertex: `t = uTime * (lo + hash * range)`. */
  particleTimeLo: number;
  particleTimeRange: number;
  particleOrbitSpeed: number;
  /** Orbit radius multiplier vs `aR * uRadius`. */
  particleRadialTightness: number;
  particleWobbleFreq: number;
  particleWobblePhaseMul: number;
  /** Wobble displacement scale (multiplied by `uRadius`). */
  particleWobbleStr: number;
  particleLiftRate: number;
  /** Vertical spread `abs(sin) * uRadius * this`. */
  particleLiftAmp: number;
  /** Scales tangential wobble (perpendicular to radius), not radial push. */
  particleWobbleAlongOrbit: number;

  /** Per-vertex alpha: `lo + range * hash`. */
  particleAlphaLo: number;
  particleAlphaRange: number;

  particlePxBase: number;
  particlePxSpread: number;
  particlePxDepthScale: number;
  particlePxDepthRef: number;
  particlePxMin: number;
  particlePxMax: number;

  /** Fragment `smoothstep` on point UV radius. */
  particleSoftInner: number;
  particleSoftOuter: number;
  /** Final alpha multiplier on sprite. */
  particleOpacityMul: number;

  particleDepthWrite: boolean;
  particleDepthTest: boolean;
  particleBlending: InkVeilSurfaceBlending;

  surfaceDepthWrite: boolean;
  surfaceDepthTest: boolean;
  surfaceBlending: InkVeilSurfaceBlending;

  /** Fragment: view Fresnel on ink surface. */
  fresnelPow: number;
  /** Scales time in fbm drift (1 = shipped defaults). */
  noiseTimeScale: number;
  /** Multiplier on fbm displacement strength. */
  fbmStrength: number;
  swirlTierBase: number;
  swirlTierPerLevel: number;
  streakAngFreq: number;
  streakRadialFreq: number;
  streakTimeScale: number;
  /** Final alpha multiplier before clamp (disk+dome path). */
  alphaGlobal: number;
}

export const DEFAULT_INK_VEIL_TUNING: InkVeilTuning = {
  applyOverrides: true,

  floorYOffset: 0.28,
  diskYOffset: 0.5,

  diskSegments: 83,
  domeWidthSegments: 96,
  domeHeightSegments: 64,

  renderOrderSurface: 12,
  renderOrderParticles: -2,

  wobbleEnabled: true,
  wobbleAmp: 0.19,
  wobbleFreq: 4.05,
  wobbleRadial: 17.25,
  wobbleTimeScale: 1.05,

  inkCoreColor: "#050812",
  inkRimColor: "#7b2fff",
  particleColor: "#000000",

  swirlSpeed: [2, 2, 2],
  noiseScaleBase: 3,
  noiseScalePerLevel: 0.23,
  edgeSoftnessBase: 0.01,
  edgeSoftnessPerLevel: 0.09,
  opacityMul: [1.25, 2, 2],
  ringHint: [0.6, 0.55, 0.55],

  particlePointSizeMul: 0.05,
  particleCount: [113, 44, 64],
  particleSpawnRMin: 0.06,
  particleSpawnRRange: 0.85,

  particleTimeLo: 1.69,
  particleTimeRange: 0.4,
  particleOrbitSpeed: 0.6,
  particleRadialTightness: 1.01,
  particleWobbleFreq: 0.05,
  particleWobblePhaseMul: 6.25,
  particleWobbleStr: 0.11,
  particleLiftRate: 0.6,
  particleLiftAmp: 0.37,
  particleWobbleAlongOrbit: 0.1,

  particleAlphaLo: 0.19,
  particleAlphaRange: 0.17,

  particlePxBase: 24,
  particlePxSpread: 36,
  particlePxDepthScale: 180,
  particlePxDepthRef: 0.35,
  particlePxMin: 2,
  particlePxMax: 64,

  particleSoftInner: 0.49,
  particleSoftOuter: 0.5,
  particleOpacityMul: 1.71,

  particleDepthWrite: false,
  particleDepthTest: true,
  particleBlending: "multiply",

  surfaceDepthWrite: false,
  surfaceDepthTest: false,
  surfaceBlending: "additive",

  fresnelPow: 3,
  noiseTimeScale: 0.85,
  fbmStrength: 3,
  swirlTierBase: 0.2,
  swirlTierPerLevel: 0,
  streakAngFreq: 18,
  streakRadialFreq: 15,
  streakTimeScale: 8,
  alphaGlobal: 0.9,
};

function cloneTierTriples(d: InkVeilTuning): Pick<
  InkVeilTuning,
  "swirlSpeed" | "opacityMul" | "ringHint" | "particleCount"
> {
  return {
    swirlSpeed: [...d.swirlSpeed] as [number, number, number],
    opacityMul: [...d.opacityMul] as [number, number, number],
    ringHint: [...d.ringHint] as [number, number, number],
    particleCount: [...d.particleCount] as [number, number, number],
  };
}

export const inkVeilTuning: InkVeilTuning = {
  ...DEFAULT_INK_VEIL_TUNING,
  ...cloneTierTriples(DEFAULT_INK_VEIL_TUNING),
};

export function getInkVeilTuning(): InkVeilTuning {
  return inkVeilTuning;
}

export function snapshotInkVeilTuning(): InkVeilTuning {
  return { ...inkVeilTuning, ...cloneTierTriples(inkVeilTuning) };
}

export function inkVeilTuningToJSON(): string {
  return `${JSON.stringify(snapshotInkVeilTuning(), null, 2)}\n`;
}

export async function copyInkVeilTuningToClipboard(): Promise<boolean> {
  const text = inkVeilTuningToJSON();
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

export function resetInkVeilTuning(): void {
  const d = DEFAULT_INK_VEIL_TUNING;
  Object.assign(inkVeilTuning, d, cloneTierTriples(d));
}

/** Opt-in: `?ivTweak=1` */
export function shouldMountInkVeilLeva(): boolean {
  try {
    return new URLSearchParams(window.location.search).has("ivTweak");
  } catch {
    return false;
  }
}

/** Segment counts for aura rebuild key. */
export function inkVeilGeometryKey(t: InkVeilTuning): string {
  return `${t.diskSegments}:${t.domeWidthSegments}:${t.domeHeightSegments}`;
}
