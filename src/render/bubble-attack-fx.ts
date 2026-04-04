import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import type { BubblePopFx, BubbleProjectileState } from "../game/bubble-projectiles.js";
import { worldFromGrid } from "./board.js";

const BUBBLE_R = 0.11;
const BUBBLE_SEG = 12;

const MAT_BUBBLE = new THREE.MeshBasicMaterial({
  color: 0x7ee8ff,
  transparent: true,
  opacity: 0.84,
  depthWrite: false,
});

const MAT_BUBBLE_L3 = new THREE.MeshBasicMaterial({
  color: 0x44eeff,
  transparent: true,
  opacity: 0.91,
  depthWrite: false,
});

export type BubblePopRing = {
  mesh: THREE.Mesh;
  age: number;
  duration: number;
};

const POP_DURATION = 0.2;
const POP_DURATION_SPLASH = 0.3;

/** Grow pooled bubble meshes to match active simulation count. */
export function ensureBubbleProjectilePool(
  parent: THREE.Group,
  pool: THREE.Mesh[],
  needed: number,
): void {
  while (pool.length < needed) {
    const geom = new THREE.SphereGeometry(BUBBLE_R, BUBBLE_SEG, 10);
    const mesh = new THREE.Mesh(geom, MAT_BUBBLE);
    mesh.renderOrder = 2;
    parent.add(mesh);
    pool.push(mesh);
  }
}

/** Sync mesh poses from simulation; hides extras in the pool. */
export function syncBubbleProjectileMeshes(
  pool: THREE.Mesh[],
  projectiles: readonly BubbleProjectileState[],
  doc: MapDocument,
  timeSec: number,
): void {
  for (let i = 0; i < pool.length; i++) {
    const mesh = pool[i]!;
    if (i < projectiles.length) {
      const p = projectiles[i]!;
      mesh.visible = true;
      mesh.material = p.splash > 0 ? MAT_BUBBLE_L3 : MAT_BUBBLE;
      const bob =
        0.4 +
        0.055 * Math.sin(timeSec * 10 + i * 0.9 + p.traveled * 3.2);
      mesh.position.copy(worldFromGrid(p.gx, p.gz, doc, bob));
      const sc =
        (p.splash > 0 ? 1.1 : 1) *
        (1 + 0.07 * Math.sin(timeSec * 13 + p.traveled * 5));
      mesh.scale.setScalar(sc);
    } else {
      mesh.visible = false;
    }
  }
}

/** Append expanding ring meshes for each pop event (caller owns lifecycle via update). */
export function spawnBubblePopRings(
  events: readonly BubblePopFx[],
  doc: MapDocument,
  scene: THREE.Scene,
  rings: BubblePopRing[],
): void {
  for (const e of events) {
    const inner = e.splash ? 0.1 : 0.05;
    const outer = e.splash ? 0.5 : 0.32;
    const geom = new THREE.RingGeometry(inner, outer, 26);
    const mat = new THREE.MeshBasicMaterial({
      color: e.splash ? 0x55ffff : 0xaaeeff,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 1;
    mesh.position.copy(worldFromGrid(e.gx, e.gz, doc, 0.34));
    scene.add(mesh);
    rings.push({
      mesh,
      age: 0,
      duration: e.splash ? POP_DURATION_SPLASH : POP_DURATION,
    });
  }
}

/** Call after removing / disposing all pooled bubble meshes. */
export function disposeBubbleAttackFxShared(): void {
  MAT_BUBBLE.dispose();
  MAT_BUBBLE_L3.dispose();
}

export function updateBubblePopRings(
  rings: BubblePopRing[],
  dt: number,
  scene: THREE.Scene,
): void {
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]!;
    r.age += dt;
    const k = r.age / r.duration;
    if (k >= 1) {
      scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
      rings.splice(i, 1);
      continue;
    }
    const mat = r.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.88 * (1 - k * k);
    const s = 1 + k * 1.85;
    r.mesh.scale.set(s, s, s);
  }
}
