import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import {
  classifyMapCellSurface,
  createMapCellSurfaceContext,
  mapCellTopTextureKey,
  type MapCellSurface,
  type MapCellSurfaceKind,
} from "../game/map-cell-surface.js";
import type { PathCellVisualKind } from "../game/path-cells.js";
import { COLORS, WORLD_GROUND_GRID_EXTENT } from "./constants.js";
import { createCellTopCapTexture, createLabelSpriteTexture } from "./cell-surface-visuals.js";

export type SlotPick = { mesh: THREE.Mesh; gx: number; gz: number };

export type BuildMapBoardOptions = {
  /** When true (default), floating sprites show {@link MapCellSurface.label} per tile. */
  showCellLabels?: boolean;
};

function gridXZ(gw: number, gd: number): THREE.Vector3 {
  return new THREE.Vector3((gw - 1) / 2, 0, (gd - 1) / 2);
}

/** Grid → world XY shift (same origin as {@link buildMapBoard}). */
export function mapGridOrigin(doc: MapDocument): THREE.Vector3 {
  const [gw, gd] = doc.gridSize;
  return gridXZ(gw, gd);
}

/**
 * Square span for the scene ground grid: same 1-unit spacing and origin as {@link buildMapBoard}
 * (`size === divisions` ⇒ Three.js `step = 1`), but at least {@link WORLD_GROUND_GRID_EXTENT} so
 * the grid covers the full world floor while the map uses only a subset of tiles.
 */
export function worldGroundGridSpan(doc: MapDocument): number {
  const [gw, gd] = doc.gridSize;
  return Math.max(Math.max(gw, gd), WORLD_GROUND_GRID_EXTENT);
}

const CELL_BOX = new THREE.BoxGeometry(0.96, 0.055, 0.96);
const TOP_PLANE = new THREE.PlaneGeometry(0.92, 0.92);

/** Shared mesh assets for all map spawn portals (multi-spawn maps e.g. trench_gate). */
const SPAWN_PORTAL_GEO = new THREE.CylinderGeometry(0.35, 0.45, 0.2, 16);
const SPAWN_PORTAL_MAT = new THREE.MeshStandardMaterial({
  color: COLORS.spawn,
  roughness: 1,
});

const CELL_MATERIALS: Record<
  PathCellVisualKind | "empty",
  THREE.MeshStandardMaterial
> = {
  empty: new THREE.MeshStandardMaterial({
    color: COLORS.cellEmpty,
    roughness: 0.88,
    metalness: 0.05,
  }),
  straight: new THREE.MeshStandardMaterial({
    color: COLORS.pathCellStraight,
    roughness: 0.82,
    metalness: 0.06,
  }),
  corner: new THREE.MeshStandardMaterial({
    color: COLORS.pathCellCorner,
    roughness: 0.75,
    metalness: 0.06,
    emissive: new THREE.Color(COLORS.pathCellCorner),
    emissiveIntensity: 0.06,
  }),
  end: new THREE.MeshStandardMaterial({
    color: COLORS.pathCellEnd,
    roughness: 0.8,
    metalness: 0.05,
    emissive: new THREE.Color(COLORS.pathCellEnd),
    emissiveIntensity: 0.06,
  }),
  junction: new THREE.MeshStandardMaterial({
    color: COLORS.pathCellJunction,
    roughness: 0.75,
    metalness: 0.06,
    emissive: new THREE.Color(COLORS.pathCellJunction),
    emissiveIntensity: 0.05,
  }),
};

const SIDE_MATERIALS: Record<MapCellSurfaceKind, THREE.MeshStandardMaterial> =
  {
    sand: CELL_MATERIALS.empty,
    path: CELL_MATERIALS.straight, // unused fallback; path uses shape below
    decoration: new THREE.MeshStandardMaterial({
      color: 0x3a2858,
      roughness: 0.88,
      metalness: 0.05,
    }),
    castle: new THREE.MeshStandardMaterial({
      color: COLORS.castle,
      roughness: 0.68,
      metalness: 0.06,
    }),
    spawn: new THREE.MeshStandardMaterial({
      color: COLORS.spawn,
      roughness: 0.92,
      metalness: 0.04,
    }),
  };

function sideMaterialForSurface(surface: MapCellSurface): THREE.MeshStandardMaterial {
  if (surface.surfaceKind === "path") {
    const k = surface.pathShape ?? "straight";
    return CELL_MATERIALS[k];
  }
  return SIDE_MATERIALS[surface.surfaceKind];
}

function materialKeyForCell(
  kind: PathCellVisualKind | null,
): keyof typeof CELL_MATERIALS {
  return kind ?? "empty";
}

export type PathCellMaterialKey = PathCellVisualKind | "empty";

/**
 * One floor tile mesh matching production board styling (for galleries / tooling).
 * Origin at cell center; Y matches {@link buildMapBoard} cells.
 */
export function createPathCellMesh(kind: PathCellMaterialKey): THREE.Mesh {
  const matKey = kind in CELL_MATERIALS ? kind : "empty";
  const cell = new THREE.Mesh(CELL_BOX, CELL_MATERIALS[matKey]);
  const y = CELL_BOX.parameters.height / 2;
  cell.position.y = y;
  cell.userData.kind = "grid_cell";
  return cell;
}

/**
 * Builds grid cells (raycast targets), spawn portal(s), castle. Towers may be placed on any off-path cell.
 */
export function buildMapBoard(
  doc: MapDocument,
  options?: BuildMapBoardOptions,
): { root: THREE.Group; cells: SlotPick[] } {
  const showCellLabels = options?.showCellLabels ?? true;
  const root = new THREE.Group();
  const [gw, gd] = doc.gridSize;
  const origin = gridXZ(gw, gd);

  const surfaceCtx = createMapCellSurfaceContext(doc);
  const topTextureCache = new Map<string, THREE.CanvasTexture>();
  const topMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
  const labelTextureCache = new Map<string, THREE.CanvasTexture>();
  const labelSpriteMaterialCache = new Map<string, THREE.SpriteMaterial>();

  const topTextureFor = (surface: MapCellSurface): THREE.CanvasTexture => {
    const key = mapCellTopTextureKey(surface);
    let tex = topTextureCache.get(key);
    if (!tex) {
      tex = createCellTopCapTexture(surface);
      topTextureCache.set(key, tex);
    }
    return tex;
  };

  const topMaterialFor = (surface: MapCellSurface): THREE.MeshStandardMaterial => {
    const key = mapCellTopTextureKey(surface);
    let mat = topMaterialCache.get(key);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        map: topTextureFor(surface),
        roughness: 0.82,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      topMaterialCache.set(key, mat);
    }
    return mat;
  };

  const labelTextureFor = (label: string): THREE.CanvasTexture => {
    let tex = labelTextureCache.get(label);
    if (!tex) {
      tex = createLabelSpriteTexture(label);
      labelTextureCache.set(label, tex);
    }
    return tex;
  };

  const labelMaterialFor = (label: string): THREE.SpriteMaterial => {
    let mat = labelSpriteMaterialCache.get(label);
    if (!mat) {
      mat = new THREE.SpriteMaterial({
        map: labelTextureFor(label),
        transparent: true,
        depthWrite: false,
      });
      labelSpriteMaterialCache.set(label, mat);
    }
    return mat;
  };

  const halfLift = CELL_BOX.parameters.height / 2;
  const cells: SlotPick[] = [];
  for (let gx = 0; gx < gw; gx++) {
    for (let gz = 0; gz < gd; gz++) {
      const surface = classifyMapCellSurface(surfaceCtx, gx, gz);
      const cell = new THREE.Mesh(CELL_BOX, sideMaterialForSurface(surface));
      const y = CELL_BOX.parameters.height / 2;
      cell.position.set(gx - origin.x, y, gz - origin.z);
      cell.userData.kind = "grid_cell";
      cell.userData.gx = gx;
      cell.userData.gz = gz;

      const topCap = new THREE.Mesh(TOP_PLANE, topMaterialFor(surface));
      topCap.name = "cell_top_cap";
      topCap.rotation.x = -Math.PI / 2;
      topCap.position.y = halfLift + 0.002;
      topCap.raycast = () => {};
      cell.add(topCap);

      if (showCellLabels) {
        const sprite = new THREE.Sprite(labelMaterialFor(surface.label));
        sprite.name = "cell_label";
        sprite.position.y = halfLift + 0.11;
        sprite.scale.set(0.45, 0.105, 1);
        sprite.raycast = () => {};
        cell.add(sprite);
      }

      root.add(cell);
      cells.push({ mesh: cell, gx, gz });
    }
  }

  for (const spawn of doc.spawnPoints) {
    const sx = spawn.position[0] - origin.x;
    const sz = spawn.position[1] - origin.z;
    const hole = new THREE.Mesh(SPAWN_PORTAL_GEO, SPAWN_PORTAL_MAT);
    hole.position.set(sx, 0.1, sz);
    root.add(hole);
  }

  const c = doc.castle.position;
  const cx = c[0] - origin.x;
  const cz = c[1] - origin.z;
  const keep = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.9, 1.1),
    new THREE.MeshStandardMaterial({ color: COLORS.castle, roughness: 0.6 }),
  );
  keep.position.set(cx, 0.45, cz);
  root.add(keep);
  const crystal = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.6, 8),
    new THREE.MeshStandardMaterial({
      color: COLORS.crystal,
      emissive: COLORS.crystal,
      emissiveIntensity: 0.6,
    }),
  );
  crystal.position.set(cx, 1, cz);
  root.add(crystal);

  root.position.set(0, 0, 0);
  return { root, cells };
}

export function worldFromGrid(
  gx: number,
  gz: number,
  doc: MapDocument,
  y: number,
): THREE.Vector3 {
  const [gw, gd] = doc.gridSize;
  const origin = gridXZ(gw, gd);
  return new THREE.Vector3(gx - origin.x, y, gz - origin.z);
}
