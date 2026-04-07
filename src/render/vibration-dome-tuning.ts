import * as THREE from "three";
import type { InkVeilSurfaceBlending } from "./ink-veil-tuning.js";

export type VibrationDomeSide = "double" | "front" | "back";

/** Live tuning for Vibration Zone hemisphere + MeshPhysicalMaterial (Leva + game loop). */
export interface VibrationDomeTuning {
  applyOverrides: boolean;
  transmission: number;
  /** Multiplies simulator-tier base thickness. */
  thicknessScale: number;
  roughness: number;
  metalness: number;
  ior: number;
  opacity: number;
  depthWrite: boolean;
  side: VibrationDomeSide;
  renderOrder: number;
  dispersion: number;
  attenuationDistance: number;
  attenuationColor: string;
  baseColor: string;
  emissiveScale: number;
  emissiveIntensity: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
  geometryWidthSegments: number;
  geometryHeightSegments: number;
  showWireframe: boolean;
  transmissionResolutionScale: number;
  floorYOffset: number;
  /** Vertex wobble (vibration field look). */
  wobbleEnabled: boolean;
  /** Displacement strength in local units (scale with dome radius ~4–7). */
  wobbleAmp: number;
  /** Spatial frequency of the ripple pattern. */
  wobbleFreq: number;
  /** Radial wave density from the Y axis. */
  wobbleRadial: number;
  /** Multiplies elapsed time for animation speed. */
  wobbleTimeScale: number;
  /** Rim Fresnel (shader): edge falloff exponent. */
  fresnelPower: number;
  /** Rim Fresnel strength (additive to outgoing light). */
  fresnelIntensity: number;
  /** Rim tint (hex). */
  fresnelColor: string;

  /** Soft horizontal disk on the seabed (under the transmission dome). */
  baseDiskEnabled: boolean;
  baseDiskSegments: number;
  baseDiskYOffset: number;
  baseDiskColor: string;
  baseDiskOpacity: number;
  baseDiskEdgeSoftness: number;
  baseDiskDepthWrite: boolean;
  baseDiskDepthTest: boolean;
  baseDiskBlending: InkVeilSurfaceBlending;
  baseDiskRenderOrder: number;
  /** View-angle rim tint (`mix(fill, rimColor, fresnel * intensity)`). */
  baseDiskRimColor: string;
  baseDiskRimIntensity: number;
  baseDiskRimPower: number;
  /** Edge profile: `smoothstep(1 - edgeSoft * innerK, 1 + edgeSoft * outerK, r)`. */
  baseDiskEdgeInnerK: number;
  baseDiskEdgeOuterK: number;
  /** Discard when `r > 1 + edgeSoft * discardK`. */
  baseDiskEdgeDiscardK: number;
  /** 0–1: fades fill alpha toward disk center (ring / donut). */
  baseDiskCenterHole: number;
  /** Inner radius (0–1) where center hole fade starts. */
  baseDiskCenterHoleRadius: number;

  /**
   * Ink-style fbm / swirl / streaks on the base disk (see `vibration-zone-field` shaders).
   * Tier indices match defense level (L1→[0], L3→[2]).
   */
  baseDiskSwirlSpeed: readonly [number, number, number];
  baseDiskOpacityMul: readonly [number, number, number];
  baseDiskRingHint: readonly [number, number, number];
  baseDiskNoiseScaleBase: number;
  baseDiskNoiseScalePerLevel: number;
  baseDiskFresnelPow: number;
  baseDiskNoiseTimeScale: number;
  baseDiskFbmStrength: number;
  baseDiskSwirlTierBase: number;
  baseDiskSwirlTierPerLevel: number;
  baseDiskStreakAngFreq: number;
  baseDiskStreakRadialFreq: number;
  baseDiskStreakTimeScale: number;
  /** Extra alpha gain on procedural disk (1 = match ink pipeline scale). */
  baseDiskProcAlphaGlobal: number;

  fieldParticlesEnabled: boolean;
  fieldParticleRenderOrder: number;
  /** Local Y for particle burst origin (raises/lowers field relative to rim center). */
  fieldParticleYOffset: number;
  fieldParticleCount: readonly [number, number, number];
  fieldParticleColor: string;
  fieldParticlePointSizeMul: number;
  /** @deprecated Center-origin pulse ignores ring spawn; kept for JSON compat. */
  fieldParticleSpawnRMin: number;
  fieldParticleSpawnRRange: number;
  /** Multiplier on `uTime` per particle (phase spread). */
  fieldParticleTimeLo: number;
  fieldParticleTimeRange: number;
  /** Radial pulse speed: cos envelope to dome shell and back (see field vertex shader). */
  fieldParticleOrbitSpeed: number;
  /** 1 ≈ touch hemisphere wireframe at `uRadius`; <1 stays inside shell. */
  fieldParticleRadialTightness: number;
  /** Transverse/Shell ripple frequency (perpendicular to outward ray). */
  fieldParticleWobbleFreq: number;
  fieldParticleWobblePhaseMul: number;
  /** Per-particle random variation on radial reach (0 = none). */
  fieldParticleWobbleStr: number;
  /** Slow temporal noise on pulse amplitude. */
  fieldParticleLiftRate: number;
  /** Shell wobble strength (orthogonal, scales with pulse). */
  fieldParticleLiftAmp: number;
  /** Random direction jitter (0–~0.35) before normalize — spreads XYZ. */
  fieldParticleWobbleAlongOrbit: number;
  fieldParticleAlphaLo: number;
  fieldParticleAlphaRange: number;
  fieldParticlePxBase: number;
  fieldParticlePxSpread: number;
  fieldParticlePxDepthScale: number;
  fieldParticlePxDepthRef: number;
  fieldParticlePxMin: number;
  fieldParticlePxMax: number;
  fieldParticleSoftInner: number;
  fieldParticleSoftOuter: number;
  fieldParticleOpacityMul: number;
  fieldParticleDepthWrite: boolean;
  fieldParticleDepthTest: boolean;
  fieldParticleBlending: InkVeilSurfaceBlending;
}

export const DEFAULT_VIBRATION_DOME_TUNING: VibrationDomeTuning = {
  applyOverrides: true,
  transmission: 1,
  thicknessScale: 1.85,
  roughness: 0,
  metalness: 0,
  ior: 1,
  opacity: 0.12,
  depthWrite: false,
  side: "double",
  renderOrder: 2,
  dispersion: 0.94,
  attenuationDistance: 40,
  attenuationColor: "#33cc5e",
  baseColor: "#ffffff",
  emissiveScale: 0.4,
  emissiveIntensity: 3,
  clearcoat: 0,
  clearcoatRoughness: 1,
  envMapIntensity: 1.15,
  geometryWidthSegments: 96,
  geometryHeightSegments: 48,
  showWireframe: false,
  transmissionResolutionScale: 0.67,
  floorYOffset: -0.5,
  wobbleEnabled: true,
  wobbleAmp: 0.51,
  wobbleFreq: 3.8,
  wobbleRadial: 12.5,
  wobbleTimeScale: 0.95,
  fresnelPower: 12,
  fresnelIntensity: 1.5,
  fresnelColor: "#39ff6e",

  baseDiskEnabled: true,
  baseDiskSegments: 19,
  baseDiskYOffset: 0.92,
  baseDiskColor: "#000000",
  baseDiskOpacity: 0.43,
  baseDiskEdgeSoftness: 0.02,
  baseDiskDepthWrite: false,
  baseDiskDepthTest: true,
  baseDiskBlending: "additive",
  baseDiskRenderOrder: -1,
  baseDiskRimColor: "#ffffff",
  baseDiskRimIntensity: 1.5,
  baseDiskRimPower: 9.25,
  baseDiskEdgeInnerK: 6,
  baseDiskEdgeOuterK: 1.95,
  baseDiskEdgeDiscardK: 4,
  baseDiskCenterHole: 0,
  baseDiskCenterHoleRadius: 0.95,

  baseDiskSwirlSpeed: [0, 3.3, 3.7],
  baseDiskOpacityMul: [0.86, 1.02, 1.12],
  baseDiskRingHint: [0.66, 0.42, 0.46],
  baseDiskNoiseScaleBase: 1.6,
  baseDiskNoiseScalePerLevel: 0,
  baseDiskFresnelPow: 1.9,
  baseDiskNoiseTimeScale: 1.3,
  baseDiskFbmStrength: 2.45,
  baseDiskSwirlTierBase: 0.34,
  baseDiskSwirlTierPerLevel: 0.075,
  baseDiskStreakAngFreq: 5.5,
  baseDiskStreakRadialFreq: 2,
  baseDiskStreakTimeScale: 5.5,
  baseDiskProcAlphaGlobal: 0.72,

  fieldParticlesEnabled: true,
  fieldParticleRenderOrder: 3,
  fieldParticleYOffset: 1.38,
  fieldParticleCount: [233, 56, 72],
  fieldParticleColor: "#daff96",
  fieldParticlePointSizeMul: 0.05,
  fieldParticleSpawnRMin: 0.18,
  fieldParticleSpawnRRange: 0.78,
  fieldParticleTimeLo: 0.15,
  fieldParticleTimeRange: 0.02,
  fieldParticleOrbitSpeed: 14,
  fieldParticleRadialTightness: 0.78,
  fieldParticleWobbleFreq: 16,
  fieldParticleWobblePhaseMul: 0,
  fieldParticleWobbleStr: 0.145,
  fieldParticleLiftRate: 8,
  fieldParticleLiftAmp: 0.015,
  fieldParticleWobbleAlongOrbit: 0.45,
  fieldParticleAlphaLo: 0.28,
  fieldParticleAlphaRange: 0.42,
  fieldParticlePxBase: 0,
  fieldParticlePxSpread: 60,
  fieldParticlePxDepthScale: 175,
  fieldParticlePxDepthRef: 0.35,
  fieldParticlePxMin: 2,
  fieldParticlePxMax: 58,
  fieldParticleSoftInner: 0.22,
  fieldParticleSoftOuter: 0.48,
  fieldParticleOpacityMul: 0.18,
  fieldParticleDepthWrite: false,
  fieldParticleDepthTest: true,
  fieldParticleBlending: "additive",
};

const TINT = new THREE.Color(0x39ff6e);

function cloneFieldParticleCount(
  d: VibrationDomeTuning,
): Pick<VibrationDomeTuning, "fieldParticleCount"> {
  return {
    fieldParticleCount: [...d.fieldParticleCount] as [number, number, number],
  };
}

function cloneBaseDiskTierTriples(
  d: VibrationDomeTuning,
): Pick<
  VibrationDomeTuning,
  "baseDiskSwirlSpeed" | "baseDiskOpacityMul" | "baseDiskRingHint"
> {
  return {
    baseDiskSwirlSpeed: [...d.baseDiskSwirlSpeed] as [number, number, number],
    baseDiskOpacityMul: [...d.baseDiskOpacityMul] as [number, number, number],
    baseDiskRingHint: [...d.baseDiskRingHint] as [number, number, number],
  };
}

export const vibrationDomeTuning: VibrationDomeTuning = {
  ...DEFAULT_VIBRATION_DOME_TUNING,
  ...cloneFieldParticleCount(DEFAULT_VIBRATION_DOME_TUNING),
  ...cloneBaseDiskTierTriples(DEFAULT_VIBRATION_DOME_TUNING),
};

export function getVibrationDomeTuning(): VibrationDomeTuning {
  return vibrationDomeTuning;
}

/** Plain snapshot for logging / clipboard (not the live mutable reference). */
export function snapshotVibrationDomeTuning(): VibrationDomeTuning {
  return {
    ...vibrationDomeTuning,
    ...cloneFieldParticleCount(vibrationDomeTuning),
    ...cloneBaseDiskTierTriples(vibrationDomeTuning),
  };
}

/** Pretty-printed JSON of {@link snapshotVibrationDomeTuning}. */
export function vibrationDomeTuningToJSON(): string {
  return `${JSON.stringify(snapshotVibrationDomeTuning(), null, 2)}\n`;
}

export async function copyVibrationDomeTuningToClipboard(): Promise<boolean> {
  const text = vibrationDomeTuningToJSON();
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

export function resetVibrationDomeTuning(): void {
  const d = DEFAULT_VIBRATION_DOME_TUNING;
  Object.assign(vibrationDomeTuning, d, cloneFieldParticleCount(d), cloneBaseDiskTierTriples(d));
}

function sideToConstant(side: VibrationDomeSide): number {
  switch (side) {
    case "front":
      return THREE.FrontSide;
    case "back":
      return THREE.BackSide;
    default:
      return THREE.DoubleSide;
  }
}

/**
 * Overlay Leva values on the dome material. Tier thickness must already be in
 * `mesh.userData.tierThickness` from {@link syncVibrationZoneDomeTierMaterial}.
 */
export function applyVibrationDomeTuningToMesh(
  mesh: THREE.Mesh,
  t: VibrationDomeTuning,
): void {
  if (!t.applyOverrides) return;
  const mat = mesh.material as THREE.MeshPhysicalMaterial;
  const tierT = Number(mesh.userData.tierThickness ?? mat.thickness);
  mat.transmission = t.transmission;
  mat.thickness = Math.max(0.01, tierT * t.thicknessScale);
  mat.roughness = t.roughness;
  mat.metalness = t.metalness;
  mat.ior = t.ior;
  mat.opacity = t.opacity;
  mat.transparent = t.opacity < 1;
  mat.depthWrite = t.depthWrite;
  mat.side = sideToConstant(t.side);
  mesh.renderOrder = t.renderOrder;
  mat.dispersion = t.dispersion;
  mat.attenuationDistance = t.attenuationDistance;
  mat.attenuationColor.set(t.attenuationColor);
  mat.color.set(t.baseColor);
  mat.emissive = TINT.clone().multiplyScalar(t.emissiveScale);
  mat.emissiveIntensity = t.emissiveIntensity;
  mat.clearcoat = t.clearcoat;
  mat.clearcoatRoughness = t.clearcoatRoughness;
  mat.envMapIntensity = t.envMapIntensity;
}

/**
 * Leva is opt-in only (keeps HUD clean). Add `?vzTweak=1` to the URL to show
 * the Vibration Zone dome tuning panel.
 */
export function shouldMountVibrationDomeLeva(): boolean {
  try {
    return new URLSearchParams(window.location.search).has("vzTweak");
  } catch {
    return false;
  }
}
