import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import type { BubblePopFx, BubbleProjectileState } from "../game/bubble-projectiles.js";
import {
  getBubbleAttackFxTuning,
  type BubbleAttackFxTuning,
} from "./bubble-attack-fx-tuning.js";
import { worldFromGrid } from "./board.js";

let lastAppliedGeometryRev = -1;

const bubbleClusterVertexShader = `
attribute float aPhase;

uniform float uTime;
uniform float uPointScale;
uniform float uWobbleAmp;
uniform float uWobbleFreqX;
uniform float uWobbleFreqY;
uniform float uWobbleFreqZ;
uniform float uWobbleAmpYMul;
uniform float uWobbleAmpZMul;
uniform float uPointSizeMul;
uniform float uPointSizeBase;
uniform float uPointSizePhaseMul;
uniform float uPointSizeCamDiv;
uniform float uPointSizeZMin;
uniform float uPointSizeClampMin;
uniform float uPointSizeClampMax;

varying float vPhase;

void main() {
  vPhase = aPhase;
  vec3 pos = position;
  float w = uWobbleAmp * uPointScale;
  pos.x += sin(uTime * uWobbleFreqX + aPhase * 6.2831853) * w;
  pos.y += sin(uTime * uWobbleFreqY + aPhase * 4.71238898) * w * uWobbleAmpYMul;
  pos.z += cos(uTime * uWobbleFreqZ + aPhase * 5.49778714) * w * uWobbleAmpZMul;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float pr = uPointSizeMul * uPointScale * (uPointSizeBase + uPointSizePhaseMul * aPhase);
  gl_PointSize = clamp(
    pr * (uPointSizeCamDiv / max(-mvPosition.z, uPointSizeZMin)),
    uPointSizeClampMin,
    uPointSizeClampMax
  );
}
`;

const bubbleClusterFragmentShader = `
uniform vec3 uColorCore;
uniform vec3 uColorRim;
uniform float uCoreSmoothOuter;
uniform float uCoreSmoothInner;
uniform float uRimInner0;
uniform float uRimInner1;
uniform float uRimOuter0;
uniform float uRimOuter1;
uniform float uRimColorMix;
uniform float uAlphaCore;
uniform float uAlphaRim;
uniform float uAlphaBodyMin;
uniform float uAlphaCoreBoost;
uniform float uAlphaMax;
uniform float uTwinkleBase;
uniform float uTwinkleAmp;
uniform float uTwinklePhaseMul;
uniform float uTwinkleD;

varying float vPhase;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c) * 2.0;
  if (d > 1.0) discard;

  float core = smoothstep(uCoreSmoothOuter, uCoreSmoothInner, d);
  float rim =
    smoothstep(uRimInner0, uRimInner1, d) * smoothstep(uRimOuter0, uRimOuter1, d);
  float alpha = core * uAlphaCore + rim * uAlphaRim;
  vec3 col = mix(uColorCore, uColorRim, clamp(rim * uRimColorMix, 0.0, 1.0));
  float twinkle = uTwinkleBase + uTwinkleAmp * sin(vPhase * uTwinklePhaseMul + d * uTwinkleD);
  col *= twinkle;
  gl_FragColor = vec4(
    col,
    clamp(alpha * (uAlphaBodyMin + uAlphaCoreBoost * core), 0.0, uAlphaMax)
  );
}
`;

function createBubbleClusterMaterial(t: BubbleAttackFxTuning): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPointScale: { value: 1 },
      uColorCore: { value: new THREE.Color() },
      uColorRim: { value: new THREE.Color() },
      uWobbleAmp: { value: t.wobbleAmp },
      uWobbleFreqX: { value: t.wobbleFreqX },
      uWobbleFreqY: { value: t.wobbleFreqY },
      uWobbleFreqZ: { value: t.wobbleFreqZ },
      uWobbleAmpYMul: { value: t.wobbleAmpYMul },
      uWobbleAmpZMul: { value: t.wobbleAmpZMul },
      uPointSizeMul: { value: t.pointSizeMul },
      uPointSizeBase: { value: t.pointSizeBase },
      uPointSizePhaseMul: { value: t.pointSizePhaseMul },
      uPointSizeCamDiv: { value: t.pointSizeCamDiv },
      uPointSizeZMin: { value: t.pointSizeZMin },
      uPointSizeClampMin: { value: t.pointSizeClampMin },
      uPointSizeClampMax: { value: t.pointSizeClampMax },
      uCoreSmoothOuter: { value: t.coreSmoothOuter },
      uCoreSmoothInner: { value: t.coreSmoothInner },
      uRimInner0: { value: t.rimInner0 },
      uRimInner1: { value: t.rimInner1 },
      uRimOuter0: { value: t.rimOuter0 },
      uRimOuter1: { value: t.rimOuter1 },
      uRimColorMix: { value: t.rimColorMix },
      uAlphaCore: { value: t.alphaCore },
      uAlphaRim: { value: t.alphaRim },
      uAlphaBodyMin: { value: t.alphaBodyMin },
      uAlphaCoreBoost: { value: t.alphaCoreBoost },
      uAlphaMax: { value: t.alphaMax },
      uTwinkleBase: { value: t.twinkleBase },
      uTwinkleAmp: { value: t.twinkleAmp },
      uTwinklePhaseMul: { value: t.twinklePhaseMul },
      uTwinkleD: { value: t.twinkleD },
    },
    vertexShader: bubbleClusterVertexShader,
    fragmentShader: bubbleClusterFragmentShader,
    transparent: true,
    depthWrite: t.depthWrite,
    blending:
      t.blending === "additive"
        ? THREE.AdditiveBlending
        : THREE.NormalBlending,
  });
}

/** Deterministic RNG for stable particle layout per pool slot. */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fill positions + phases: horizontal teardrop, head-heavy density (+X),
 * thin on Y for a “flat-ish” underwater packet.
 */
function fillTeardropClusterGeometry(
  geom: THREE.BufferGeometry,
  poolIndex: number,
  t: BubbleAttackFxTuning,
): void {
  const n = Math.max(4, Math.round(t.clusterCount));
  const pos = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  const rnd = mulberry32((poolIndex + 1) * 0x9e3779b9 + 2463534242);

  const DROP_R = t.dropR;
  const DROP_TAIL = t.dropTail;
  const DROP_Y_HALF = t.dropYHalf;
  const bias = t.headBiasExponent;

  let placed = 0;
  let attempts = 0;
  const maxAttempts = n * 100;

  while (placed < n && attempts < maxAttempts) {
    attempts++;
    const r1 = rnd();
    const r2 = rnd();
    const r3 = rnd();
    const r4 = rnd();

    const x = -DROP_TAIL + (DROP_TAIL + DROP_R) * Math.pow(r1, bias);

    let maxW: number;
    if (x >= 0) {
      const s = DROP_R * DROP_R - x * x;
      if (s < -1e-6) continue;
      maxW = Math.sqrt(Math.max(0, s));
    } else {
      maxW = DROP_R * (1 + x / DROP_TAIL);
    }

    const z = (r2 * 2 - 1) * maxW;
    if (x > 0 && x * x + z * z > DROP_R * DROP_R + 1e-5) continue;
    if (x <= 0 && Math.abs(z) > maxW + 1e-5) continue;

    const y = (r3 - 0.5) * 2 * DROP_Y_HALF;

    pos[placed * 3] = x;
    pos[placed * 3 + 1] = y;
    pos[placed * 3 + 2] = z;
    phase[placed] = r4;
    placed++;
  }

  while (placed < n) {
    pos[placed * 3] = DROP_R * 0.35;
    pos[placed * 3 + 1] = 0;
    pos[placed * 3 + 2] = 0;
    phase[placed] = rnd();
    placed++;
  }

  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geom.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
}

function applyBubbleTuningToMaterial(
  mat: THREE.ShaderMaterial,
  t: BubbleAttackFxTuning,
): void {
  mat.depthWrite = t.depthWrite;
  mat.blending =
    t.blending === "additive"
      ? THREE.AdditiveBlending
      : THREE.NormalBlending;
  mat.transparent = true;

  const u = mat.uniforms;
  u.uWobbleAmp.value = t.wobbleAmp;
  u.uWobbleFreqX.value = t.wobbleFreqX;
  u.uWobbleFreqY.value = t.wobbleFreqY;
  u.uWobbleFreqZ.value = t.wobbleFreqZ;
  u.uWobbleAmpYMul.value = t.wobbleAmpYMul;
  u.uWobbleAmpZMul.value = t.wobbleAmpZMul;
  u.uPointSizeMul.value = t.pointSizeMul;
  u.uPointSizeBase.value = t.pointSizeBase;
  u.uPointSizePhaseMul.value = t.pointSizePhaseMul;
  u.uPointSizeCamDiv.value = t.pointSizeCamDiv;
  u.uPointSizeZMin.value = t.pointSizeZMin;
  u.uPointSizeClampMin.value = t.pointSizeClampMin;
  u.uPointSizeClampMax.value = t.pointSizeClampMax;
  u.uCoreSmoothOuter.value = t.coreSmoothOuter;
  u.uCoreSmoothInner.value = t.coreSmoothInner;
  u.uRimInner0.value = t.rimInner0;
  u.uRimInner1.value = t.rimInner1;
  u.uRimOuter0.value = t.rimOuter0;
  u.uRimOuter1.value = t.rimOuter1;
  u.uRimColorMix.value = t.rimColorMix;
  u.uAlphaCore.value = t.alphaCore;
  u.uAlphaRim.value = t.alphaRim;
  u.uAlphaBodyMin.value = t.alphaBodyMin;
  u.uAlphaCoreBoost.value = t.alphaCoreBoost;
  u.uAlphaMax.value = t.alphaMax;
  u.uTwinkleBase.value = t.twinkleBase;
  u.uTwinkleAmp.value = t.twinkleAmp;
  u.uTwinklePhaseMul.value = t.twinklePhaseMul;
  u.uTwinkleD.value = t.twinkleD;
}

const _tmpCore = new THREE.Color();
const _tmpRim = new THREE.Color();
const _fwd = new THREE.Vector3();
const _axisX = new THREE.Vector3(1, 0, 0);

export type BubblePopRing = {
  mesh: THREE.Mesh;
  age: number;
  splash: boolean;
};

/** Rebuild teardrop point positions for every pooled object (after shape/count tweaks). */
export function rebuildBubbleProjectileGeometries(pool: THREE.Points[]): void {
  const t = getBubbleAttackFxTuning();
  for (let i = 0; i < pool.length; i++) {
    fillTeardropClusterGeometry(pool[i]!.geometry, i, t);
  }
}

/** Grow pooled bubble cluster Points to match active simulation count. */
export function ensureBubbleProjectilePool(
  parent: THREE.Group,
  pool: THREE.Points[],
  needed: number,
): void {
  const t = getBubbleAttackFxTuning();
  while (pool.length < needed) {
    const geom = new THREE.BufferGeometry();
    fillTeardropClusterGeometry(geom, pool.length, t);
    const mat = createBubbleClusterMaterial(t);
    const pts = new THREE.Points(geom, mat);
    pts.frustumCulled = false;
    pts.renderOrder = t.renderOrder;
    parent.add(pts);
    pool.push(pts);
  }
}

/** Sync poses, orientation to velocity, and shader uniforms; hides extras in the pool. */
export function syncBubbleProjectileMeshes(
  pool: THREE.Points[],
  projectiles: readonly BubbleProjectileState[],
  doc: MapDocument,
  timeSec: number,
): void {
  const t = getBubbleAttackFxTuning();
  const rev = t.geometryRev;
  if (rev !== lastAppliedGeometryRev) {
    lastAppliedGeometryRev = rev;
    rebuildBubbleProjectileGeometries(pool);
  }

  for (let i = 0; i < pool.length; i++) {
    const pts = pool[i]!;
    if (i < projectiles.length) {
      const p = projectiles[i]!;
      pts.visible = true;
      const mat = pts.material as THREE.ShaderMaterial;
      applyBubbleTuningToMaterial(mat, t);

      mat.uniforms.uTime.value = timeSec;
      const splash = p.splash > 0;
      _tmpCore.setStyle(splash ? t.colorCoreL3 : t.colorCore);
      _tmpRim.setStyle(splash ? t.colorRimL3 : t.colorRim);
      mat.uniforms.uColorCore.value.copy(_tmpCore);
      mat.uniforms.uColorRim.value.copy(_tmpRim);

      _fwd.set(p.vgx, 0, p.vgz);
      if (_fwd.lengthSq() < 1e-10) {
        _fwd.set(1, 0, 0);
      } else {
        _fwd.normalize();
      }
      pts.quaternion.setFromUnitVectors(_axisX, _fwd);

      const bob =
        t.bobBase +
        t.bobAmp * Math.sin(timeSec * t.bobTimeScale + i * t.bobIndexSpread + p.traveled * t.bobTravelPhase);
      pts.position.copy(worldFromGrid(p.gx, p.gz, doc, bob));

      const sc =
        (splash ? t.scaleSplashMul : 1) *
        (1 +
          t.scalePulseAmp *
            Math.sin(timeSec * t.scalePulseTime + p.traveled * t.scaleTravelPhase));
      pts.scale.setScalar(sc);
      mat.uniforms.uPointScale.value = sc;
      pts.renderOrder = t.renderOrder;
    } else {
      pts.visible = false;
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
  const t = getBubbleAttackFxTuning();
  const segs = Math.max(3, Math.round(t.ringSegments));
  for (const e of events) {
    const inner = e.splash ? t.ringInnerSplash : t.ringInner;
    const outer = e.splash ? t.ringOuterSplash : t.ringOuter;
    const geom = new THREE.RingGeometry(inner, outer, segs);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(e.splash ? t.ringColorSplash : t.ringColor),
      transparent: true,
      opacity: t.ringOpacity,
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
      splash: e.splash,
    });
  }
}

/** Call after removing / disposing all pooled bubble Points (materials disposed per-object). */
export function disposeBubbleAttackFxShared(): void {
  lastAppliedGeometryRev = -1;
}

export function updateBubblePopRings(
  rings: BubblePopRing[],
  dt: number,
  scene: THREE.Scene,
): void {
  const t = getBubbleAttackFxTuning();
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]!;
    r.age += dt;
    const dur = r.splash ? t.popDurationSplash : t.popDuration;
    const k = r.age / dur;
    if (k >= 1) {
      scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
      rings.splice(i, 1);
      continue;
    }
    const mat = r.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = t.ringOpacity * (1 - k * k);
    const s = 1 + k * t.ringScaleGrowth;
    r.mesh.scale.set(s, s, s);
  }
}
