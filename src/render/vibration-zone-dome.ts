import * as THREE from "three";
import type { DefenseLevel } from "../game/types.js";
import { getVibrationDomeTuning } from "./vibration-dome-tuning.js";
import {
  createVibrationTransmissionMaterial,
  syncVibrationTransmissionLevelAppearance,
} from "./mesh-transmission-material.js";
import { updateVibrationDomeFresnelUniforms } from "./vibration-dome-fresnel-shader.js";
import { updateVibrationDomeWobbleUniforms } from "./vibration-dome-wobble-shader.js";

/** UserData tag for dispose / transmission list (GameApp). */
export const VIBRATION_DOME_USERDATA_KIND = "vibration_zone_dome";

/** Debug edges via URL only (Leva can toggle wireframe at runtime). */
export function vibrationDomeDebugWireframeFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("vzDebug");
}

function hemisphereGeometry(
  radius: number,
  widthSegments: number,
  heightSegments: number,
): THREE.SphereGeometry {
  return new THREE.SphereGeometry(
    radius,
    widthSegments,
    heightSegments,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
}

function tierTransmissionParams(level: DefenseLevel): {
  thickness: number;
  roughness: number;
  dispersion: number;
  attenuationDistance: number;
} {
  switch (level) {
    case 1:
      return {
        thickness: Math.max(0.8, radiusBaseline(1) * 0.14),
        roughness: 0.22,
        dispersion: 0.12,
        attenuationDistance: 8,
      };
    case 2:
      return {
        thickness: Math.max(1.0, radiusBaseline(2) * 0.15),
        roughness: 0.16,
        dispersion: 0.14,
        attenuationDistance: 10,
      };
    case 3:
      return {
        thickness: Math.max(1.2, radiusBaseline(3) * 0.16),
        roughness: 0.11,
        dispersion: 0.18,
        attenuationDistance: 12,
      };
  }
}

function radiusBaseline(level: DefenseLevel): number {
  return 4 + (level - 1) + 0.5;
}

export interface VibrationZoneDomeOptions {
  /** @deprecated Wire is driven by Leva / vzDebug in GameApp. */
  debugWireframe?: boolean;
}

const DEFAULT_GW = 48;
const DEFAULT_GH = 24;

/**
 * Simulator-tier PBR (each frame when overrides are off — keeps tier in sync).
 * Sets `userData.tierThickness` for Leva thickness scale.
 */
export function syncVibrationZoneDomeTierMaterial(
  mesh: THREE.Mesh,
  level: DefenseLevel,
  rTiles: number,
): void {
  const mat = mesh.material as THREE.MeshPhysicalMaterial;
  const params = tierTransmissionParams(level);
  const tierT = params.thickness * (rTiles / radiusBaseline(level));
  mesh.userData.tierThickness = tierT;
  mat.thickness = tierT;
  mat.roughness = params.roughness;
  mat.dispersion = params.dispersion;
  mat.attenuationDistance = params.attenuationDistance;
  syncVibrationTransmissionLevelAppearance(mat, level);
}

/** Upper hemisphere: rim at local y=0. */
export function createVibrationZoneDomeMesh(
  level: DefenseLevel,
  rTiles: number,
  _options?: VibrationZoneDomeOptions,
): THREE.Mesh {
  const geom = hemisphereGeometry(rTiles, DEFAULT_GW, DEFAULT_GH);
  const params = tierTransmissionParams(level);
  const mat = createVibrationTransmissionMaterial({
    level,
    thickness: params.thickness * (rTiles / radiusBaseline(level)),
    roughness: params.roughness,
    dispersion: params.dispersion,
    attenuationDistance: params.attenuationDistance,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData.kind = VIBRATION_DOME_USERDATA_KIND;
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  mesh.userData.tierThickness = mat.thickness;
  return mesh;
}

/**
 * Replace geometry when radius / level changes. Tier material updated via
 * {@link syncVibrationZoneDomeTierMaterial}.
 */
export function applyVibrationZoneDomeRadius(
  mesh: THREE.Mesh,
  level: DefenseLevel,
  rTiles: number,
  widthSeg = DEFAULT_GW,
  heightSeg = DEFAULT_GH,
): void {
  mesh.geometry.dispose();
  mesh.geometry = hemisphereGeometry(rTiles, widthSeg, heightSeg);
  syncVibrationZoneDomeTierMaterial(mesh, level, rTiles);
}

/**
 * Live segment count + red edges (Leva / `?vzDebug=1`).
 */
export function syncVibrationDomeGeometryAndEdges(
  mesh: THREE.Mesh,
  rTiles: number,
  widthSeg: number,
  heightSeg: number,
  showWireframe: boolean,
): void {
  const g = mesh.geometry as THREE.SphereGeometry;
  const p = g.parameters;
  const needGeom =
    Math.abs(p.radius - rTiles) > 1e-6 ||
    p.widthSegments !== widthSeg ||
    p.heightSegments !== heightSeg;

  if (needGeom) {
    mesh.geometry.dispose();
    mesh.geometry = hemisphereGeometry(
      rTiles,
      Math.max(8, Math.round(widthSeg)),
      Math.max(4, Math.round(heightSeg)),
    );
  }

  let edgeChild: THREE.LineSegments | undefined;
  for (const c of mesh.children) {
    if (c instanceof THREE.LineSegments) {
      edgeChild = c;
      break;
    }
  }

  if (showWireframe) {
    if (!edgeChild) {
      edgeChild = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 1),
        new THREE.LineBasicMaterial({
          color: 0xff0000,
          depthTest: false,
          transparent: true,
        }),
      );
      edgeChild.renderOrder = 3;
      mesh.add(edgeChild);
    } else {
      edgeChild.geometry.dispose();
      edgeChild.geometry = new THREE.EdgesGeometry(mesh.geometry, 1);
    }
  } else if (edgeChild) {
    edgeChild.geometry.dispose();
    (edgeChild.material as THREE.Material).dispose();
    mesh.remove(edgeChild);
  }
}

export function updateVibrationZoneDomeMaterial(
  mat: THREE.MeshPhysicalMaterial,
  elapsedTime: number,
  _level: DefenseLevel,
): void {
  const tune = getVibrationDomeTuning();
  updateVibrationDomeWobbleUniforms(mat, elapsedTime, tune);
  updateVibrationDomeFresnelUniforms(mat, tune);
}
