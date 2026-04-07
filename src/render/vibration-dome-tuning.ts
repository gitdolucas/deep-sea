import * as THREE from "three";

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
  transmissionResolutionScale: 0.82,
  floorYOffset: -0.5,
  wobbleEnabled: true,
  wobbleAmp: 0.55,
  wobbleFreq: 3.8,
  wobbleRadial: 12.5,
  wobbleTimeScale: 0.95,
  fresnelPower: 12,
  fresnelIntensity: 1.5,
  fresnelColor: "#39ff6e",
};

const TINT = new THREE.Color(0x39ff6e);

export const vibrationDomeTuning: VibrationDomeTuning = {
  ...DEFAULT_VIBRATION_DOME_TUNING,
};

export function getVibrationDomeTuning(): VibrationDomeTuning {
  return vibrationDomeTuning;
}

/** Plain snapshot for logging / clipboard (not the live mutable reference). */
export function snapshotVibrationDomeTuning(): VibrationDomeTuning {
  return { ...vibrationDomeTuning };
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
  Object.assign(vibrationDomeTuning, DEFAULT_VIBRATION_DOME_TUNING);
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
