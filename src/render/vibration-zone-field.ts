import * as THREE from "three";
import type { DefenseLevel } from "../game/types.js";
import type { InkVeilSurfaceBlending } from "./ink-veil-tuning.js";
import type { VibrationDomeTuning } from "./vibration-dome-tuning.js";
import {
  applyVibrationZoneDomeRadius,
  createVibrationZoneDomeMesh,
} from "./vibration-zone-dome.js";

/** Parent group for transmission dome + optional base disk + field particles. */
export const VIBRATION_FIELD_GROUP_KIND = "vibration_zone_field";
export const VIBRATION_ZONE_DISK_KIND = "vibration_zone_base_disk";

function tierIdx(level: DefenseLevel): number {
  return level - 1;
}

function fieldBlending(mode: InkVeilSurfaceBlending): THREE.Blending {
  switch (mode) {
    case "additive":
      return THREE.AdditiveBlending;
    case "multiply":
      return THREE.MultiplyBlending;
    default:
      return THREE.NormalBlending;
  }
}

/** Vertex wobble matches Ink Veil / transmission dome ripple (disk lies in local XY). */
const vzBaseDiskVertexShader = `
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

  vLocalXZ = vec2(transformed.x, transformed.y);

  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

/**
 * Ink Veil–style fbm / swirl / streaks on the seabed disk, plus Vibration rim + edge Ks + center hole.
 * Ported from `ink-veil-aura.ts` disk branch (`uIsDome == 0`).
 */
const vzBaseDiskFragmentShader = `
uniform float uTime;
uniform float uLevel;
uniform float uRadius;
uniform float uSwirlSpeed;
uniform float uNoiseScale;
uniform float uOpacityMul;
uniform float uRingHint;
uniform vec3 uInkCore;
uniform vec3 uInkRim;
uniform vec3 uRimColor;
uniform float uRimIntensity;
uniform float uRimPower;
uniform float uDiskOpacityScale;
uniform float uEdgeSoft;
uniform float uEdgeInnerK;
uniform float uEdgeOuterK;
uniform float uEdgeDiscardK;
uniform float uCenterHole;
uniform float uCenterHoleRadius;
uniform float uFresnelPow;
uniform float uNoiseTimeScale;
uniform float uFbmStrength;
uniform float uSwirlTierBase;
uniform float uSwirlTierPerLevel;
uniform float uStreakAngFreq;
uniform float uStreakRadialFreq;
uniform float uStreakTimeScale;
uniform float uProcAlphaGlobal;

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
  float rad = max(uRadius, 0.001);
  float r = length(vLocalXZ) / rad;
  if (r > 1.0 + uEdgeSoft * uEdgeDiscardK) discard;

  float edge = 1.0 - smoothstep(
    1.0 - uEdgeSoft * uEdgeInnerK,
    1.0 + uEdgeSoft * uEdgeOuterK,
    r
  );

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

  float ring = uRingHint * smoothstep(0.04, 0.0, abs(r - 0.88)) * edge;

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormal);
  float ndv = max(0.0, dot(viewDir, N));

  float inkMix = n * 0.55 + streaks * 0.35 + pow(1.0 - ndv, uFresnelPow) * 0.12;
  vec3 base = mix(uInkCore, uInkRim, clamp(inkMix + ring * 2.5, 0.0, 1.0));

  float rimAmt = pow(1.0 - ndv, uRimPower) * uRimIntensity;
  vec3 rgb = mix(base, uRimColor, clamp(rimAmt, 0.0, 1.0));

  float alphaDisk = (0.38 + 0.1 * tier) * edge * (0.45 + 0.5 * n + streaks * 0.4);
  float alpha = alphaDisk * uOpacityMul * uDiskOpacityScale;
  alpha = clamp((alpha + ring * 0.35) * uProcAlphaGlobal, 0.0, 0.98);

  float holeW = clamp(uCenterHole, 0.0, 1.0);
  float innerR = clamp(uCenterHoleRadius, 0.001, 0.999);
  float holeAlpha = mix(1.0, smoothstep(innerR, 1.0, r), holeW);

  gl_FragColor = vec4(rgb, alpha * holeAlpha);
}
`;

/**
 * Rim-centered burst: start at turret origin, pulse along a random upper-hemisphere
 * direction to the transmission dome shell and return, with noise + 3D shell wobble.
 */
const vzFieldParticleVertexShader = `
attribute float aPhase;
attribute vec3 aDir;

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

  vec3 dir0 = aDir;
  float h0 = hash(aPhase);
  float h1 = hash(aPhase * 1.71);
  float h2 = hash(aPhase * 2.93);
  vec3 rnd = vec3(h0, h1, h2) * 2.0 - 1.0;
  vec3 dir = normalize(dir0 + rnd * uPWobAlong);
  if (dir.y < 0.02) {
    dir = normalize(dir + vec3(0.0, 0.12, 0.0));
  }

  float pulse = 0.5 - 0.5 * cos(t * uPOrbitSpeed);
  float beat = 1.0 + sin(t * uPLiftRate + aPhase * 6.2831853) * 0.07;
  pulse = clamp(pulse * beat, 0.0, 1.0);

  float rJitter = 1.0 + (hash(aPhase * 4.11) * 2.0 - 1.0) * uPWobStr;
  float rnd2 = hash(aPhase * 5.17 + 0.3) * 2.0 - 1.0;
  rJitter *= 1.0 + rnd2 * 0.04 * sin(t * uPWobFreq * 0.37 + aPhase * 3.1);

  float reach = uRadius * uPRadTight * pulse * rJitter;
  reach = min(reach, uRadius * 1.03);

  vec3 pos = dir * reach;

  float shell = pulse;
  float trans = sin(t * uPWobFreq + aPhase * uPWobPhase) * uPLiftAmp * uRadius * shell;
  float trans2 = cos(t * uPWobFreq * 1.27 + aPhase * uPWobPhase * 1.31) * uPLiftAmp * uRadius * shell * 0.62;

  vec3 bi = cross(dir, vec3(0.0, 1.0, 0.0));
  if (length(bi) < 0.02) {
    bi = cross(dir, vec3(1.0, 0.0, 0.0));
  }
  bi = normalize(bi);
  vec3 bj = normalize(cross(dir, bi));
  pos += bi * trans + bj * trans2;

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

const vzFieldParticleFragmentShader = `
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

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform directions on upper Y hemisphere (transmission dome from rim center at origin). */
function randomUnitUpperHemisphere(rng: () => number): [number, number, number] {
  const phi = 2 * Math.PI * rng();
  const y = rng();
  const sinT = Math.sqrt(Math.max(0, 1 - y * y));
  const x = sinT * Math.cos(phi);
  const z = sinT * Math.sin(phi);
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len];
}

export type VibrationFieldGroup = THREE.Group & {
  userData: {
    kind: typeof VIBRATION_FIELD_GROUP_KIND;
    vibrationDomeMesh: THREE.Mesh;
    baseDiskMesh: THREE.Mesh;
    fieldParticlePoints: THREE.Points;
    fieldParticleMaterial: THREE.ShaderMaterial;
  };
};

function vibrationParticleUniforms(
  tune: VibrationDomeTuning,
): { [key: string]: THREE.IUniform } {
  return {
    uTime: { value: 0 },
    uRadius: { value: 1 },
    uPointSizeMul: { value: tune.fieldParticlePointSizeMul },
    uColor: { value: new THREE.Color(tune.fieldParticleColor) },
    uPTimeLo: { value: tune.fieldParticleTimeLo },
    uPTimeRange: { value: tune.fieldParticleTimeRange },
    uPOrbitSpeed: { value: tune.fieldParticleOrbitSpeed },
    uPRadTight: { value: tune.fieldParticleRadialTightness },
    uPWobFreq: { value: tune.fieldParticleWobbleFreq },
    uPWobPhase: { value: tune.fieldParticleWobblePhaseMul },
    uPWobStr: { value: tune.fieldParticleWobbleStr },
    uPLiftRate: { value: tune.fieldParticleLiftRate },
    uPLiftAmp: { value: tune.fieldParticleLiftAmp },
    uPWobAlong: { value: tune.fieldParticleWobbleAlongOrbit },
    uPAlphaLo: { value: tune.fieldParticleAlphaLo },
    uPAlphaRange: { value: tune.fieldParticleAlphaRange },
    uPPxBase: { value: tune.fieldParticlePxBase },
    uPPxSpread: { value: tune.fieldParticlePxSpread },
    uPPxDepthScale: { value: tune.fieldParticlePxDepthScale },
    uPPxDepthRef: { value: tune.fieldParticlePxDepthRef },
    uPPxMin: { value: tune.fieldParticlePxMin },
    uPPxMax: { value: tune.fieldParticlePxMax },
    uPSoftInner: { value: tune.fieldParticleSoftInner },
    uPSoftOuter: { value: tune.fieldParticleSoftOuter },
    uPOpacityMul: { value: tune.fieldParticleOpacityMul },
  };
}

function pushFieldParticleUniforms(
  mat: THREE.ShaderMaterial,
  tune: VibrationDomeTuning,
): void {
  const u = mat.uniforms;
  if (!u) return;
  if (u.uPointSizeMul) u.uPointSizeMul.value = tune.fieldParticlePointSizeMul;
  if (u.uColor) u.uColor.value.set(tune.fieldParticleColor);
  if (u.uPTimeLo) u.uPTimeLo.value = tune.fieldParticleTimeLo;
  if (u.uPTimeRange) u.uPTimeRange.value = tune.fieldParticleTimeRange;
  if (u.uPOrbitSpeed) u.uPOrbitSpeed.value = tune.fieldParticleOrbitSpeed;
  if (u.uPRadTight) u.uPRadTight.value = tune.fieldParticleRadialTightness;
  if (u.uPWobFreq) u.uPWobFreq.value = tune.fieldParticleWobbleFreq;
  if (u.uPWobPhase) u.uPWobPhase.value = tune.fieldParticleWobblePhaseMul;
  if (u.uPWobStr) u.uPWobStr.value = tune.fieldParticleWobbleStr;
  if (u.uPLiftRate) u.uPLiftRate.value = tune.fieldParticleLiftRate;
  if (u.uPLiftAmp) u.uPLiftAmp.value = tune.fieldParticleLiftAmp;
  if (u.uPWobAlong) u.uPWobAlong.value = tune.fieldParticleWobbleAlongOrbit;
  if (u.uPAlphaLo) u.uPAlphaLo.value = tune.fieldParticleAlphaLo;
  if (u.uPAlphaRange) u.uPAlphaRange.value = tune.fieldParticleAlphaRange;
  if (u.uPPxBase) u.uPPxBase.value = tune.fieldParticlePxBase;
  if (u.uPPxSpread) u.uPPxSpread.value = tune.fieldParticlePxSpread;
  if (u.uPPxDepthScale) u.uPPxDepthScale.value = tune.fieldParticlePxDepthScale;
  if (u.uPPxDepthRef) u.uPPxDepthRef.value = tune.fieldParticlePxDepthRef;
  if (u.uPPxMin) u.uPPxMin.value = tune.fieldParticlePxMin;
  if (u.uPPxMax) u.uPPxMax.value = tune.fieldParticlePxMax;
  if (u.uPSoftInner) u.uPSoftInner.value = tune.fieldParticleSoftInner;
  if (u.uPSoftOuter) u.uPSoftOuter.value = tune.fieldParticleSoftOuter;
  if (u.uPOpacityMul) u.uPOpacityMul.value = tune.fieldParticleOpacityMul;
}

function syncFieldParticlePipeline(mat: THREE.ShaderMaterial, tune: VibrationDomeTuning): void {
  mat.depthWrite = tune.fieldParticleDepthWrite;
  mat.depthTest = tune.fieldParticleDepthTest;
  mat.blending = fieldBlending(tune.fieldParticleBlending);
}

function noiseScaleForVibrationBaseDisk(
  level: DefenseLevel,
  tune: VibrationDomeTuning,
): number {
  return tune.baseDiskNoiseScaleBase + level * tune.baseDiskNoiseScalePerLevel;
}

function buildFieldParticleGeometry(
  level: DefenseLevel,
  rTiles: number,
  tune: VibrationDomeTuning,
): THREE.BufferGeometry {
  const n = tune.fieldParticleCount[tierIdx(level)];
  const rng = mulberry32(0x5f3759df + level * 503 + Math.floor(rTiles * 100));
  const phases = new Float32Array(n);
  const dirs = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    phases[i] = rng();
    const [dx, dy, dz] = randomUnitUpperHemisphere(rng);
    dirs[i * 3] = dx;
    dirs[i * 3 + 1] = dy;
    dirs[i * 3 + 2] = dz;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  g.setAttribute("aDir", new THREE.BufferAttribute(dirs, 3));
  return g;
}

function createFieldParticlePoints(
  level: DefenseLevel,
  rTiles: number,
  tune: VibrationDomeTuning,
): { points: THREE.Points; material: THREE.ShaderMaterial } {
  const mat = new THREE.ShaderMaterial({
    uniforms: vibrationParticleUniforms(tune),
    vertexShader: vzFieldParticleVertexShader,
    fragmentShader: vzFieldParticleFragmentShader,
    transparent: true,
    depthWrite: tune.fieldParticleDepthWrite,
    depthTest: tune.fieldParticleDepthTest,
    blending: fieldBlending(tune.fieldParticleBlending),
  });
  mat.uniforms.uRadius.value = rTiles;
  const geom = buildFieldParticleGeometry(level, rTiles, tune);
  const points = new THREE.Points(geom, mat);
  points.frustumCulled = false;
  points.userData.kind = "vibration_zone_field_particles";
  return { points, material: mat };
}

function createBaseDiskMesh(
  level: DefenseLevel,
  rTiles: number,
  tune: VibrationDomeTuning,
): THREE.Mesh {
  const li = tierIdx(level);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLevel: { value: level },
      uRadius: { value: rTiles },
      uSwirlSpeed: { value: tune.baseDiskSwirlSpeed[li] },
      uNoiseScale: { value: noiseScaleForVibrationBaseDisk(level, tune) },
      uOpacityMul: { value: tune.baseDiskOpacityMul[li] },
      uRingHint: { value: tune.baseDiskRingHint[li] },
      uInkCore: { value: new THREE.Color(tune.baseDiskColor) },
      uInkRim: { value: new THREE.Color(tune.fresnelColor) },
      uRimColor: { value: new THREE.Color(tune.baseDiskRimColor) },
      uRimIntensity: { value: tune.baseDiskRimIntensity },
      uRimPower: { value: tune.baseDiskRimPower },
      uDiskOpacityScale: { value: tune.baseDiskOpacity },
      uEdgeSoft: { value: tune.baseDiskEdgeSoftness },
      uEdgeInnerK: { value: tune.baseDiskEdgeInnerK },
      uEdgeOuterK: { value: tune.baseDiskEdgeOuterK },
      uEdgeDiscardK: { value: tune.baseDiskEdgeDiscardK },
      uCenterHole: { value: tune.baseDiskCenterHole },
      uCenterHoleRadius: { value: tune.baseDiskCenterHoleRadius },
      uFresnelPow: { value: tune.baseDiskFresnelPow },
      uNoiseTimeScale: { value: tune.baseDiskNoiseTimeScale },
      uFbmStrength: { value: tune.baseDiskFbmStrength },
      uSwirlTierBase: { value: tune.baseDiskSwirlTierBase },
      uSwirlTierPerLevel: { value: tune.baseDiskSwirlTierPerLevel },
      uStreakAngFreq: { value: tune.baseDiskStreakAngFreq },
      uStreakRadialFreq: { value: tune.baseDiskStreakRadialFreq },
      uStreakTimeScale: { value: tune.baseDiskStreakTimeScale },
      uProcAlphaGlobal: { value: tune.baseDiskProcAlphaGlobal },
      uWobbleTime: { value: 0 },
      uWobbleAmp: { value: tune.wobbleEnabled ? tune.wobbleAmp : 0 },
      uWobbleFreq: { value: tune.wobbleFreq },
      uWobbleRadial: { value: tune.wobbleRadial },
    },
    vertexShader: vzBaseDiskVertexShader,
    fragmentShader: vzBaseDiskFragmentShader,
    transparent: true,
    depthWrite: tune.baseDiskDepthWrite,
    depthTest: tune.baseDiskDepthTest,
    blending: fieldBlending(tune.baseDiskBlending),
    side: THREE.DoubleSide,
  });
  const geom = new THREE.CircleGeometry(rTiles, tune.baseDiskSegments);
  const disk = new THREE.Mesh(geom, mat);
  disk.rotation.x = -Math.PI / 2;
  disk.frustumCulled = false;
  disk.userData.kind = VIBRATION_ZONE_DISK_KIND;
  return disk;
}

function pushBaseDiskUniforms(
  mesh: THREE.Mesh,
  level: DefenseLevel,
  rTiles: number,
  tune: VibrationDomeTuning,
  elapsedSec: number,
): void {
  const mat = mesh.material as THREE.ShaderMaterial;
  const u = mat.uniforms;
  const li = tierIdx(level);
  if (u.uTime) u.uTime.value = elapsedSec;
  if (u.uLevel) u.uLevel.value = level;
  if (u.uRadius) u.uRadius.value = rTiles;
  if (u.uSwirlSpeed) u.uSwirlSpeed.value = tune.baseDiskSwirlSpeed[li];
  if (u.uNoiseScale) u.uNoiseScale.value = noiseScaleForVibrationBaseDisk(level, tune);
  if (u.uOpacityMul) u.uOpacityMul.value = tune.baseDiskOpacityMul[li];
  if (u.uRingHint) u.uRingHint.value = tune.baseDiskRingHint[li];
  if (u.uInkCore) u.uInkCore.value.set(tune.baseDiskColor);
  if (u.uInkRim) u.uInkRim.value.set(tune.fresnelColor);
  if (u.uRimColor) u.uRimColor.value.set(tune.baseDiskRimColor);
  if (u.uRimIntensity) u.uRimIntensity.value = tune.baseDiskRimIntensity;
  if (u.uRimPower) u.uRimPower.value = tune.baseDiskRimPower;
  if (u.uDiskOpacityScale) u.uDiskOpacityScale.value = tune.baseDiskOpacity;
  if (u.uEdgeSoft) u.uEdgeSoft.value = tune.baseDiskEdgeSoftness;
  if (u.uEdgeInnerK) u.uEdgeInnerK.value = tune.baseDiskEdgeInnerK;
  if (u.uEdgeOuterK) u.uEdgeOuterK.value = tune.baseDiskEdgeOuterK;
  if (u.uEdgeDiscardK) u.uEdgeDiscardK.value = tune.baseDiskEdgeDiscardK;
  if (u.uCenterHole) u.uCenterHole.value = tune.baseDiskCenterHole;
  if (u.uCenterHoleRadius) u.uCenterHoleRadius.value = tune.baseDiskCenterHoleRadius;
  if (u.uFresnelPow) u.uFresnelPow.value = tune.baseDiskFresnelPow;
  if (u.uNoiseTimeScale) u.uNoiseTimeScale.value = tune.baseDiskNoiseTimeScale;
  if (u.uFbmStrength) u.uFbmStrength.value = tune.baseDiskFbmStrength;
  if (u.uSwirlTierBase) u.uSwirlTierBase.value = tune.baseDiskSwirlTierBase;
  if (u.uSwirlTierPerLevel) u.uSwirlTierPerLevel.value = tune.baseDiskSwirlTierPerLevel;
  if (u.uStreakAngFreq) u.uStreakAngFreq.value = tune.baseDiskStreakAngFreq;
  if (u.uStreakRadialFreq) u.uStreakRadialFreq.value = tune.baseDiskStreakRadialFreq;
  if (u.uStreakTimeScale) u.uStreakTimeScale.value = tune.baseDiskStreakTimeScale;
  if (u.uProcAlphaGlobal) u.uProcAlphaGlobal.value = tune.baseDiskProcAlphaGlobal;
  if (u.uWobbleTime) u.uWobbleTime.value = elapsedSec * tune.wobbleTimeScale;
  if (u.uWobbleAmp) u.uWobbleAmp.value = tune.wobbleEnabled ? tune.wobbleAmp : 0;
  if (u.uWobbleFreq) u.uWobbleFreq.value = tune.wobbleFreq;
  if (u.uWobbleRadial) u.uWobbleRadial.value = tune.wobbleRadial;
}

function syncBaseDiskPipeline(mesh: THREE.Mesh, tune: VibrationDomeTuning): void {
  const mat = mesh.material as THREE.ShaderMaterial;
  mat.depthWrite = tune.baseDiskDepthWrite;
  mat.depthTest = tune.baseDiskDepthTest;
  mat.blending = fieldBlending(tune.baseDiskBlending);
}

export function vibrationFieldSyncKey(
  level: DefenseLevel,
  rTiles: number,
  tune: VibrationDomeTuning,
): string {
  const li = tierIdx(level);
  return [
    level,
    rTiles,
    tune.geometryWidthSegments,
    tune.geometryHeightSegments,
    tune.baseDiskEnabled ? 1 : 0,
    tune.baseDiskSegments,
    tune.fieldParticlesEnabled ? 1 : 0,
    tune.fieldParticleCount[li],
    tune.fieldParticlePointSizeMul.toFixed(4),
    "fpShellPulse",
  ].join(":");
}

export function createVibrationFieldGroup(
  level: DefenseLevel,
  rTiles: number,
  tune: VibrationDomeTuning,
): VibrationFieldGroup {
  const group = new THREE.Group() as VibrationFieldGroup;
  group.userData.kind = VIBRATION_FIELD_GROUP_KIND;

  const dome = createVibrationZoneDomeMesh(level, rTiles);
  dome.renderOrder = tune.renderOrder;
  group.add(dome);
  group.userData.vibrationDomeMesh = dome;

  const disk = createBaseDiskMesh(level, rTiles, tune);
  disk.renderOrder = tune.baseDiskRenderOrder;
  disk.position.y = tune.baseDiskYOffset;
  disk.visible = tune.baseDiskEnabled;
  group.add(disk);
  group.userData.baseDiskMesh = disk;

  const { points, material } = createFieldParticlePoints(level, rTiles, tune);
  points.position.y = tune.fieldParticleYOffset;
  points.renderOrder = tune.fieldParticleRenderOrder;
  points.visible = tune.fieldParticlesEnabled;
  group.add(points);
  group.userData.fieldParticlePoints = points;
  group.userData.fieldParticleMaterial = material;

  return group;
}

export function applyVibrationFieldRadiusAndParts(
  group: THREE.Group,
  level: DefenseLevel,
  rTiles: number,
  tune: VibrationDomeTuning,
): void {
  const g = group as VibrationFieldGroup;
  applyVibrationZoneDomeRadius(
    g.userData.vibrationDomeMesh,
    level,
    rTiles,
    tune.geometryWidthSegments,
    tune.geometryHeightSegments,
  );

  const disk = g.userData.baseDiskMesh;
  disk.geometry.dispose();
  disk.geometry = new THREE.CircleGeometry(rTiles, tune.baseDiskSegments);
  pushBaseDiskUniforms(disk, level, rTiles, tune, 0);
  syncBaseDiskPipeline(disk, tune);

  const pts = g.userData.fieldParticlePoints;
  pts.position.y = tune.fieldParticleYOffset;
  pts.geometry.dispose();
  pts.geometry = buildFieldParticleGeometry(level, rTiles, tune);
  g.userData.fieldParticleMaterial.uniforms.uRadius.value = rTiles;
  pushFieldParticleUniforms(g.userData.fieldParticleMaterial, tune);
  syncFieldParticlePipeline(g.userData.fieldParticleMaterial, tune);
}

export function updateVibrationFieldVisuals(
  group: THREE.Group,
  level: DefenseLevel,
  rTiles: number,
  elapsedSec: number,
  tune: VibrationDomeTuning,
): void {
  const g = group as VibrationFieldGroup;
  g.userData.vibrationDomeMesh.renderOrder = tune.renderOrder;
  g.userData.baseDiskMesh.visible = tune.baseDiskEnabled;
  g.userData.baseDiskMesh.renderOrder = tune.baseDiskRenderOrder;
  g.userData.baseDiskMesh.position.y = tune.baseDiskYOffset;
  g.userData.fieldParticlePoints.visible = tune.fieldParticlesEnabled;
  g.userData.fieldParticlePoints.renderOrder = tune.fieldParticleRenderOrder;
  g.userData.fieldParticlePoints.position.y = tune.fieldParticleYOffset;

  pushBaseDiskUniforms(g.userData.baseDiskMesh, level, rTiles, tune, elapsedSec);
  syncBaseDiskPipeline(g.userData.baseDiskMesh, tune);

  const ptMat = g.userData.fieldParticleMaterial;
  ptMat.uniforms.uTime.value = elapsedSec;
  pushFieldParticleUniforms(ptMat, tune);
  syncFieldParticlePipeline(ptMat, tune);
}

/** Extracts the transmission dome mesh for tier + edge sync. */
export function getVibrationFieldDomeMesh(group: THREE.Group): THREE.Mesh {
  return (group as VibrationFieldGroup).userData.vibrationDomeMesh;
}
