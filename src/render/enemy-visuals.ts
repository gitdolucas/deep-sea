import * as THREE from "three";
import type { EnemyTypeKey } from "../game/types.js";
import { COLORS } from "./constants.js";
import type { EntitySpriteAtlas } from "./entity-sprite-atlas.js";
import {
  ENTITY_SPRITE_RECTS_PX,
  getEntitySpriteTextureForEnemy,
  worldSizeForSpriteRect,
} from "./entity-sprite-atlas.js";

export interface EnemyVisualBuild {
  root: THREE.Group;
  /** Local Y for the HP bar (above the silhouette). */
  hpBarY: number;
  /** Stoneclaw atlas visual (vertical plane; yaw-synced each frame in the render app). */
  spriteBillboard?: THREE.Mesh;
}

function stdMat(
  color: number,
  opts?: { emissive?: number; emissiveIntensity?: number },
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.08,
    ...(opts?.emissive != null
      ? {
          emissive: opts.emissive,
          emissiveIntensity: opts.emissiveIntensity ?? 0.35,
        }
      : {}),
  });
}

function makeStoneclawSprite(map: THREE.Texture): {
  sprite: THREE.Mesh;
  hpBarY: number;
} {
  const rect = ENTITY_SPRITE_RECTS_PX.stoneclaw;
  const { width, height } = worldSizeForSpriteRect(rect);
  const sprite = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  sprite.position.y = height * 0.5;
  sprite.userData.kind = "enemy_sprite";
  sprite.userData.enemyType = "stoneclaw";
  return { sprite, hpBarY: height + 0.06 };
}

/**
 * Placeholder meshes per `EnemyTypeKey` (docs/map-schema.md + docs/style-bible.md colors).
 * Pass `spriteAtlas` so Stoneclaw uses `public/textures/sprites.png` (see `entity-sprite-atlas.ts`).
 */
export function createEnemyVisual(
  enemyType: EnemyTypeKey,
  spriteAtlas?: EntitySpriteAtlas | null,
): EnemyVisualBuild {
  const root = new THREE.Group();
  switch (enemyType) {
    case "stoneclaw": {
      const tex = getEntitySpriteTextureForEnemy(spriteAtlas, enemyType);
      if (tex) {
        const { sprite, hpBarY } = makeStoneclawSprite(tex);
        root.add(sprite);
        return { root, hpBarY, spriteBillboard: sprite };
      }
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.35, 0.45),
        stdMat(COLORS.stoneclaw),
      );
      body.position.y = 0.175;
      root.add(body);
      const shell = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.12, 0.34),
        stdMat(COLORS.stoneclawShell),
      );
      shell.position.set(0, 0.35 + 0.06, -0.04);
      root.add(shell);
      return { root, hpBarY: 0.52 };
    }
    case "razoreel": {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.16, 0.78),
        stdMat(COLORS.razoreelBody, {
          emissive: COLORS.razoreelAccent,
          emissiveIntensity: 0.45,
        }),
      );
      body.position.set(0, 0.1, 0);
      root.add(body);
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.14, 0.18),
        stdMat(COLORS.razoreelAccent, {
          emissive: COLORS.razoreelAccent,
          emissiveIntensity: 0.7,
        }),
      );
      head.position.set(0, 0.1, 0.44);
      root.add(head);
      return { root, hpBarY: 0.36 };
    }
    case "abyssal_colossus": {
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.68, 0.88),
        stdMat(COLORS.abyssalColossusBody, {
          emissive: COLORS.abyssalColossusVein,
          emissiveIntensity: 0.22,
        }),
      );
      core.position.y = 0.34;
      root.add(core);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.035, 8, 20),
        stdMat(COLORS.abyssalColossusVein, {
          emissive: COLORS.abyssalColossusVein,
          emissiveIntensity: 0.55,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.55;
      root.add(ring);
      return { root, hpBarY: 0.74 };
    }
  }
}
