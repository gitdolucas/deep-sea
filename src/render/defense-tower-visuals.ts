import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import { auraRadiusTiles } from "../game/damage-resolver.js";
import type { DefenseSnapshot, DefenseTypeKey } from "../game/types.js";
import { COLORS } from "./constants.js";
import type { EntitySpriteAtlas } from "./entity-sprite-atlas.js";
import {
  ENTITY_SPRITE_RECTS_PX,
  getEntitySpriteTextureForDefense,
  worldSizeForSpriteRect,
} from "./entity-sprite-atlas.js";
import { applyVibrationDomeTuningToMesh, getVibrationDomeTuning } from "./vibration-dome-tuning.js";
import {
  applyVibrationFieldRadiusAndParts,
  createVibrationFieldGroup,
  getVibrationFieldDomeMesh,
  updateVibrationFieldVisuals,
  vibrationFieldSyncKey,
} from "./vibration-zone-field.js";
import {
  syncVibrationDomeGeometryAndEdges,
  syncVibrationZoneDomeTierMaterial,
  updateVibrationZoneDomeMaterial,
  vibrationDomeDebugWireframeFromUrl,
} from "./vibration-zone-dome.js";
import { worldFromGrid } from "./board.js";

/** Placeholder tower tint per defense (until sprites). */
export const DEFENSE_TOWER_COLOR: Record<DefenseTypeKey, number> = {
  arc_spine: COLORS.tower,
  tideheart_laser: 0x00b8e6,
  bubble_shotgun: 0x66ccff,
  vibration_zone: 0x39ff6e,
  current_cannon: 0xffaa44,
  ink_veil: 0x7b2fff,
};

export function createDefenseTowerMesh(
  defenseId: string,
  type: DefenseTypeKey,
  spriteAtlas?: EntitySpriteAtlas | null,
): THREE.Mesh | THREE.Sprite {
  const tex = getEntitySpriteTextureForDefense(spriteAtlas, type);
  if (tex) {
    const rect =
      type === "vibration_zone"
        ? ENTITY_SPRITE_RECTS_PX.vibration_zone
        : type === "ink_veil"
          ? ENTITY_SPRITE_RECTS_PX.ink_veil
          : ENTITY_SPRITE_RECTS_PX.arc_spine;
    const { width, height } = worldSizeForSpriteRect(rect);
    /** {@link THREE.Sprite} always faces the camera; avoids mis-oriented plane + camera quaternion (edge-on bar). */
    const tower = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.01,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    tower.scale.set(width, height, 1);
    tower.position.y = height * 0.5;
    tower.userData.kind = "defense_tower";
    tower.userData.defenseId = defenseId;
    tower.userData.entitySprite = true;
    tower.userData.cooldownBarLocalY = height + 0.08;
    return tower;
  }

  const tint = DEFENSE_TOWER_COLOR[type];
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.55, 10),
    new THREE.MeshStandardMaterial({
      color: tint,
      emissive: tint,
      emissiveIntensity: 0.2,
    }),
  );
  tower.userData.kind = "defense_tower";
  tower.userData.defenseId = defenseId;
  return tower;
}

export type VibrationDomeVis = {
  root: THREE.Group;
  /** Transmission dome lives in {@link createVibrationFieldGroup} → `userData.vibrationDomeMesh`. */
  vibrationDome?: THREE.Group;
  vibrationDomeKey?: string;
  /** Ink Veil cyclone / ground pool (see `syncInkVeilAuraForDefense`). */
  inkVeilAura?: THREE.Group;
  inkVeilAuraKey?: string;
};

/**
 * Attach/update/remove the vibration zone dome to match {@link GameApp.syncDefenses} behavior.
 */
export function syncVibrationZoneDomeForDefense(
  vis: VibrationDomeVis,
  d: DefenseSnapshot,
  doc: MapDocument,
  disposeSubtree: (root: THREE.Object3D) => void,
  elapsedSec: number,
): void {
  const w = worldFromGrid(d.position[0], d.position[1], doc, 0.35);
  if (d.type === "vibration_zone") {
    const rTiles = auraRadiusTiles("vibration_zone", d.level);
    const tune = getVibrationDomeTuning();
    const auraKey = vibrationFieldSyncKey(d.level, rTiles, tune);
    const showWire =
      tune.showWireframe || vibrationDomeDebugWireframeFromUrl();
    if (!vis.vibrationDome) {
      vis.vibrationDome = createVibrationFieldGroup(d.level, rTiles, tune);
      vis.root.add(vis.vibrationDome);
      vis.vibrationDomeKey = auraKey;
    } else if (vis.vibrationDomeKey !== auraKey) {
      applyVibrationFieldRadiusAndParts(
        vis.vibrationDome,
        d.level,
        rTiles,
        tune,
      );
      vis.vibrationDomeKey = auraKey;
    }
    const domeMesh = getVibrationFieldDomeMesh(vis.vibrationDome);
    syncVibrationDomeGeometryAndEdges(
      domeMesh,
      rTiles,
      tune.geometryWidthSegments,
      tune.geometryHeightSegments,
      showWire,
    );
    syncVibrationZoneDomeTierMaterial(domeMesh, d.level, rTiles);
    if (tune.applyOverrides) {
      applyVibrationDomeTuningToMesh(domeMesh, tune);
    }
    const floorY = 0.06;
    vis.vibrationDome.position.set(0, floorY - w.y + tune.floorYOffset, 0);
    updateVibrationZoneDomeMaterial(
      domeMesh.material as THREE.MeshPhysicalMaterial,
      elapsedSec,
      d.level,
    );
    updateVibrationFieldVisuals(vis.vibrationDome, d.level, rTiles, elapsedSec, tune);
  } else if (vis.vibrationDome) {
    vis.root.remove(vis.vibrationDome);
    disposeSubtree(vis.vibrationDome);
    vis.vibrationDome = undefined;
    vis.vibrationDomeKey = undefined;
  }
}
