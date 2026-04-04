import * as THREE from "three";
import type { DefenseLevel } from "../game/types.js";

/**
 * Tideheart Laser — tight additive beam (docs/defenses/tideheart-laser.md).
 * Cyan aura (#00d4ff), dim at L1, brighter L2, white-hot core at L3.
 */
const beamVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const beamFragmentShader = `
uniform float uTime;
uniform float uFade;
uniform float uLevel;

varying vec2 vUv;

const vec3 COL_CYAN = vec3(0.0, 0.831, 1.0);

float hash(float p) {
  return fract(sin(p * 127.173) * 43758.5453);
}

void main() {
  float lv = clamp(uLevel, 1.0, 3.0);
  float crossDist = abs(vUv.y - 0.5) * 2.0;

  float coreR = mix(0.22, 0.12, (lv - 1.0) * 0.5);
  float core = 1.0 - smoothstep(0.0, coreR, crossDist);
  float halo = 1.0 - smoothstep(0.12, 1.05, crossDist);

  float flow = vUv.x * (9.0 + lv * 2.0) - uTime * (2.2 + 0.4 * lv);
  float wobble = sin(flow + crossDist * 6.0) * 0.5 + 0.5;
  float grain = hash(vUv.x * 40.0 + vUv.y * 17.0 + uTime * 3.7);
  float pulse = 0.88 + 0.12 * sin(uTime * (14.0 + lv * 3.0) - vUv.x * 8.0);
  float n = mix(1.0, wobble * 0.2 + grain * 0.08 + 0.92, 0.35) * pulse;

  float caps = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);

  float dim = mix(0.38, 1.0, (lv - 1.0) * 0.31);
  vec3 col = COL_CYAN * (0.35 + 0.18 * lv) * core * dim;

  if (lv >= 2.5) {
    vec3 whiteCore = vec3(1.0, 0.99, 0.97);
    col = mix(col, whiteCore, core * core * 0.88);
  } else if (lv >= 1.5) {
    col = mix(col, vec3(0.75, 0.96, 1.0), core * 0.42);
  }

  col *= n;

  float alpha = halo * (0.34 + 0.14 * lv) * mix(0.65, 1.0, core);
  alpha *= caps;
  alpha *= uFade;

  gl_FragColor = vec4(col, alpha);
}
`;

const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _z = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _basis = new THREE.Matrix4();

function beamWidthForLevel(level: DefenseLevel): number {
  if (level === 1) return 0.7;
  if (level === 2) return 1.0;
  return 1.4;
}

export function beamWidthForTideheartLevel(level: DefenseLevel): number {
  return beamWidthForLevel(level);
}

/**
 * Keeps the ribbon facing the camera — a purely path-aligned plane is edge-on from above.
 */
export function alignTideheartLaserMesh(
  mesh: THREE.Mesh,
  start: THREE.Vector3,
  end: THREE.Vector3,
  width: number,
  camera: THREE.Camera,
): void {
  const len = Math.max(start.distanceTo(end), 0.02);
  _mid.copy(start).add(end).multiplyScalar(0.5);
  _dir.subVectors(end, start).normalize();
  _toCam.copy(camera.position).sub(_mid).normalize();
  _perp.crossVectors(_dir, _toCam);
  if (_perp.lengthSq() < 1e-8) {
    _perp.crossVectors(_dir, _up);
  }
  if (_perp.lengthSq() < 1e-8) {
    _perp.set(0, 0, 1);
  }
  _perp.normalize();
  _z.crossVectors(_dir, _perp).normalize();
  _basis.makeBasis(_dir, _perp, _z);
  mesh.quaternion.setFromRotationMatrix(_basis);
  mesh.position.copy(_mid);
  mesh.scale.set(len, width, 1);
}

function createTideheartLaserBeamMaterial(
  level: DefenseLevel,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uLevel: { value: level },
    },
    vertexShader: beamVertexShader,
    fragmentShader: beamFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/**
 * Camera-facing ribbon: local +X from `start` toward `end`, width along Y (PlaneGeometry XY).
 */
export function createTideheartLaserBeam(
  start: THREE.Vector3,
  end: THREE.Vector3,
  level: DefenseLevel,
  camera: THREE.Camera,
): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(1, 1, 12, 1);
  const mat = createTideheartLaserBeamMaterial(level);
  const mesh = new THREE.Mesh(geom, mat);
  const w = beamWidthForLevel(level);
  alignTideheartLaserMesh(mesh, start, end, w, camera);
  mesh.renderOrder = 3;
  return mesh;
}
