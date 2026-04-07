import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import { auraRadiusTiles } from "../game/damage-resolver.js";
import type { DefenseLevel, DefenseSnapshot } from "../game/types.js";
import {
  getInkVeilTuning,
  inkVeilGeometryKey,
  type InkVeilSurfaceBlending,
  type InkVeilTuning,
} from "./ink-veil-tuning.js";
import { worldFromGrid } from "./board.js";

/** UserData tag for dispose / filtering. */
export const INK_VEIL_AURA_USERDATA_KIND = "ink_veil_aura";

function tierIdx(level: DefenseLevel): number {
  return level - 1;
}

function inkVeilBlending(mode: InkVeilSurfaceBlending): THREE.Blending {
  switch (mode) {
    case "additive":
      return THREE.AdditiveBlending;
    case "multiply":
      return THREE.MultiplyBlending;
    default:
      return THREE.NormalBlending;
  }
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
uniform float uFresnelPow;
uniform float uNoiseTimeScale;
uniform float uFbmStrength;
uniform float uSwirlTierBase;
uniform float uSwirlTierPerLevel;
uniform float uStreakAngFreq;
uniform float uStreakRadialFreq;
uniform float uStreakTimeScale;
uniform float uAlphaGlobal;

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
  float swirl = uSwirlSpeed * (uSwirlTierBase + uSwirlTierPerLevel * tier);
  float aSw = aAng + uTime * swirl;
  vec2 p = vLocalXZ * uNoiseScale * 0.12;
  p = vec2(
    p.x * cos(aSw * 0.15) - p.y * sin(aSw * 0.15),
    p.x * sin(aSw * 0.15) + p.y * cos(aSw * 0.15)
  );
  p += vec2(
    fbm(p * 0.7 + uTime * 0.18 * uNoiseTimeScale),
    fbm(p.yx * 0.85 - uTime * 0.12 * uNoiseTimeScale)
  ) * (0.28 + 0.1 * tier) * uFbmStrength;
  float n = fbm(p + vec2(3.1, 7.7));
  float n2 = fbm(p * 1.7 + uTime * 0.25);
  float streaks = smoothstep(0.2, 0.95, abs(sin(uStreakAngFreq * aAng + uStreakRadialFreq * r - uTime * uStreakTimeScale))) * (0.35 + 0.45 * n2);

  float edge = 1.0 - smoothstep(1.0 - uEdgeSoftness * 2.2, 1.0 + uEdgeSoftness * 0.6, r);
  float ring = uRingHint * smoothstep(0.04, 0.0, abs(r - 0.88)) * edge;

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormal);
  float ndv = max(0.0, dot(viewDir, N));
  float fresnel = pow(1.0 - ndv, uFresnelPow);

  float domeW = uIsDome;
  float inkMix = mix(n * 0.55 + streaks * 0.35, fresnel * 0.85 + n * 0.25, domeW);
  vec3 base = mix(uInkCore, uInkRim, clamp(inkMix + ring * 2.5, 0.0, 1.0));

  float alphaDisk = (0.38 + 0.1 * tier) * edge * (0.45 + 0.5 * n + streaks * 0.4);
  float alphaDome = (0.22 + 0.06 * tier) * edge * (0.5 + 0.45 * fresnel) + fresnel * 0.35 * edge;
  float alpha = mix(alphaDisk, alphaDome, domeW) * uOpacityMul;
  alpha = clamp((alpha + ring * 0.35) * uAlphaGlobal, 0.0, 0.98);

  gl_FragColor = vec4(base, alpha);
}
`;

const inkParticleVertexShader = `
attribute float aPhase;
attribute float aR;

uniform float uTime;
uniform float uRadius;
uniform float uPointSizeMul;
uniform float uPTimeLo;
uniform float uPTimeRange;
uniform float uPOrbitSpeed;
uniform float uPRadTight;
uniform float uPWobFreq;
uniform float uPWobPhase;
uniform float uPWobStr;
uniform float uPLiftRate;
uniform float uPLiftAmp;
uniform float uPWobAlong;
uniform float uPAlphaLo;
uniform float uPAlphaRange;
uniform float uPPxBase;
uniform float uPPxSpread;
uniform float uPPxDepthScale;
uniform float uPPxDepthRef;
uniform float uPPxMin;
uniform float uPPxMax;

varying float vAlpha;

float hash(float x) {
  return fract(sin(x * 127.1) * 43758.5453);
}

void main() {
  float t = uTime * (uPTimeLo + hash(aPhase) * uPTimeRange);
  float ang = aPhase * 6.2831853 + t * uPOrbitSpeed;
  float rad = aR * uRadius * uPRadTight;
  float wobble = sin(t * uPWobFreq + aPhase * uPWobPhase) * uPWobStr * uRadius;
  vec2 radial = vec2(cos(ang), sin(ang)) * rad;
  vec2 tangent = vec2(-sin(ang), cos(ang));
  vec2 xz = radial + tangent * (wobble * uPWobAlong);
  vec3 pos = vec3(xz.x, abs(sin(t * uPLiftRate + aPhase)) * uRadius * uPLiftAmp, xz.y);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = uPAlphaLo + uPAlphaRange * hash(aPhase * 3.17 + 2.0);
  float ps = uPointSizeMul * (uPPxBase + uPPxSpread * hash(aPhase + 1.0));
  gl_PointSize = clamp(
    ps * (uPPxDepthScale / max(-mvPosition.z, uPPxDepthRef)),
    uPPxMin,
    uPPxMax
  );
}
`;

const inkParticleFragmentShader = `
uniform vec3 uColor;
uniform float uPSoftInner;
uniform float uPSoftOuter;
uniform float uPOpacityMul;

varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) discard;
  float soft = 1.0 - smoothstep(uPSoftInner, uPSoftOuter, d);
  gl_FragColor = vec4(uColor, soft * vAlpha * uPOpacityMul);
}
`;

function noiseScaleForLevel(level: DefenseLevel, t: InkVeilTuning): number {
  return t.noiseScaleBase + level * t.noiseScalePerLevel;
}

function edgeSoftnessForLevel(level: DefenseLevel, t: InkVeilTuning): number {
  return t.edgeSoftnessBase + level * t.edgeSoftnessPerLevel;
}

function createSharedInkUniforms(
  level: DefenseLevel,
  rTiles: number,
  isDome: number,
  tune: InkVeilTuning,
): { [uniform: string]: THREE.IUniform } {
  const core = new THREE.Color(tune.inkCoreColor);
  const rim = new THREE.Color(tune.inkRimColor);
  const li = tierIdx(level);
  return {
    uTime: { value: 0 },
    uLevel: { value: level },
    uRadius: { value: rTiles },
    uSwirlSpeed: { value: tune.swirlSpeed[li] },
    uNoiseScale: { value: noiseScaleForLevel(level, tune) },
    uEdgeSoftness: { value: edgeSoftnessForLevel(level, tune) },
    uInkCore: { value: core },
    uInkRim: { value: rim },
    uIsDome: { value: isDome },
    uOpacityMul: { value: tune.opacityMul[li] },
    uRingHint: { value: tune.ringHint[li] },
    uFresnelPow: { value: tune.fresnelPow },
    uNoiseTimeScale: { value: tune.noiseTimeScale },
    uFbmStrength: { value: tune.fbmStrength },
    uSwirlTierBase: { value: tune.swirlTierBase },
    uSwirlTierPerLevel: { value: tune.swirlTierPerLevel },
    uStreakAngFreq: { value: tune.streakAngFreq },
    uStreakRadialFreq: { value: tune.streakRadialFreq },
    uStreakTimeScale: { value: tune.streakTimeScale },
    uAlphaGlobal: { value: tune.alphaGlobal },
    uWobbleTime: { value: 0 },
    uWobbleAmp: { value: tune.wobbleEnabled ? tune.wobbleAmp : 0 },
    uWobbleFreq: { value: tune.wobbleFreq },
    uWobbleRadial: { value: tune.wobbleRadial },
  };
}

function createSurfaceMaterial(
  shared: { [uniform: string]: THREE.IUniform },
  tune: InkVeilTuning,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: inkVeilVertexShader,
    fragmentShader: inkVeilFragmentShader,
    transparent: true,
    depthWrite: tune.surfaceDepthWrite,
    depthTest: tune.surfaceDepthTest,
    blending: inkVeilBlending(tune.surfaceBlending),
    side: THREE.DoubleSide,
  });
}

function particleUniformsFromTuning(
  tune: InkVeilTuning,
): { [key: string]: THREE.IUniform } {
  return {
    uTime: { value: 0 },
    uRadius: { value: 1 },
    uPointSizeMul: { value: tune.particlePointSizeMul },
    uColor: { value: new THREE.Color(tune.particleColor) },
    uPTimeLo: { value: tune.particleTimeLo },
    uPTimeRange: { value: tune.particleTimeRange },
    uPOrbitSpeed: { value: tune.particleOrbitSpeed },
    uPRadTight: { value: tune.particleRadialTightness },
    uPWobFreq: { value: tune.particleWobbleFreq },
    uPWobPhase: { value: tune.particleWobblePhaseMul },
    uPWobStr: { value: tune.particleWobbleStr },
    uPLiftRate: { value: tune.particleLiftRate },
    uPLiftAmp: { value: tune.particleLiftAmp },
    uPWobAlong: { value: tune.particleWobbleAlongOrbit },
    uPAlphaLo: { value: tune.particleAlphaLo },
    uPAlphaRange: { value: tune.particleAlphaRange },
    uPPxBase: { value: tune.particlePxBase },
    uPPxSpread: { value: tune.particlePxSpread },
    uPPxDepthScale: { value: tune.particlePxDepthScale },
    uPPxDepthRef: { value: tune.particlePxDepthRef },
    uPPxMin: { value: tune.particlePxMin },
    uPPxMax: { value: tune.particlePxMax },
    uPSoftInner: { value: tune.particleSoftInner },
    uPSoftOuter: { value: tune.particleSoftOuter },
    uPOpacityMul: { value: tune.particleOpacityMul },
  };
}

function pushParticleUniformsFromTuning(mat: THREE.ShaderMaterial, tune: InkVeilTuning): void {
  const u = mat.uniforms;
  if (!u) return;
  if (u.uPointSizeMul) u.uPointSizeMul.value = tune.particlePointSizeMul;
  if (u.uColor) u.uColor.value.set(tune.particleColor);
  if (u.uPTimeLo) u.uPTimeLo.value = tune.particleTimeLo;
  if (u.uPTimeRange) u.uPTimeRange.value = tune.particleTimeRange;
  if (u.uPOrbitSpeed) u.uPOrbitSpeed.value = tune.particleOrbitSpeed;
  if (u.uPRadTight) u.uPRadTight.value = tune.particleRadialTightness;
  if (u.uPWobFreq) u.uPWobFreq.value = tune.particleWobbleFreq;
  if (u.uPWobPhase) u.uPWobPhase.value = tune.particleWobblePhaseMul;
  if (u.uPWobStr) u.uPWobStr.value = tune.particleWobbleStr;
  if (u.uPLiftRate) u.uPLiftRate.value = tune.particleLiftRate;
  if (u.uPLiftAmp) u.uPLiftAmp.value = tune.particleLiftAmp;
  if (u.uPWobAlong) u.uPWobAlong.value = tune.particleWobbleAlongOrbit;
  if (u.uPAlphaLo) u.uPAlphaLo.value = tune.particleAlphaLo;
  if (u.uPAlphaRange) u.uPAlphaRange.value = tune.particleAlphaRange;
  if (u.uPPxBase) u.uPPxBase.value = tune.particlePxBase;
  if (u.uPPxSpread) u.uPPxSpread.value = tune.particlePxSpread;
  if (u.uPPxDepthScale) u.uPPxDepthScale.value = tune.particlePxDepthScale;
  if (u.uPPxDepthRef) u.uPPxDepthRef.value = tune.particlePxDepthRef;
  if (u.uPPxMin) u.uPPxMin.value = tune.particlePxMin;
  if (u.uPPxMax) u.uPPxMax.value = tune.particlePxMax;
  if (u.uPSoftInner) u.uPSoftInner.value = tune.particleSoftInner;
  if (u.uPSoftOuter) u.uPSoftOuter.value = tune.particleSoftOuter;
  if (u.uPOpacityMul) u.uPOpacityMul.value = tune.particleOpacityMul;
}

function syncParticleMaterialOptions(mat: THREE.ShaderMaterial, tune: InkVeilTuning): void {
  mat.depthWrite = tune.particleDepthWrite;
  mat.depthTest = tune.particleDepthTest;
  mat.blending = inkVeilBlending(tune.particleBlending);
}

function createParticleMaterial(tune: InkVeilTuning): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: particleUniformsFromTuning(tune),
    vertexShader: inkParticleVertexShader,
    fragmentShader: inkParticleFragmentShader,
    transparent: true,
    depthWrite: tune.particleDepthWrite,
    depthTest: tune.particleDepthTest,
    blending: inkVeilBlending(tune.particleBlending),
  });
  return mat;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildParticleGeometry(
  level: DefenseLevel,
  rTiles: number,
  tune: InkVeilTuning,
): THREE.BufferGeometry {
  const n = tune.particleCount[tierIdx(level)];
  const rng = mulberry32(0x1eec0de + level * 997 + Math.floor(rTiles * 100));
  const phases = new Float32Array(n);
  const rs = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    phases[i] = rng();
    rs[i] = tune.particleSpawnRMin + rng() * tune.particleSpawnRRange;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  g.setAttribute("aR", new THREE.BufferAttribute(rs, 1));
  return g;
}

/** Full sync key when geometry, level, radius, or particle settings change. */
export function inkVeilAuraSyncKey(
  level: DefenseLevel,
  rTiles: number,
  tune: InkVeilTuning,
): string {
  const li = tierIdx(level);
  return [
    level,
    rTiles,
    inkVeilGeometryKey(tune),
    tune.particleCount[li],
    tune.particlePointSizeMul.toFixed(4),
    tune.particleSpawnRMin.toFixed(4),
    tune.particleSpawnRRange.toFixed(4),
  ].join(":");
}

function pushSurfaceUniformsFromTuning(
  mat: THREE.ShaderMaterial,
  level: DefenseLevel,
  rTiles: number,
  tune: InkVeilTuning,
): void {
  const u = mat.uniforms;
  if (!u) return;
  const li = tierIdx(level);
  if (u.uLevel) u.uLevel.value = level;
  if (u.uRadius) u.uRadius.value = rTiles;
  if (u.uSwirlSpeed) u.uSwirlSpeed.value = tune.swirlSpeed[li];
  if (u.uNoiseScale) u.uNoiseScale.value = noiseScaleForLevel(level, tune);
  if (u.uEdgeSoftness) u.uEdgeSoftness.value = edgeSoftnessForLevel(level, tune);
  if (u.uInkCore) u.uInkCore.value.set(tune.inkCoreColor);
  if (u.uInkRim) u.uInkRim.value.set(tune.inkRimColor);
  if (u.uOpacityMul) u.uOpacityMul.value = tune.opacityMul[li];
  if (u.uRingHint) u.uRingHint.value = tune.ringHint[li];
  if (u.uFresnelPow) u.uFresnelPow.value = tune.fresnelPow;
  if (u.uNoiseTimeScale) u.uNoiseTimeScale.value = tune.noiseTimeScale;
  if (u.uFbmStrength) u.uFbmStrength.value = tune.fbmStrength;
  if (u.uSwirlTierBase) u.uSwirlTierBase.value = tune.swirlTierBase;
  if (u.uSwirlTierPerLevel) u.uSwirlTierPerLevel.value = tune.swirlTierPerLevel;
  if (u.uStreakAngFreq) u.uStreakAngFreq.value = tune.streakAngFreq;
  if (u.uStreakRadialFreq) u.uStreakRadialFreq.value = tune.streakRadialFreq;
  if (u.uStreakTimeScale) u.uStreakTimeScale.value = tune.streakTimeScale;
  if (u.uAlphaGlobal) u.uAlphaGlobal.value = tune.alphaGlobal;
  if (u.uWobbleFreq) u.uWobbleFreq.value = tune.wobbleFreq;
  if (u.uWobbleRadial) u.uWobbleRadial.value = tune.wobbleRadial;
  if (u.uWobbleAmp) {
    u.uWobbleAmp.value = tune.wobbleEnabled ? tune.wobbleAmp : 0;
  }
}

function syncSurfaceMaterialOptions(
  mat: THREE.ShaderMaterial,
  tune: InkVeilTuning,
): void {
  mat.depthWrite = tune.surfaceDepthWrite;
  mat.depthTest = tune.surfaceDepthTest;
  mat.blending = inkVeilBlending(tune.surfaceBlending);
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
  const tune = getInkVeilTuning();
  const group = new THREE.Group() as InkVeilAuraGroup;
  group.userData.kind = INK_VEIL_AURA_USERDATA_KIND;

  const uDisk = createSharedInkUniforms(level, rTiles, 0, tune);
  const uDome = createSharedInkUniforms(level, rTiles, 1, tune);
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
  uDome.uFresnelPow = uDisk.uFresnelPow;
  uDome.uNoiseTimeScale = uDisk.uNoiseTimeScale;
  uDome.uFbmStrength = uDisk.uFbmStrength;
  uDome.uSwirlTierBase = uDisk.uSwirlTierBase;
  uDome.uSwirlTierPerLevel = uDisk.uSwirlTierPerLevel;
  uDome.uStreakAngFreq = uDisk.uStreakAngFreq;
  uDome.uStreakRadialFreq = uDisk.uStreakRadialFreq;
  uDome.uStreakTimeScale = uDisk.uStreakTimeScale;
  uDome.uAlphaGlobal = uDisk.uAlphaGlobal;
  uDome.uWobbleTime = uDisk.uWobbleTime;
  uDome.uWobbleAmp = uDisk.uWobbleAmp;
  uDome.uWobbleFreq = uDisk.uWobbleFreq;
  uDome.uWobbleRadial = uDisk.uWobbleRadial;

  const diskMat = createSurfaceMaterial(uDisk, tune);
  const domeMat = createSurfaceMaterial(uDome, tune);

  const diskGeom = new THREE.CircleGeometry(rTiles, tune.diskSegments);
  const disk = new THREE.Mesh(diskGeom, diskMat);
  disk.rotation.x = -Math.PI / 2;
  disk.renderOrder = tune.renderOrderSurface;
  disk.frustumCulled = false;
  disk.userData.inkVeilPart = "disk";
  group.add(disk);

  const domeGeom = hemisphereGeometry(
    rTiles,
    tune.domeWidthSegments,
    tune.domeHeightSegments,
  );
  const dome = new THREE.Mesh(domeGeom, domeMat);
  dome.renderOrder = tune.renderOrderSurface;
  dome.frustumCulled = false;
  dome.userData.inkVeilPart = "dome";
  group.add(dome);

  const ptMat = createParticleMaterial(tune);
  ptMat.uniforms.uRadius.value = rTiles;
  const ptGeom = buildParticleGeometry(level, rTiles, tune);
  const points = new THREE.Points(ptGeom, ptMat);
  points.renderOrder = tune.renderOrderParticles;
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
  const tune = getInkVeilTuning();
  for (const c of group.children) {
    if (c instanceof THREE.Mesh) {
      const part = c.userData.inkVeilPart as string | undefined;
      c.geometry.dispose();
      if (part === "disk") {
        c.geometry = new THREE.CircleGeometry(rTiles, tune.diskSegments);
      } else if (part === "dome") {
        c.geometry = hemisphereGeometry(
          rTiles,
          tune.domeWidthSegments,
          tune.domeHeightSegments,
        );
      }
    } else if (c instanceof THREE.Points) {
      c.geometry.dispose();
      c.geometry = buildParticleGeometry(level, rTiles, tune);
    }
  }

  for (const c of group.children) {
    const mat = (c as THREE.Mesh | THREE.Points).material as THREE.ShaderMaterial;
    if (!mat.uniforms) continue;
    if (mat.uniforms.uRadius) mat.uniforms.uRadius.value = rTiles;
    if (mat.uniforms.uLevel) mat.uniforms.uLevel.value = level;
    if (c instanceof THREE.Mesh) {
      pushSurfaceUniformsFromTuning(mat, level, rTiles, tune);
    } else if (mat.uniforms.uPointSizeMul) {
      pushParticleUniformsFromTuning(mat, tune);
      syncParticleMaterialOptions(mat, tune);
    }
  }
}

function syncGroupRenderAndMaterials(group: THREE.Group, tune: InkVeilTuning): void {
  for (const c of group.children) {
    if (c.userData.inkVeilPart === "disk" || c.userData.inkVeilPart === "dome") {
      c.renderOrder = tune.renderOrderSurface;
      syncSurfaceMaterialOptions(c.material as THREE.ShaderMaterial, tune);
    } else if (c.userData.inkVeilPart === "points") {
      c.renderOrder = tune.renderOrderParticles;
      syncParticleMaterialOptions(c.material as THREE.ShaderMaterial, tune);
    }
  }
}

export function updateInkVeilAuraUniforms(group: THREE.Group, elapsedSec: number): void {
  const tune = getInkVeilTuning();
  const uTime = group.userData.sharedTime as { value: number } | undefined;
  if (uTime) uTime.value = elapsedSec;

  for (const c of group.children) {
    if (!(c instanceof THREE.Mesh)) continue;
    const u = (c.material as THREE.ShaderMaterial).uniforms;
    if (u?.uWobbleTime) {
      u.uWobbleTime.value = elapsedSec * tune.wobbleTimeScale;
    }
  }

  const ptMatEarly = group.userData.particleMaterial as THREE.ShaderMaterial | undefined;
  if (ptMatEarly?.uniforms?.uTime) ptMatEarly.uniforms.uTime.value = elapsedSec;

  syncGroupRenderAndMaterials(group, tune);

  if (!tune.applyOverrides) {
    return;
  }

  for (const c of group.children) {
    if (!(c instanceof THREE.Mesh)) continue;
    const mat = c.material as THREE.ShaderMaterial;
    const u = mat.uniforms;
    if (!u?.uWobbleTime) continue;
    u.uWobbleAmp.value = tune.wobbleEnabled ? tune.wobbleAmp : 0;
    u.uWobbleFreq.value = tune.wobbleFreq;
    u.uWobbleRadial.value = tune.wobbleRadial;
    u.uFresnelPow.value = tune.fresnelPow;
    u.uNoiseTimeScale.value = tune.noiseTimeScale;
    u.uFbmStrength.value = tune.fbmStrength;
    u.uSwirlTierBase.value = tune.swirlTierBase;
    u.uSwirlTierPerLevel.value = tune.swirlTierPerLevel;
    u.uStreakAngFreq.value = tune.streakAngFreq;
    u.uStreakRadialFreq.value = tune.streakRadialFreq;
    u.uStreakTimeScale.value = tune.streakTimeScale;
    u.uAlphaGlobal.value = tune.alphaGlobal;
    u.uInkCore.value.set(tune.inkCoreColor);
    u.uInkRim.value.set(tune.inkRimColor);
  }

  const ptMat = group.userData.particleMaterial as THREE.ShaderMaterial | undefined;
  if (ptMat?.uniforms?.uTime) ptMat.uniforms.uTime.value = elapsedSec;
  if (ptMat) {
    pushParticleUniformsFromTuning(ptMat, tune);
    syncParticleMaterialOptions(ptMat, tune);
  }
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
  const tune = getInkVeilTuning();
  const floorY = 0.06;
  const yLocal = floorY - w.y + tune.floorYOffset;

  if (d.type === "ink_veil") {
    const rTiles = auraRadiusTiles("ink_veil", d.level);
    const auraKey = inkVeilAuraSyncKey(d.level, rTiles, tune);

    if (!vis.inkVeilAura) {
      vis.inkVeilAura = createInkVeilAuraGroup(d.level, rTiles);
      vis.inkVeilAuraKey = auraKey;
      vis.root.add(vis.inkVeilAura);
    } else if (vis.inkVeilAuraKey !== auraKey) {
      applyInkVeilAuraRadius(vis.inkVeilAura, d.level, rTiles);
      vis.inkVeilAuraKey = auraKey;
    }

    vis.inkVeilAura.position.set(0, yLocal, 0);
    const diskOff = tune.diskYOffset;
    for (const c of vis.inkVeilAura.children) {
      if (c.userData.inkVeilPart === "disk") {
        c.position.y = diskOff;
      } else if (
        c.userData.inkVeilPart === "dome" ||
        c.userData.inkVeilPart === "points"
      ) {
        c.position.y = 0;
      }
    }

    if (tune.applyOverrides) {
      const level = d.level;
      for (const c of vis.inkVeilAura.children) {
        if (c instanceof THREE.Mesh) {
          pushSurfaceUniformsFromTuning(
            c.material as THREE.ShaderMaterial,
            level,
            rTiles,
            tune,
          );
        }
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
