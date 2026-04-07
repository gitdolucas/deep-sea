import * as THREE from "three";
import type { DefenseTypeKey, EnemyTypeKey } from "../game/types.js";

/**
 * Authoring resolution for {@link ENTITY_SPRITE_RECTS_PX} (`public/textures/sprites.png`).
 * Re-measure after layout changes: per 80px column, tight bbox of non-bg pixels
 * (very low alpha or near-white RGB ≈ background — see scripts/measure-sprite-atlas.sh).
 */
export const ENTITY_SPRITE_ATLAS_DESIGN_SIZE = { width: 1600, height: 1600 } as const;

export type EntitySpritePixelRect = { x: number; y: number; w: number; h: number };

/**
 * Top-left pixel rects on the atlas at {@link ENTITY_SPRITE_ATLAS_DESIGN_SIZE}.
 * Order left-to-right: Vibration Zone, Ink Veil, Arc Spine, Stoneclaw.
 * Measured from the 1600×1600 sheet: four 80px columns, y=0, h=161 (rows 0…160).
 */
export const ENTITY_SPRITE_RECTS_PX: Record<EntitySpriteRegionKey, EntitySpritePixelRect> = {
  vibration_zone: { x: 0, y: 0, w: 80, h: 161 },
  ink_veil: { x: 80, y: 0, w: 80, h: 161 },
  arc_spine: { x: 160, y: 0, w: 80, h: 161 },
  stoneclaw: { x: 240, y: 0, w: 80, h: 161 },
};

export type EntitySpriteRegionKey =
  | "vibration_zone"
  | "ink_veil"
  | "arc_spine"
  | "stoneclaw";

/** Public URL for `public/textures/sprites.png` — shared by WebGL and HUD CSS. */
export const ENTITY_SPRITE_ATLAS_PUBLIC_URL = "/textures/sprites.png";

const SPRITES_PUBLIC_URL = ENTITY_SPRITE_ATLAS_PUBLIC_URL;

let cachedAtlas: EntitySpriteAtlas | null = null;
let cachedLoad: Promise<EntitySpriteAtlas> | null = null;

export type EntitySpriteAtlas = {
  /** Cloned textures with independent UV windows into the same image. */
  readonly regions: Record<EntitySpriteRegionKey, THREE.Texture>;
  dispose(): void;
};

export function configurePixelArtTexture(tex: THREE.Texture): void {
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
}

function scaleRect(
  rect: EntitySpritePixelRect,
  tw: number,
  th: number,
): EntitySpritePixelRect {
  const dw = ENTITY_SPRITE_ATLAS_DESIGN_SIZE.width;
  const dh = ENTITY_SPRITE_ATLAS_DESIGN_SIZE.height;
  const sx = tw / dw;
  const sy = th / dh;
  return {
    x: rect.x * sx,
    y: rect.y * sy,
    w: rect.w * sx,
    h: rect.h * sy,
  };
}

function applyTopLeftRectToTexture(
  tex: THREE.Texture,
  rect: EntitySpritePixelRect,
  tw: number,
  th: number,
): void {
  tex.repeat.set(rect.w / tw, rect.h / th);
  tex.offset.set(rect.x / tw, (th - rect.y - rect.h) / th);
  tex.needsUpdate = true;
}

function buildAtlasFromTexture(base: THREE.Texture): EntitySpriteAtlas {
  const img = base.image as HTMLImageElement | { width: number; height: number };
  const tw = img.width;
  const th = img.height;

  const regions = {} as Record<EntitySpriteRegionKey, THREE.Texture>;
  for (const key of Object.keys(ENTITY_SPRITE_RECTS_PX) as EntitySpriteRegionKey[]) {
    const scaled = scaleRect(ENTITY_SPRITE_RECTS_PX[key], tw, th);
    const t = base.clone();
    configurePixelArtTexture(t);
    applyTopLeftRectToTexture(t, scaled, tw, th);
    regions[key] = t;
  }

  return {
    regions,
    dispose() {
      for (const t of Object.values(regions)) {
        t.dispose();
      }
      base.dispose();
    },
  };
}

/**
 * Loads `/textures/sprites.png` (place file in `public/textures/`) and builds
 * one {@link THREE.Texture} clone per atlas region.
 * Fully transparent regions produce invisible sprites — use opaque pixels in each cell
 * (see `scripts/write-sprite-placeholder.swift` for a dev strip).
 */
export function loadEntitySpriteAtlas(): Promise<EntitySpriteAtlas> {
  if (cachedAtlas) return Promise.resolve(cachedAtlas);
  if (cachedLoad) return cachedLoad;

  const loader = new THREE.TextureLoader();
  cachedLoad = new Promise((resolve, reject) => {
    loader.load(
      SPRITES_PUBLIC_URL,
      (tex) => {
        configurePixelArtTexture(tex);
        cachedAtlas = buildAtlasFromTexture(tex);
        resolve(cachedAtlas);
      },
      undefined,
      (err) => {
        cachedLoad = null;
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
  return cachedLoad;
}

/** For tests / tools: reset singleton between cases. */
export function __resetEntitySpriteAtlasCacheForTests(): void {
  cachedAtlas?.dispose();
  cachedAtlas = null;
  cachedLoad = null;
}

export function enemyUsesEntitySpriteAtlas(type: EnemyTypeKey): type is "stoneclaw" {
  return type === "stoneclaw";
}

export function defenseUsesEntitySpriteAtlas(
  type: DefenseTypeKey,
): type is "arc_spine" | "vibration_zone" | "ink_veil" {
  return type === "arc_spine" || type === "vibration_zone" || type === "ink_veil";
}

export function getEntitySpriteTextureForEnemy(
  atlas: EntitySpriteAtlas | null | undefined,
  type: EnemyTypeKey,
): THREE.Texture | undefined {
  if (!atlas) return undefined;
  if (type === "stoneclaw") return atlas.regions.stoneclaw;
  return undefined;
}

export function getEntitySpriteTextureForDefense(
  atlas: EntitySpriteAtlas | null | undefined,
  type: DefenseTypeKey,
): THREE.Texture | undefined {
  if (!atlas) return undefined;
  if (type === "vibration_zone") return atlas.regions.vibration_zone;
  if (type === "ink_veil") return atlas.regions.ink_veil;
  if (type === "arc_spine") return atlas.regions.arc_spine;
  return undefined;
}

/** Tallest frame height in {@link ENTITY_SPRITE_RECTS_PX} (for consistent world scale). */
const TALLEST_SPRITE_PX = 161;

/** World height for the tallest sprite (~ prior cylinder tower height). */
const BASE_WORLD_HEIGHT = 0.55;

/** Display scale for towers + Stoneclaw billboards on the map (size from {@link worldSizeForSpriteRect}). */
const ENTITY_SPRITE_MAP_SCALE = 2;

export function worldSizeForSpriteRect(rect: EntitySpritePixelRect): {
  width: number;
  height: number;
} {
  const h =
    (rect.h / TALLEST_SPRITE_PX) * BASE_WORLD_HEIGHT * ENTITY_SPRITE_MAP_SCALE;
  const aspect = rect.w / rect.h;
  const w = aspect * h;
  return { width: w, height: h };
}
