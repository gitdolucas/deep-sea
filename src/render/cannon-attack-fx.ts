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

const BLAST_DURATION = 0.55;

const blastVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const blastFragmentShader = `
uniform float uTime;
uniform float uFade;
varying vec2 vUv;

void main() {
  vec2 c = vUv - 0.5;
  float rInner = length(c) * 2.0;
  float fill = smoothstep(0.0, 0.22, rInner) * (1.0 - smoothstep(0.55, 1.0, rInner));
  float rip = 0.5 + 0.5 * sin(-uTime * 14.0 + rInner * 11.0);
  float edge = smoothstep(0.65, 0.95, rInner) * (1.0 - smoothstep(0.95, 1.0, rInner));
  float a = (fill * 0.55 + edge * 0.95 * rip) * uFade;
  vec3 cyan = vec3(0.0, 0.82, 1.0);
  vec3 warm = vec3(1.0, 0.58, 0.15);
  vec3 col = mix(cyan, warm, clamp(rInner * 0.85, 0.0, 1.0));
  gl_FragColor = vec4(col, a * 0.78);
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
        uFade: { value: 1 },
      },
      vertexShader: blastVertexShader,
      fragmentShader: blastFragmentShader,
      transparent: true,
      depthWrite: false,
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
    if (k >= 1) {
      scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      d.mat.dispose();
      decals.splice(i, 1);
      continue;
    }
    d.mat.uniforms.uFade.value = 1 - k * k;
  }
}

export function disposeCannonAttackFxShared(): void {
  CANNON_BOLT_MAT.dispose();
  CANNON_BOLT_MAT_L3.dispose();
}
