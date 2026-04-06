import * as THREE from "three";
import type {
  BubbleColumnFxEvent,
  BubbleColumnFxPreset,
} from "../game/bubble-column-fx-events.js";
import type { MapDocument } from "../game/map-types.js";
import { worldFromGrid } from "./board.js";
import {
  bubbleColumnFxTuning,
  getBubbleColumnFxTuning,
  type BubbleColumnPresetTuning,
} from "./bubble-column-fx-tuning.js";

/** Max simultaneous columns (extra events dropped). */
export const BUBBLE_COLUMN_MAX_ACTIVE = 24;

export type BubbleColumnRenderConfig = {
  particleCount: number;
  length: number;
  radius: number;
  duration: number;
  baseY: number;
  wobble: number;
  colorCore: THREE.ColorRepresentation;
  colorRim: THREE.ColorRepresentation;
  worldRiseMax: number;
  risePow: number;
  releaseLag: number;
  columnNoiseFreq: number;
  columnNoiseAmp: number;
  releaseNoiseFreq: number;
  releaseNoiseAmp: number;
  pointSizeMul: number;
  pointSizeBase: number;
  pointSizePhaseMul: number;
  pointSizeCamDiv: number;
  pointSizeZMin: number;
  pointSizeClampMin: number;
  pointSizeClampMax: number;
  pointAgeFade: number;
  pointAlongSpread: number;
  renderOrder: number;
  depthWrite: boolean;
  blending: THREE.Blending;
};

const columnVertexShader = `
attribute float aAlong;
attribute float aAngle;
attribute float aRadial;
attribute float aPhase;
attribute float aRelease;

uniform float uTime;
uniform float uLength;
uniform float uRadius;
uniform float uAge;
uniform float uWobble;
uniform float uWorldRiseMax;
uniform float uRisePow;
uniform float uReleaseLag;
uniform float uColNoiseFreq;
uniform float uColNoiseAmp;
uniform float uRelNoiseFreq;
uniform float uRelNoiseAmp;
uniform float uPointSizeMul;
uniform float uPointSizeBase;
uniform float uPointSizePhaseMul;
uniform float uPointSizeCamDiv;
uniform float uPointSizeZMin;
uniform float uPointSizeClampMin;
uniform float uPointSizeClampMax;
uniform float uPointAgeFade;
uniform float uPointAlongSpread;

varying float vPhase;
varying float vAlong;

void main() {
  vPhase = aPhase;
  vAlong = aAlong;

  float relGate = smoothstep(
    aRelease * uReleaseLag,
    min(1.0, aRelease * uReleaseLag + 0.28),
    uAge
  );

  float t = uTime + aPhase * 6.2831853;

  float nCol = sin(t * uColNoiseFreq + aAlong * 8.0) * uColNoiseAmp;
  float nRel =
    sin(t * uRelNoiseFreq + aPhase * 17.0) *
    cos(t * uRelNoiseFreq * 0.73 + aAngle * 3.0) *
    uRelNoiseAmp;
  float n = nCol + nRel;

  float y =
    aAlong * uLength * (1.0 + n) * (0.62 + 0.38 * relGate);
  y += uAge * 0.22 * relGate * uLength * 0.08;

  float w = uWobble * sin(t * 3.0 + aAngle) * relGate;
  float r =
    aRadial *
    uRadius *
    (1.0 + 0.12 * sin(t + aAlong * 12.0) + 0.09 * nRel) *
    relGate;
  float x = cos(aAngle) * r + w * 0.028;
  float z = sin(aAngle) * r + w * 0.028;

  vec4 worldPos = modelMatrix * vec4(x, y, z, 1.0);

  float liftT = clamp(
    (uAge - aRelease * uReleaseLag) / max(0.08, 1.0 - uReleaseLag * 0.45),
    0.0,
    1.0
  );
  float lift = pow(liftT, uRisePow) * uWorldRiseMax * relGate;
  worldPos.y += lift;

  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;

  float alongMix = max(
    0.06,
    mix(1.0 - uPointAlongSpread, 1.0 + uPointAlongSpread * 0.45, aAlong)
  );
  float pr =
    uPointSizeMul *
    (uPointSizeBase + uPointSizePhaseMul * aPhase) *
    alongMix *
    (1.12 - uAge * uPointAgeFade);
  gl_PointSize = clamp(
    pr * (uPointSizeCamDiv / max(-mvPosition.z, uPointSizeZMin)),
    uPointSizeClampMin,
    uPointSizeClampMax
  );
}
`;

const columnFragmentShader = `
uniform vec3 uColorCore;
uniform vec3 uColorRim;
uniform float uAge;

varying float vPhase;
varying float vAlong;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(1.0, 0.24, d);
  float rim = smoothstep(0.7, 0.92, d) * smoothstep(1.02, 0.87, d);
  float headGlow = smoothstep(0.0, 0.35, vAlong);
  float fade = 1.0 - smoothstep(0.62, 1.0, uAge);
  float alpha = (core * 0.42 + rim * 0.92) * fade * (0.82 + 0.18 * headGlow);
  vec3 col = mix(uColorCore, uColorRim, clamp(rim * 1.1, 0.0, 1.0));
  col = mix(col, vec3(1.0), 0.14);
  float tw = 0.92 + 0.08 * sin(vPhase * 31.0 + d * 6.0);
  col *= tw;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.88));
}
`;

function createColumnShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLength: { value: 1 },
      uRadius: { value: 0.06 },
      uAge: { value: 0 },
      uWobble: { value: 0.02 },
      uWorldRiseMax: { value: 0.55 },
      uRisePow: { value: 1.25 },
      uReleaseLag: { value: 0.45 },
      uColNoiseFreq: { value: 2.1 },
      uColNoiseAmp: { value: 0.085 },
      uRelNoiseFreq: { value: 7.0 },
      uRelNoiseAmp: { value: 0.12 },
      uPointSizeMul: { value: 20 },
      uPointSizeBase: { value: 0.82 },
      uPointSizePhaseMul: { value: 0.36 },
      uPointSizeCamDiv: { value: 300 },
      uPointSizeZMin: { value: 0.12 },
      uPointSizeClampMin: { value: 2 },
      uPointSizeClampMax: { value: 180 },
      uPointAgeFade: { value: 0.38 },
      uPointAlongSpread: { value: 0.14 },
      uColorCore: { value: new THREE.Color(0x3aa8cc) },
      uColorRim: { value: new THREE.Color(0xb8f8ff) },
    },
    vertexShader: columnVertexShader,
    fragmentShader: columnFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

function presetForEvent(
  preset: BubbleColumnFxPreset,
  splash: boolean,
): BubbleColumnPresetTuning {
  const T = getBubbleColumnFxTuning();
  if (preset === "bubble_shotgun_muzzle") return T.muzzle;
  if (preset === "bubble_shotgun_impact" && splash) return T.impactSplash;
  if (preset === "bubble_shotgun_impact") return T.impact;
  return T.muzzle;
}

/** Base scales from code (overridden / multiplied by tuning when applyOverrides). */
function baseConfigForPreset(event: BubbleColumnFxEvent): Omit<
  BubbleColumnRenderConfig,
  | "worldRiseMax"
  | "risePow"
  | "releaseLag"
  | "columnNoiseFreq"
  | "columnNoiseAmp"
  | "releaseNoiseFreq"
  | "releaseNoiseAmp"
  | "pointSizeMul"
  | "pointSizeBase"
  | "pointSizePhaseMul"
  | "pointSizeCamDiv"
  | "pointSizeZMin"
  | "pointSizeClampMin"
  | "pointSizeClampMax"
  | "pointAgeFade"
  | "pointAlongSpread"
  | "renderOrder"
  | "depthWrite"
  | "blending"
> & { defaultWorldRise: number } {
  const dS = event.durationScale ?? 1;
  const inten = event.intensity ?? 1;
  const splash = event.splash;

  switch (event.preset) {
    case "bubble_shotgun_muzzle":
      return {
        particleCount: Math.round(40 * inten),
        length: 0.92 * inten,
        radius: 0.072 * inten,
        duration: 0.5 * dS,
        baseY: 0.38,
        wobble: 0.024,
        colorCore: 0x3a9cc8,
        colorRim: 0xb2f4ff,
        defaultWorldRise: 0.62,
      };
    case "bubble_shotgun_impact":
      return {
        particleCount: Math.round((splash ? 36 : 28) * inten),
        length: (splash ? 0.68 : 0.5) * inten,
        radius: (splash ? 0.085 : 0.065) * inten,
        duration: (splash ? 0.38 : 0.32) * dS,
        baseY: 0.36,
        wobble: 0.028,
        colorCore: splash ? 0x22a8dd : 0x3a9cc8,
        colorRim: splash ? 0x66ffff : 0xb2f4ff,
        defaultWorldRise: splash ? 0.72 : 0.48,
      };
    default:
      return {
        particleCount: Math.round(24 * inten),
        length: 0.55 * inten,
        radius: 0.06 * inten,
        duration: 0.35 * dS,
        baseY: 0.35,
        wobble: 0.02,
        colorCore: 0x3a9cc8,
        colorRim: 0xb2f4ff,
        defaultWorldRise: 0.5,
      };
  }
}

function mergeTuning(
  base: ReturnType<typeof baseConfigForPreset>,
  pt: BubbleColumnPresetTuning,
  apply: boolean,
): BubbleColumnRenderConfig {
  if (!apply) {
    return {
      particleCount: Math.max(6, Math.min(96, base.particleCount)),
      length: base.length,
      radius: base.radius,
      duration: base.duration,
      baseY: base.baseY,
      wobble: base.wobble,
      colorCore: base.colorCore,
      colorRim: base.colorRim,
      worldRiseMax: base.defaultWorldRise,
      risePow: 1.25,
      releaseLag: 0.45,
      columnNoiseFreq: 2.1,
      columnNoiseAmp: 0.085,
      releaseNoiseFreq: 7.0,
      releaseNoiseAmp: 0.12,
      pointSizeMul: 20,
      pointSizeBase: 0.82,
      pointSizePhaseMul: 0.36,
      pointSizeCamDiv: 300,
      pointSizeZMin: 0.12,
      pointSizeClampMin: 2,
      pointSizeClampMax: 180,
      pointAgeFade: 0.38,
      pointAlongSpread: 0.14,
      renderOrder: 3,
      depthWrite: false,
      blending: THREE.NormalBlending,
    };
  }
  return {
    particleCount: Math.max(
      6,
      Math.min(96, Math.round(base.particleCount * pt.particleCountMul)),
    ),
    length: base.length * pt.lengthMul,
    radius: base.radius * pt.radiusMul,
    duration: Math.max(0.08, base.duration * pt.durationMul),
    baseY: pt.baseY,
    wobble: pt.wobble,
    colorCore: pt.colorCore,
    colorRim: pt.colorRim,
    worldRiseMax: pt.worldRiseMax,
    risePow: pt.risePow,
    releaseLag: pt.releaseLag,
    columnNoiseFreq: pt.columnNoiseFreq,
    columnNoiseAmp: pt.columnNoiseAmp,
    releaseNoiseFreq: pt.releaseNoiseFreq,
    releaseNoiseAmp: pt.releaseNoiseAmp,
    pointSizeMul: pt.pointSizeMul,
    pointSizeBase: pt.pointSizeBase,
    pointSizePhaseMul: pt.pointSizePhaseMul,
    pointSizeCamDiv: pt.pointSizeCamDiv,
    pointSizeZMin: pt.pointSizeZMin,
    pointSizeClampMin: pt.pointSizeClampMin,
    pointSizeClampMax: pt.pointSizeClampMax,
    pointAgeFade: pt.pointAgeFade,
    pointAlongSpread: pt.pointAlongSpread,
    renderOrder: pt.renderOrder,
    depthWrite: pt.depthWrite,
    blending:
      pt.blending === "additive"
        ? THREE.AdditiveBlending
        : THREE.NormalBlending,
  };
}

/** Resolve preset + event scalars + live Leva tuning into render config. */
export function getBubbleColumnRenderConfig(
  event: BubbleColumnFxEvent,
): BubbleColumnRenderConfig {
  const base = baseConfigForPreset(event);
  const pt = presetForEvent(event.preset, event.splash);
  return mergeTuning(base, pt, bubbleColumnFxTuning.applyOverrides);
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillColumnGeometry(
  geom: THREE.BufferGeometry,
  config: BubbleColumnRenderConfig,
  seed: number,
): void {
  const n = Math.max(6, Math.min(96, config.particleCount));
  const along = new Float32Array(n);
  const angle = new Float32Array(n);
  const radial = new Float32Array(n);
  const phase = new Float32Array(n);
  const release = new Float32Array(n);
  const rnd = mulberry32(seed >>> 0);

  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    along[i] = rnd();
    angle[i] = rnd() * Math.PI * 2;
    radial[i] = Math.sqrt(rnd());
    phase[i] = rnd();
    release[i] = rnd();
    pos[i * 3] = 0;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = 0;
  }

  geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geom.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
  geom.setAttribute("aAngle", new THREE.BufferAttribute(angle, 1));
  geom.setAttribute("aRadial", new THREE.BufferAttribute(radial, 1));
  geom.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geom.setAttribute("aRelease", new THREE.BufferAttribute(release, 1));
}

const _start = new THREE.Vector3();
const _end = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);

function placeColumnInWorld(
  pts: THREE.Points,
  event: BubbleColumnFxEvent,
  doc: MapDocument,
  config: BubbleColumnRenderConfig,
): void {
  _start.copy(
    worldFromGrid(event.from[0], event.from[1], doc, config.baseY),
  );

  const useWorldUp =
    event.axis === "world_up" ||
    event.to === undefined ||
    (event.to[0] === event.from[0] && event.to[1] === event.from[1]);

  if (useWorldUp) {
    pts.position.copy(_start);
    pts.quaternion.identity();
    return;
  }

  _end.copy(
    worldFromGrid(event.to[0], event.to[1], doc, config.baseY),
  );
  _dir.subVectors(_end, _start);
  const len = _dir.length();
  if (len < 1e-5) {
    pts.position.copy(_start);
    pts.quaternion.identity();
    return;
  }
  _dir.multiplyScalar(1 / len);
  pts.position.copy(_start);

  if (Math.abs(_dir.y) > 0.995) {
    pts.quaternion.setFromAxisAngle(_axisX, _dir.y > 0 ? 0 : Math.PI);
    return;
  }
  pts.quaternion.setFromUnitVectors(_axisY, _dir);
}

function applyConfigToMaterial(
  mat: THREE.ShaderMaterial,
  config: BubbleColumnRenderConfig,
): void {
  mat.uniforms.uLength.value = config.length;
  mat.uniforms.uRadius.value = config.radius;
  mat.uniforms.uWobble.value = config.wobble;
  mat.uniforms.uWorldRiseMax.value = config.worldRiseMax;
  mat.uniforms.uRisePow.value = config.risePow;
  mat.uniforms.uReleaseLag.value = config.releaseLag;
  mat.uniforms.uColNoiseFreq.value = config.columnNoiseFreq;
  mat.uniforms.uColNoiseAmp.value = config.columnNoiseAmp;
  mat.uniforms.uRelNoiseFreq.value = config.releaseNoiseFreq;
  mat.uniforms.uRelNoiseAmp.value = config.releaseNoiseAmp;
  mat.uniforms.uPointSizeMul.value = config.pointSizeMul;
  mat.uniforms.uPointSizeBase.value = config.pointSizeBase;
  mat.uniforms.uPointSizePhaseMul.value = config.pointSizePhaseMul;
  mat.uniforms.uPointSizeCamDiv.value = config.pointSizeCamDiv;
  mat.uniforms.uPointSizeZMin.value = config.pointSizeZMin;
  mat.uniforms.uPointSizeClampMin.value = config.pointSizeClampMin;
  mat.uniforms.uPointSizeClampMax.value = config.pointSizeClampMax;
  mat.uniforms.uPointAgeFade.value = config.pointAgeFade;
  mat.uniforms.uPointAlongSpread.value = config.pointAlongSpread;
  (mat.uniforms.uColorCore.value as THREE.Color).set(config.colorCore);
  (mat.uniforms.uColorRim.value as THREE.Color).set(config.colorRim);
  mat.depthWrite = config.depthWrite;
  mat.blending = config.blending;
  mat.needsUpdate = true;
}

export type ActiveBubbleColumn = {
  points: THREE.Points;
  age: number;
  duration: number;
  preset: BubbleColumnFxPreset;
  splash: boolean;
};

function dummyEvent(
  preset: BubbleColumnFxPreset,
  splash: boolean,
): BubbleColumnFxEvent {
  return {
    preset,
    splash,
    seed: 0,
    from: [0, 0],
    axis: "segment",
  };
}

function acquirePooledPoints(free: THREE.Points[]): THREE.Points {
  const p = free.pop();
  if (p) {
    p.visible = true;
    return p;
  }
  const geom = new THREE.BufferGeometry();
  const mat = createColumnShaderMaterial();
  const pts = new THREE.Points(geom, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  return pts;
}

function releaseToPool(
  parent: THREE.Group,
  free: THREE.Points[],
  pts: THREE.Points,
): void {
  parent.remove(pts);
  pts.visible = false;
  free.push(pts);
}

/**
 * Spawn columns for consumed events; recycles pooled Points; drops excess past {@link BUBBLE_COLUMN_MAX_ACTIVE}.
 */
export function spawnBubbleColumns(
  events: readonly BubbleColumnFxEvent[],
  doc: MapDocument,
  parent: THREE.Group,
  active: ActiveBubbleColumn[],
  freePool: THREE.Points[],
): void {
  const room = BUBBLE_COLUMN_MAX_ACTIVE - active.length;
  const take = Math.max(0, Math.min(room, events.length));
  for (let i = 0; i < take; i++) {
    const ev = events[i]!;
    const cfg = getBubbleColumnRenderConfig(ev);
    const pts = acquirePooledPoints(freePool);
    fillColumnGeometry(pts.geometry, cfg, ev.seed);
    const mat = pts.material as THREE.ShaderMaterial;
    applyConfigToMaterial(mat, cfg);
    mat.uniforms.uAge.value = 0;
    placeColumnInWorld(pts, ev, doc, cfg);
    pts.renderOrder = cfg.renderOrder;
    parent.add(pts);
    active.push({
      points: pts,
      age: 0,
      duration: cfg.duration,
      preset: ev.preset,
      splash: ev.splash,
    });
  }
}

/** Advance lifetimes; return spent columns to the free pool. */
export function updateBubbleColumns(
  parent: THREE.Group,
  active: ActiveBubbleColumn[],
  freePool: THREE.Points[],
  dt: number,
  timeSec: number,
): void {
  for (let i = active.length - 1; i >= 0; i--) {
    const a = active[i]!;
    a.age += dt;
    const ev = dummyEvent(a.preset, a.splash);
    const cfg = getBubbleColumnRenderConfig(ev);
    const mat = a.points.material as THREE.ShaderMaterial;
    applyConfigToMaterial(mat, cfg);
    mat.uniforms.uTime.value = timeSec;
    mat.uniforms.uAge.value = Math.min(1, a.age / a.duration);
    a.points.renderOrder = cfg.renderOrder;
    if (a.age >= a.duration) {
      releaseToPool(parent, freePool, a.points);
      active.splice(i, 1);
    }
  }
}

/** Dispose all pooled and active column Points (GameApp.dispose). */
export function disposeBubbleColumnFx(
  parent: THREE.Group,
  active: ActiveBubbleColumn[],
  freePool: THREE.Points[],
): void {
  for (const a of active) {
    a.points.geometry.dispose();
    (a.points.material as THREE.Material).dispose();
    parent.remove(a.points);
  }
  active.length = 0;
  for (const p of freePool) {
    p.geometry.dispose();
    (p.material as THREE.Material).dispose();
    parent.remove(p);
  }
  freePool.length = 0;
}
