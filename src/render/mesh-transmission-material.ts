/**
 * Physically based transmission for the Vibration Zone dome using Three.js r183
 * {@link THREE.MeshPhysicalMaterial} (engine-managed transmission framebuffer).
 *
 * Drei's historical MeshTransmissionMaterial patched shader chunks for older three
 * versions; modern three ships bicubic sampling + dispersion in the transmission
 * path, so we tune MeshPhysicalMaterial directly instead of copying fragile
 * onBeforeCompile replaces. See pmndrs/drei (MIT) and N8Programs' prior art:
 * https://github.com/pmndrs/drei — conceptually similar look, simpler integration.
 */

import * as THREE from "three";
import type { DefenseLevel } from "../game/types.js";
import { attachVibrationDomeVertexWobble } from "./vibration-dome-wobble-shader.js";

const TINT = new THREE.Color(0x39ff6e);

export interface VibrationTransmissionMaterialParams {
  level: DefenseLevel;
  thickness: number;
  roughness: number;
  dispersion: number;
  attenuationDistance: number;
}

export function createVibrationTransmissionMaterial(
  p: VibrationTransmissionMaterialParams,
): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xffffff),
    metalness: 0.05,
    roughness: p.roughness,
    transmission: 0.92,
    thickness: p.thickness,
    ior: 1.35,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
    attenuationColor: TINT.clone().multiplyScalar(0.85),
    attenuationDistance: p.attenuationDistance,
    dispersion: p.dispersion,
    envMapIntensity: 1.1,
    clearcoat: 0.12,
    clearcoatRoughness: 0.35,
  });

  switch (p.level) {
    case 1:
      mat.emissive = TINT.clone().multiplyScalar(0.04);
      mat.emissiveIntensity = 1;
      break;
    case 2:
      mat.emissive = TINT.clone().multiplyScalar(0.06);
      mat.emissiveIntensity = 1;
      break;
    case 3:
      mat.emissive = TINT.clone().multiplyScalar(0.09);
      mat.emissiveIntensity = 1;
      mat.transmission = 0.88;
      break;
  }

  attachVibrationDomeVertexWobble(mat);
  return mat;
}

/** Keep emissive / transmission tier in sync after upgrades (geometry path reuses material). */
export function syncVibrationTransmissionLevelAppearance(
  mat: THREE.MeshPhysicalMaterial,
  level: DefenseLevel,
): void {
  switch (level) {
    case 1:
      mat.emissive = TINT.clone().multiplyScalar(0.04);
      mat.emissiveIntensity = 1;
      mat.transmission = 0.92;
      break;
    case 2:
      mat.emissive = TINT.clone().multiplyScalar(0.06);
      mat.emissiveIntensity = 1;
      mat.transmission = 0.92;
      break;
    case 3:
      mat.emissive = TINT.clone().multiplyScalar(0.09);
      mat.emissiveIntensity = 1;
      mat.transmission = 0.88;
      break;
  }
}
