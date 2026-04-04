import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import type { CannonProjectileState } from "../game/cannon-projectiles.js";
import { worldFromGrid } from "./board.js";

const BOLT_LENGTH = 0.42;
const BOLT_R_BOT = 0.055;
const BOLT_R_TOP = 0.02;

const CANNON_BOLT_MAT = new THREE.MeshBasicMaterial({
  color: 0x44ddff,
  transparent: true,
  opacity: 0.92,
  depthWrite: false,
});

const CANNON_BOLT_MAT_L3 = new THREE.MeshBasicMaterial({
  color: 0xffcc66,
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
});

const _fwd = new THREE.Vector3();
const _axis = new THREE.Vector3(0, 1, 0);

const BLAST_DURATION = 0.62;

/* Radial distance from mesh origin; CircleGeometry lives in local XY before rotation. */
const blastVertexShader = `
varying vec2 vLocalXY;
void main() {
  vLocalXY = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Expanding pressure-ring blast: hot core, leading shockwall, violet caustic crawl,
 * trailing ripples (style-bible cyan / violet / warm accents).
 */
const blastFragmentShader = `
uniform float uTime;
uniform float uProgress;
uniform float uRadius;
uniform float uFade;
varying vec2 vLocalXY;

const vec3 COL_CYAN = vec3(0.0, 0.831, 1.0);
const vec3 COL_DEEP = vec3(0.008, 0.22, 0.42);
const vec3 COL_VIOLET = vec3(0.482, 0.184, 1.0);
const vec3 COL_CORE = vec3(1.0, 0.65, 0.25);
const vec3 COL_MINT = vec3(0.0, 1.0, 0.8);

void main() {
  float len = length(vLocalXY);
  float r = clamp(len / max(uRadius, 0.001), 0.0, 1.2);
  float p = clamp(uProgress, 0.0, 1.0);

  float front = p * 1.08;
  float shock = exp(-pow((r - front) * 14.0, 2.0));
  float shock2 = exp(-pow((r - front * 0.92) * 9.0, 2.0)) * 0.55;

  float wakeA = exp(-pow((r - p * 0.5) * 7.0, 2.0)) * (1.0 - p) * 0.4;
  float wakeB = exp(-pow((r - p * 0.72) * 12.0, 2.0)) * (1.0 - smoothstep(0.35, 1.0, p)) * 0.35;

  float coreFlash = (1.0 - smoothstep(0.0, 0.18, r)) * exp(-p * 5.5);

  float caust = sin(r * 38.0 - uTime * 10.0 + p * 6.28) * 0.5 + 0.5;
  float ionBand = smoothstep(0.55, 0.95, r) * (1.0 - smoothstep(0.98, 1.05, r));
  ionBand *= caust * (0.35 + shock * 0.85);

  float haze = (1.0 - smoothstep(0.0, 0.45, r)) * exp(-p * 2.2) * 0.22;

  float alpha =
    (shock + shock2 + wakeA + wakeB + coreFlash + ionBand * 0.9 + haze) * uFade;

  vec3 col = COL_DEEP * (0.35 + haze * 2.5);
  col = mix(col, COL_CYAN, clamp(shock * 1.15 + shock2 * 0.8 + wakeA * 1.2, 0.0, 1.0));
  col = mix(col, COL_VIOLET, ionBand * 0.95);
  col = mix(col, COL_MINT, shock * r * 0.35 + wakeB * 0.5);
  col = mix(col, COL_CORE, coreFlash * 1.25);

  float pulse = 0.92 + 0.08 * sin(uTime * 22.0 - r * 30.0);
  col *= pulse;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.94));
}
`;

export type CannonBlastDecal = {
  mesh: THREE.Mesh;
  age: number;
  duration: number;
  mat: THREE.ShaderMaterial;
};

export function ensureCannonProjectilePool(
  parent: THREE.Group,
  pool: THREE.Mesh[],
  needed: number,
): void {
  while (pool.length < needed) {
    const geom = new THREE.CylinderGeometry(
      BOLT_R_TOP,
      BOLT_R_BOT,
      BOLT_LENGTH,
      8,
      1,
      false,
    );
    const mesh = new THREE.Mesh(geom, CANNON_BOLT_MAT);
    mesh.renderOrder = 3;
    parent.add(mesh);
    pool.push(mesh);
  }
}

export function syncCannonProjectileMeshes(
  pool: THREE.Mesh[],
  projectiles: readonly CannonProjectileState[],
  doc: MapDocument,
  timeSec: number,
): void {
  for (let i = 0; i < pool.length; i++) {
    const mesh = pool[i]!;
    if (i < projectiles.length) {
      const p = projectiles[i]!;
      mesh.visible = true;
      mesh.material = p.level >= 3 ? CANNON_BOLT_MAT_L3 : CANNON_BOLT_MAT;
      const dirLen = Math.hypot(p.vgx, p.vgz) || 1;
      _fwd.set(p.vgx / dirLen, 0, p.vgz / dirLen);
      mesh.quaternion.setFromUnitVectors(_axis, _fwd);
      const bob = 0.48 + 0.04 * Math.sin(timeSec * 14 + i * 0.7 + p.traveled * 2.8);
      mesh.position.copy(worldFromGrid(p.gx, p.gz, doc, bob));
      const sc = (p.level >= 3 ? 1.12 : 1) * (1 + 0.05 * Math.sin(timeSec * 11 + p.traveled * 4));
      mesh.scale.set(sc, sc * (0.95 + p.level * 0.04), sc);
    } else {
      mesh.visible = false;
    }
  }
}

export function spawnCannonBlastDecals(
  events: readonly { gx: number; gz: number; radiusTiles: number }[],
  doc: MapDocument,
  scene: THREE.Scene,
  decals: CannonBlastDecal[],
): void {
  for (const e of events) {
    const rWorld = Math.max(0.35, e.radiusTiles);
    const geom = new THREE.CircleGeometry(rWorld, 48);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uRadius: { value: rWorld },
        uFade: { value: 1 },
      },
      vertexShader: blastVertexShader,
      fragmentShader: blastFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 2;
    mesh.position.copy(worldFromGrid(e.gx, e.gz, doc, 0.24));
    scene.add(mesh);
    decals.push({ mesh, age: 0, duration: BLAST_DURATION, mat });
  }
}

export function updateCannonBlastDecals(
  decals: CannonBlastDecal[],
  dt: number,
  scene: THREE.Scene,
  timeSec: number,
): void {
  for (let i = decals.length - 1; i >= 0; i--) {
    const d = decals[i]!;
    d.age += dt;
    const k = d.age / d.duration;
    d.mat.uniforms.uTime.value = timeSec;
    d.mat.uniforms.uProgress.value = k;
    if (k >= 1) {
      scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      d.mat.dispose();
      decals.splice(i, 1);
      continue;
    }
    d.mat.uniforms.uFade.value = 1.0 - k * k * k;
  }
}

export function disposeCannonAttackFxShared(): void {
  CANNON_BOLT_MAT.dispose();
  CANNON_BOLT_MAT_L3.dispose();
}
