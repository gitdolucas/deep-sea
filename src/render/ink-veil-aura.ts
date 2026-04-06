import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import { auraRadiusTiles } from "../game/damage-resolver.js";
import type { DefenseLevel, DefenseSnapshot } from "../game/types.js";
import { getVibrationDomeTuning } from "./vibration-dome-tuning.js";
import { worldFromGrid } from "./board.js";

/** UserData tag for dispose / filtering. */
export const INK_VEIL_AURA_USERDATA_KIND = "ink_veil_aura";

const DISK_SEGMENTS = 64;
const DOME_WIDTH_SEG = 48;
const DOME_HEIGHT_SEG = 22;

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

/**
 * Same vertex displacement as {@link attachVibrationDomeVertexWobble} (vibration-dome-wobble-shader.ts):
 * normal-directed ripple from sin/cos of position + radial term.
 */
const inkVeilVertexShader = `
uniform float uIsDome;
uniform float uWobbleTime;
uniform float uWobbleAmp;
uniform float uWobbleFreq;
uniform float uWobbleRadial;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vLocalXZ;

void main() {
  vec3 transformed = position;
  vec3 nObj = normalize(normal);

  if (uWobbleAmp > 1.0e-6) {
    float t = uWobbleTime;
    float f = uWobbleFreq;
    float s1 = sin(dot(transformed, vec3(f, f * 1.17, f * 0.93)) + t * 3.1);
    float s2 = cos(transformed.x * f * 1.4 - transformed.y * f * 0.81 + t * 2.65);
    float rad = length(transformed.xz);
    float s3 = sin(rad * uWobbleRadial - t * 4.8);
    float w = s1 * 0.45 + s2 * 0.33 + s3 * 0.22;
    w = clamp(w, -1.2, 1.2);
    transformed += nObj * (uWobbleAmp * w);
  }

  // CircleGeometry (disk) lies in XY; hemisphere uses XZ footprint for ink cyclone (matches fragment).
  vLocalXZ = mix(vec2(transformed.x, transformed.y), vec2(transformed.x, transformed.z), uIsDome);

  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const inkVeilFragmentShader = `
uniform float uTime;
uniform float uLevel;
uniform float uRadius;
uniform float uSwirlSpeed;
uniform float uNoiseScale;
uniform float uEdgeSoftness;
uniform vec3 uInkCore;
uniform vec3 uInkRim;
uniform float uIsDome;
uniform float uOpacityMul;
uniform float uRingHint;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vLocalXZ;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 x = p;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(x);
    x *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  float r = length(vLocalXZ) / max(uRadius, 0.001);
  if (r > 1.0 + uEdgeSoftness * 1.5) discard;

  float aAng = atan(vLocalXZ.y, vLocalXZ.x);
  float tier = clamp(uLevel, 1.0, 3.0);
  float swirl = uSwirlSpeed * (0.85 + 0.08 * tier);
  float aSw = aAng + uTime * swirl;
  vec2 p = vLocalXZ * uNoiseScale * 0.12;
  p = vec2(
    p.x * cos(aSw * 0.15) - p.y * sin(aSw * 0.15),
    p.x * sin(aSw * 0.15) + p.y * cos(aSw * 0.15)
  );
  p += vec2(
    fbm(p * 0.7 + uTime * 0.18),
    fbm(p.yx * 0.85 - uTime * 0.12)
  ) * (0.28 + 0.1 * tier);
  float n = fbm(p + vec2(3.1, 7.7));
  float n2 = fbm(p * 1.7 + uTime * 0.25);
  float streaks = smoothstep(0.2, 0.95, abs(sin(14.0 * aAng + r * 11.0 - uTime * 2.4))) * (0.35 + 0.45 * n2);

  float edge = 1.0 - smoothstep(1.0 - uEdgeSoftness * 2.2, 1.0 + uEdgeSoftness * 0.6, r);
  float ring = uRingHint * smoothstep(0.04, 0.0, abs(r - 0.88)) * edge;

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormal);
  float ndv = max(0.0, dot(viewDir, N));
  float fresnel = pow(1.0 - ndv, 2.8);

  float domeW = uIsDome;
  float inkMix = mix(n * 0.55 + streaks * 0.35, fresnel * 0.85 + n * 0.25, domeW);
  vec3 base = mix(uInkCore, uInkRim, clamp(inkMix + ring * 2.5, 0.0, 1.0));

  float alphaDisk = (0.38 + 0.1 * tier) * edge * (0.45 + 0.5 * n + streaks * 0.4);
  float alphaDome = (0.22 + 0.06 * tier) * edge * (0.5 + 0.45 * fresnel) + fresnel * 0.35 * edge;
  float alpha = mix(alphaDisk, alphaDome, domeW) * uOpacityMul;
  alpha = clamp(alpha + ring * 0.35, 0.0, 0.98);

  gl_FragColor = vec4(base, alpha);
}
`;

const inkParticleVertexShader = `
attribute float aPhase;
attribute float aR;

uniform float uTime;
uniform float uRadius;
uniform float uPointSizeMul;

varying float vAlpha;

float hash(float x) {
  return fract(sin(x * 127.1) * 43758.5453);
}

void main() {
  float t = uTime * (0.35 + hash(aPhase) * 0.4);
  float ang = aPhase * 6.2831853 + t * 1.7;
  float rad = aR * uRadius * 0.92;
  float wobble = sin(t * 2.1 + aPhase * 8.0) * 0.08 * uRadius;
  vec3 pos = vec3(cos(ang) * rad + wobble, abs(sin(t * 1.3 + aPhase)) * uRadius * 0.55, sin(ang) * rad + wobble * 0.7);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = 0.35 + 0.45 * hash(aPhase * 3.17 + 2.0);
  float ps = uPointSizeMul * (35.0 + 22.0 * hash(aPhase + 1.0));
  gl_PointSize = clamp(ps * (180.0 / max(-mvPosition.z, 0.35)), 2.0, 64.0);
}
`;

const inkParticleFragmentShader = `
uniform vec3 uColor;

varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  float soft = 1.0 - smoothstep(0.25, 0.5, d);
  gl_FragColor = vec4(uColor, soft * vAlpha * 0.55);
}
`;

function tierOpacityMul(level: DefenseLevel): number {
  switch (level) {
    case 1:
      return 0.85;
    case 2:
      return 0.95;
    default:
      return 1.05;
  }
}

function tierSwirl(level: DefenseLevel): number {
  switch (level) {
    case 1:
      return 0.55;
    case 2:
      return 0.72;
    default:
      return 0.95;
  }
}

function tierRingHint(level: DefenseLevel): number {
  return level >= 2 ? 0.55 : 0.0;
}

function tierParticleCount(level: DefenseLevel): number {
  switch (level) {
    case 1:
      return 28;
    case 2:
      return 44;
    default:
      return 64;
  }
}

function createSharedInkUniforms(
  level: DefenseLevel,
  rTiles: number,
  isDome: number,
): { [uniform: string]: THREE.IUniform } {
  const core = new THREE.Color(0x050812);
  const rim = new THREE.Color(0x7b2fff);
  const tune = getVibrationDomeTuning();
  return {
    uTime: { value: 0 },
    uLevel: { value: level },
    uRadius: { value: rTiles },
    uSwirlSpeed: { value: tierSwirl(level) },
    uNoiseScale: { value: 1.15 + level * 0.12 },
    uEdgeSoftness: { value: 0.08 + level * 0.02 },
    uInkCore: { value: core },
    uInkRim: { value: rim },
    uIsDome: { value: isDome },
    uOpacityMul: { value: tierOpacityMul(level) },
    uRingHint: { value: tierRingHint(level) },
    uWobbleTime: { value: 0 },
    uWobbleAmp: { value: tune.wobbleEnabled ? tune.wobbleAmp : 0 },
    uWobbleFreq: { value: tune.wobbleFreq },
    uWobbleRadial: { value: tune.wobbleRadial },
  };
}

function createSurfaceMaterial(shared: {
  [uniform: string]: THREE.IUniform;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: inkVeilVertexShader,
    fragmentShader: inkVeilFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
}

function createParticleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: 1 },
      uPointSizeMul: { value: 1 },
      uColor: { value: new THREE.Color(0x9d6fff) },
    },
    vertexShader: inkParticleVertexShader,
    fragmentShader: inkParticleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildParticleGeometry(level: DefenseLevel, rTiles: number): THREE.BufferGeometry {
  const n = tierParticleCount(level);
    const rng = mulberry32(0x1eec0de + level * 997 + Math.floor(rTiles * 100));
  const phases = new Float32Array(n);
  const rs = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    phases[i] = rng();
    rs[i] = 0.25 + rng() * 0.72;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  g.setAttribute("aR", new THREE.BufferAttribute(rs, 1));
  return g;
}

export type InkVeilAuraGroup = THREE.Group & {
  userData: { kind: typeof INK_VEIL_AURA_USERDATA_KIND };
};

/**
 * Creates disk + hemisphere + optional particle field for Ink Veil aura.
 * Child meshes use shared uniform objects per surface (disk vs dome).
 */
export function createInkVeilAuraGroup(
  level: DefenseLevel,
  rTiles: number,
): InkVeilAuraGroup {
  const group = new THREE.Group() as InkVeilAuraGroup;
  group.userData.kind = INK_VEIL_AURA_USERDATA_KIND;

  const uDisk = createSharedInkUniforms(level, rTiles, 0);
  const uDome = createSharedInkUniforms(level, rTiles, 1);
  uDome.uTime = uDisk.uTime;
  uDome.uLevel = uDisk.uLevel;
  uDome.uRadius = uDisk.uRadius;
  uDome.uSwirlSpeed = uDisk.uSwirlSpeed;
  uDome.uNoiseScale = uDisk.uNoiseScale;
  uDome.uEdgeSoftness = uDisk.uEdgeSoftness;
  uDome.uInkCore = uDisk.uInkCore;
  uDome.uInkRim = uDisk.uInkRim;
  uDome.uOpacityMul = uDisk.uOpacityMul;
  uDome.uRingHint = uDisk.uRingHint;
  uDome.uWobbleTime = uDisk.uWobbleTime;
  uDome.uWobbleAmp = uDisk.uWobbleAmp;
  uDome.uWobbleFreq = uDisk.uWobbleFreq;
  uDome.uWobbleRadial = uDisk.uWobbleRadial;

  const diskMat = createSurfaceMaterial(uDisk);
  const domeMat = createSurfaceMaterial(uDome);

  const diskGeom = new THREE.CircleGeometry(rTiles, DISK_SEGMENTS);
  const disk = new THREE.Mesh(diskGeom, diskMat);
  disk.rotation.x = -Math.PI / 2;
  disk.renderOrder = 2;
  disk.frustumCulled = false;
  disk.userData.inkVeilPart = "disk";
  group.add(disk);

  const domeGeom = hemisphereGeometry(rTiles, DOME_WIDTH_SEG, DOME_HEIGHT_SEG);
  const dome = new THREE.Mesh(domeGeom, domeMat);
  dome.renderOrder = 2;
  dome.frustumCulled = false;
  dome.userData.inkVeilPart = "dome";
  group.add(dome);

  const ptMat = createParticleMaterial();
  ptMat.uniforms.uRadius.value = rTiles;
  const ptGeom = buildParticleGeometry(level, rTiles);
  const points = new THREE.Points(ptGeom, ptMat);
  points.renderOrder = 3;
  points.frustumCulled = false;
  points.userData.inkVeilPart = "points";
  group.add(points);

  group.userData.sharedTime = uDisk.uTime;
  group.userData.particleMaterial = ptMat;

  return group;
}

export function applyInkVeilAuraRadius(
  group: THREE.Group,
  level: DefenseLevel,
  rTiles: number,
): void {
  for (const c of group.children) {
    if (c instanceof THREE.Mesh) {
      const part = c.userData.inkVeilPart as string | undefined;
      c.geometry.dispose();
      if (part === "disk") {
        c.geometry = new THREE.CircleGeometry(rTiles, DISK_SEGMENTS);
      } else if (part === "dome") {
        c.geometry = hemisphereGeometry(rTiles, DOME_WIDTH_SEG, DOME_HEIGHT_SEG);
      }
    } else if (c instanceof THREE.Points) {
      c.geometry.dispose();
      c.geometry = buildParticleGeometry(level, rTiles);
    }
  }

  for (const c of group.children) {
    const mat = (c as THREE.Mesh | THREE.Points).material as THREE.ShaderMaterial;
    if (!mat.uniforms) continue;
    if (mat.uniforms.uRadius) mat.uniforms.uRadius.value = rTiles;
    if (mat.uniforms.uLevel) mat.uniforms.uLevel.value = level;
    if (mat.uniforms.uSwirlSpeed) mat.uniforms.uSwirlSpeed.value = tierSwirl(level);
    if (mat.uniforms.uNoiseScale) mat.uniforms.uNoiseScale.value = 1.15 + level * 0.12;
    if (mat.uniforms.uEdgeSoftness) mat.uniforms.uEdgeSoftness.value = 0.08 + level * 0.02;
    if (mat.uniforms.uOpacityMul) mat.uniforms.uOpacityMul.value = tierOpacityMul(level);
    if (mat.uniforms.uRingHint) mat.uniforms.uRingHint.value = tierRingHint(level);
    if (mat.uniforms.uWobbleFreq) {
      const tune = getVibrationDomeTuning();
      mat.uniforms.uWobbleFreq.value = tune.wobbleFreq;
      mat.uniforms.uWobbleRadial.value = tune.wobbleRadial;
      mat.uniforms.uWobbleAmp.value = tune.wobbleEnabled ? tune.wobbleAmp : 0;
    }
  }
}

export function updateInkVeilAuraUniforms(group: THREE.Group, elapsedSec: number): void {
  const uTime = group.userData.sharedTime as { value: number } | undefined;
  if (uTime) uTime.value = elapsedSec;

  const tune = getVibrationDomeTuning();
  for (const c of group.children) {
    if (!(c instanceof THREE.Mesh)) continue;
    const mat = c.material as THREE.ShaderMaterial;
    const u = mat.uniforms;
    if (!u?.uWobbleTime) continue;
    u.uWobbleTime.value = elapsedSec * tune.wobbleTimeScale;
    u.uWobbleAmp.value = tune.wobbleEnabled ? tune.wobbleAmp : 0;
    u.uWobbleFreq.value = tune.wobbleFreq;
    u.uWobbleRadial.value = tune.wobbleRadial;
  }

  const ptMat = group.userData.particleMaterial as THREE.ShaderMaterial | undefined;
  if (ptMat?.uniforms?.uTime) ptMat.uniforms.uTime.value = elapsedSec;
}

/** Defense visual bag expected by {@link syncInkVeilAuraForDefense} (extends vibration dome vis). */
export type InkVeilAuraDefenseVis = {
  root: THREE.Group;
  inkVeilAura?: THREE.Group;
  inkVeilAuraKey?: string;
};

/**
 * Attach / update / remove Ink Veil aura under defense root (same lifecycle as vibration dome).
 */
export function syncInkVeilAuraForDefense(
  vis: InkVeilAuraDefenseVis,
  d: DefenseSnapshot,
  doc: MapDocument,
  disposeSubtree: (root: THREE.Object3D) => void,
  elapsedSec: number,
): void {
  const w = worldFromGrid(d.position[0], d.position[1], doc, 0.35);
  const tune = getVibrationDomeTuning();
  const floorY = 0.06;
  const yLocal = floorY - w.y + tune.floorYOffset;

  if (d.type === "ink_veil") {
    const rTiles = auraRadiusTiles("ink_veil", d.level);
    const auraKey = `${d.level}:${rTiles}`;

    if (!vis.inkVeilAura) {
      vis.inkVeilAura = createInkVeilAuraGroup(d.level, rTiles);
      vis.inkVeilAuraKey = auraKey;
      vis.root.add(vis.inkVeilAura);
    } else if (vis.inkVeilAuraKey !== auraKey) {
      applyInkVeilAuraRadius(vis.inkVeilAura, d.level, rTiles);
      vis.inkVeilAuraKey = auraKey;
    }

    vis.inkVeilAura.position.set(0, yLocal, 0);
    const diskOff = 0.014;
    for (const c of vis.inkVeilAura.children) {
      if (c.userData.inkVeilPart === "disk") {
        c.position.y = diskOff;
      } else if (c.userData.inkVeilPart === "dome" || c.userData.inkVeilPart === "points") {
        c.position.y = 0;
      }
    }
    updateInkVeilAuraUniforms(vis.inkVeilAura, elapsedSec);
  } else if (vis.inkVeilAura) {
    vis.root.remove(vis.inkVeilAura);
    disposeSubtree(vis.inkVeilAura);
    vis.inkVeilAura = undefined;
    vis.inkVeilAuraKey = undefined;
  }
}
