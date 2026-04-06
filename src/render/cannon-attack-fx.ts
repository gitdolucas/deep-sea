import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import { getCannonBlastFxTuning } from "../game/cannon-blast-tuning.js";
import {
  getCannonProjectileFxTuning,
  type CannonProjectileFxTuning,
} from "../game/cannon-projectile-fx-tuning.js";
import type { CannonProjectileState } from "../game/cannon-projectiles.js";
import {
  getCannonDnaHelixTuning,
  type CannonDnaHelixTuning,
} from "./cannon-dna-helix-tuning.js";
import { worldFromGrid } from "./board.js";

const boltVertexShader = `
uniform float uGeomHeight;

varying vec3 vLocalPos;
varying float vAxial;

void main() {
  vLocalPos = position;
  vAxial = position.y / uGeomHeight + 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const boltFragmentShader = `
uniform float uTime;
uniform float uLevel;
uniform float uScroll;
uniform float uFadeMul;
uniform float uRBot;
uniform float uRTop;

varying vec3 vLocalPos;
varying float vAxial;

const vec3 COL_DEEP = vec3(0.0, 0.12, 0.28);
const vec3 COL_CYAN = vec3(0.0, 0.831, 1.0);
const vec3 COL_HIGH = vec3(0.55, 0.98, 1.0);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  float tAx = clamp(vAxial, 0.0, 1.0);
  float rMax = mix(uRBot, uRTop, tAx);
  float rNorm = length(vLocalPos.xz) / max(rMax, 0.0001);
  float ang = atan(vLocalPos.z, vLocalPos.x);

  float lv = clamp(uLevel, 1.0, 3.0);
  float swirl = ang * (1.8 + 0.35 * lv) + uTime * (1.1 + 0.45 * lv);
  float axialFlow = tAx * (7.0 + lv) + uScroll;

  float co1 = noise2(vec2(axialFlow, swirl * 0.65));
  float co2 = noise2(vec2(axialFlow * 1.9 - uTime * 0.9, swirl * 1.4 + uScroll * 1.2));
  float co3 = noise2(vec2(axialFlow * 3.2, ang * 2.5 - uTime * 1.6 + uScroll * 0.5));
  float stream = co1 * 0.5 + co2 * 0.35 + co3 * 0.28;

  float rim = 1.0 - smoothstep(0.62, 1.08, rNorm);
  rim = pow(max(rim, 0.0), 1.6);

  float caps = smoothstep(0.0, 0.14, tAx) * smoothstep(1.0, 0.86, tAx);
  float coreBoost = smoothstep(0.95, 0.2, rNorm) * (0.15 + 0.2 * lv);

  float body = stream * (0.45 + 0.12 * lv) + rim * (0.35 + 0.08 * lv) + coreBoost;

  vec3 col = mix(COL_DEEP, COL_CYAN, clamp(body * 1.1, 0.0, 1.0));
  col = mix(col, COL_HIGH, rim * (0.35 + 0.1 * lv));
  if (lv >= 2.5) {
    col = mix(col, vec3(0.92, 0.88, 0.42), coreBoost * 0.55);
  }

  float pulse = 0.9 + 0.1 * sin(uTime * 16.0 - tAx * 9.0 + ang * 3.0);
  col *= pulse;

  float alpha = body * (0.32 + 0.12 * lv) + rim * (0.42 + 0.08 * lv);
  alpha *= caps;
  alpha = clamp(alpha, 0.0, 0.78) * uFadeMul;

  gl_FragColor = vec4(col, alpha);
}
`;

function createCannonBoltMaterial(): THREE.ShaderMaterial {
  const fx = getCannonProjectileFxTuning();
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLevel: { value: 1 },
      uScroll: { value: 0 },
      uFadeMul: { value: 1 },
      uGeomHeight: { value: fx.boltGeomHeight },
      uRBot: { value: fx.boltRadiusBottom },
      uRTop: { value: fx.boltRadiusTop },
    },
    vertexShader: boltVertexShader,
    fragmentShader: boltFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

const _fwd = new THREE.Vector3();
const _axis = new THREE.Vector3(0, 1, 0);
const _centerW = new THREE.Vector3();
const _tipAnchorW = new THREE.Vector3();

/** World-space bolt length: short in flight → grows to max → shrinks on hit → min during fade. */
function cannonBoltLengthWorld(
  p: CannonProjectileState,
  fx: CannonProjectileFxTuning,
): number {
  const maxLen = Math.max(0.05, fx.boltLength);
  const startFrac = Math.max(0.02, Math.min(1, fx.boltLengthStartFrac));
  const minLen = maxLen * startFrac;
  if (
    p.shrinkRemaining !== undefined &&
    p.shrinkDurationSec !== undefined &&
    p.shrinkDurationSec > 0
  ) {
    const t = Math.max(0, p.shrinkRemaining / p.shrinkDurationSec);
    return minLen + (maxLen - minLen) * t;
  }
  if (p.fadeOutRemaining !== undefined) {
    return minLen;
  }
  const prog = p.flightLengthProgress ?? 0;
  return minLen + (maxLen - minLen) * prog;
}

const _strandColor = new THREE.Color();

function clampDnaStrands(n: number): number {
  return Math.max(1, Math.min(16, Math.round(Number(n)) || 1));
}

function clampDnaSegments(n: number): number {
  return Math.max(4, Math.min(256, Math.round(Number(n)) || 56));
}

function strandColorHex(s: number, t: CannonDnaHelixTuning): number {
  const palette = [
    t.color0,
    t.color1,
    t.color2,
    t.color3,
    t.color4,
    t.color5,
    t.color6,
    t.color7,
  ] as const;
  _strandColor.setStyle(palette[s % 8]!);
  return _strandColor.getHex();
}

function stripCannonDnaHelixLines(boltMesh: THREE.Mesh): void {
  const oldLines = boltMesh.userData.dnaHelixLines as THREE.Line[] | undefined;
  if (oldLines) {
    for (const line of oldLines) {
      boltMesh.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
  }
  boltMesh.userData.dnaHelixLines = undefined;
  boltMesh.userData.dnaHelixReady = false;
  boltMesh.userData.dnaHelixBuild = undefined;
}

function ensureCannonDnaHelixLines(
  boltMesh: THREE.Mesh,
  t: CannonDnaHelixTuning,
): void {
  const strands = clampDnaStrands(t.strandCount);
  const segs = clampDnaSegments(t.segments);
  const blend =
    t.blending === "additive" ? THREE.AdditiveBlending : THREE.NormalBlending;
  const lines: THREE.Line[] = [];
  for (let s = 0; s < strands; s++) {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(3 * segs);
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: strandColorHex(s, t),
      transparent: true,
      opacity: t.lineOpacity,
      blending: blend,
      depthWrite: t.lineDepthWrite,
    });
    const line = new THREE.Line(geom, mat);
    line.renderOrder = t.lineRenderOrder;
    boltMesh.add(line);
    lines.push(line);
  }
  boltMesh.userData.dnaHelixReady = true;
  boltMesh.userData.dnaHelixLines = lines;
  boltMesh.userData.dnaHelixBuild = { strands, segs };
}

/** Recreate helix geometry when strand count or segment count changes (Leva). */
export function rebuildCannonDnaHelixIfNeeded(boltMesh: THREE.Mesh): void {
  const t = getCannonDnaHelixTuning();
  const strands = clampDnaStrands(t.strandCount);
  const segs = clampDnaSegments(t.segments);
  const build = boltMesh.userData.dnaHelixBuild as
    | { strands: number; segs: number }
    | undefined;
  if (
    boltMesh.userData.dnaHelixReady === true &&
    build?.strands === strands &&
    build?.segs === segs
  ) {
    return;
  }
  stripCannonDnaHelixLines(boltMesh);
  ensureCannonDnaHelixLines(boltMesh, t);
}

function updateCannonDnaHelixLines(
  boltMesh: THREE.Mesh,
  timeSec: number,
  traveled: number,
  level: number,
  fadeLineOpacityMul: number,
): void {
  rebuildCannonDnaHelixIfNeeded(boltMesh);
  const t = getCannonDnaHelixTuning();
  const lines = boltMesh.userData.dnaHelixLines as THREE.Line[] | undefined;
  if (!lines?.length) return;
  const lv = Math.max(1, Math.min(3, level));
  const fx = getCannonProjectileFxTuning();
  const gh = fx.boltGeomHeight;
  const half = gh * 0.5;
  const twist =
    timeSec * (t.timeTwistSpeed + lv * t.timeTwistPerLevel) +
    traveled * (t.traveledTwistSpeed + lv * t.traveledTwistPerLevel);
  const strands = lines.length;
  const spread =
    ((Math.PI * 2) / Math.max(1, strands)) * t.phaseSpreadMul;
  const blend =
    t.blending === "additive" ? THREE.AdditiveBlending : THREE.NormalBlending;
  for (let s = 0; s < lines.length; s++) {
    const line = lines[s]!;
    const mat = line.material as THREE.LineBasicMaterial;
    mat.color.setHex(strandColorHex(s, t));
    mat.opacity = t.lineOpacity * fadeLineOpacityMul;
    mat.blending = blend;
    mat.depthWrite = t.lineDepthWrite;
    line.renderOrder = t.lineRenderOrder;

    const geom = line.geometry as THREE.BufferGeometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const segs = arr.length / 3;
    const strandPhase = s * spread;
    const radius = s % 2 === 0 ? t.radiusA : t.radiusB;
    for (let i = 0; i < segs; i++) {
      const t01 = i / (segs - 1);
      const y = -half + t01 * gh;
      const wobble =
        t.wobbleAmplitude *
        Math.sin(
          timeSec * t.wobbleTimeFreq +
            t01 * t.wobbleAxialFreq +
            s * t.wobbleStrandOffset,
        );
      const theta =
        t.turns * Math.PI * 2 * t01 + twist + strandPhase + wobble;
      arr[i * 3] = radius * Math.cos(theta);
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = radius * Math.sin(theta);
    }
    pos.needsUpdate = true;
  }
}

const blastVertexShader = `
varying vec2 vLocalXY;
void main() {
  vLocalXY = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Hydraulic pressure-ring: shockwall, trailing wakes, reduced "electric" band vs prior.
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
  ionBand *= caust * (0.35 + shock * 0.85) * 0.42;

  float haze = (1.0 - smoothstep(0.0, 0.45, r)) * exp(-p * 2.2) * 0.22;

  float alpha =
    (shock + shock2 + wakeA + wakeB + coreFlash + ionBand * 0.55 + haze) * uFade;

  vec3 col = COL_DEEP * (0.35 + haze * 2.5);
  col = mix(col, COL_CYAN, clamp(shock * 1.15 + shock2 * 0.8 + wakeA * 1.2, 0.0, 1.0));
  col = mix(col, COL_VIOLET, ionBand * 0.55);
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

let lastBoltGeomSig = "";

function boltGeomSignature(fx: CannonProjectileFxTuning): string {
  return [
    fx.boltGeomHeight,
    fx.boltRadiusBottom,
    fx.boltRadiusTop,
    fx.boltCylinderRadialSegs,
    fx.boltCylinderHeightSegs,
  ].join("|");
}

export function ensureCannonProjectilePool(
  parent: THREE.Group,
  pool: THREE.Mesh[],
  needed: number,
): void {
  const fx = getCannonProjectileFxTuning();
  const sig = boltGeomSignature(fx);
  if (sig !== lastBoltGeomSig && pool.length > 0) {
    disposeCannonProjectilePool(pool);
    pool.length = 0;
  }
  lastBoltGeomSig = sig;
  while (pool.length < needed) {
    const geom = new THREE.CylinderGeometry(
      fx.boltRadiusTop,
      fx.boltRadiusBottom,
      fx.boltGeomHeight,
      Math.max(3, Math.round(fx.boltCylinderRadialSegs)),
      Math.max(1, Math.round(fx.boltCylinderHeightSegs)),
      false,
    );
    const mesh = new THREE.Mesh(geom, createCannonBoltMaterial());
    mesh.renderOrder = 3;
    rebuildCannonDnaHelixIfNeeded(mesh);
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
      const fx = getCannonProjectileFxTuning();
      const fadeInMul =
        p.shrinkRemaining !== undefined ||
        p.fadeOutRemaining !== undefined
          ? 1
          : fx.fadeInSec <= 0
            ? 1
            : Math.min(1, p.timeAlive / fx.fadeInSec);
      const fadeOutMul =
        p.fadeOutRemaining !== undefined
          ? fx.fadeOutSec <= 0
            ? 0
            : Math.max(0, p.fadeOutRemaining / fx.fadeOutSec)
          : 1;
      const fadeMul = fadeInMul * fadeOutMul;
      const mat = mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = timeSec;
      mat.uniforms.uLevel.value = p.level;
      mat.uniforms.uScroll.value = p.traveled * fx.boltScrollMult;
      mat.uniforms.uFadeMul.value = fadeMul;
      mat.uniforms.uGeomHeight.value = fx.boltGeomHeight;
      mat.uniforms.uRBot.value = fx.boltRadiusBottom;
      mat.uniforms.uRTop.value = fx.boltRadiusTop;
      const dirLen = Math.hypot(p.vgx, p.vgz) || 1;
      _fwd.set(p.vgx / dirLen, 0, p.vgz / dirLen);
      mesh.quaternion.setFromUnitVectors(_axis, _fwd);
      const bob =
        fx.bobBase +
        fx.bobSinAmp *
          Math.sin(
            timeSec * fx.bobSinTimeFreq +
              i * fx.bobSinIndexPhase +
              p.traveled * fx.bobSinTravelFreq,
          );
      const sc =
        (p.level >= 3 ? fx.boltLevelScaleL3 : 1) *
        (1 +
          fx.boltScaleWaveAmp *
            Math.sin(
              timeSec * fx.boltScaleWaveTimeFreq +
                p.traveled * fx.boltScaleWaveTravelFreq,
            ));
      const levelY = fx.boltLevelYBase + p.level * fx.boltLevelYPerLevel;
      const postHit =
        p.shrinkRemaining !== undefined || p.fadeOutRemaining !== undefined;
      if (postHit) {
        if (mesh.userData.cannonTipAnchorW === undefined) {
          _centerW.copy(worldFromGrid(p.gx, p.gz, doc, bob));
          const fullLen = Math.max(0.05, fx.boltLength);
          const scaleYZ = sc * levelY;
          mesh.userData.cannonPostHitScaleYZ = scaleYZ;
          const halfFull = (fullLen * scaleYZ) / 2;
          _tipAnchorW.copy(_centerW).addScaledVector(_fwd, halfFull);
          mesh.userData.cannonTipAnchorW = _tipAnchorW.clone();
        }
        const tip = mesh.userData.cannonTipAnchorW as THREE.Vector3;
        const scaleYZ =
          (mesh.userData.cannonPostHitScaleYZ as number) ?? sc * levelY;
        const lenW = cannonBoltLengthWorld(p, fx);
        const halfNow = (lenW * scaleYZ) / 2;
        mesh.position.copy(tip).addScaledVector(_fwd, -halfNow);
      } else {
        mesh.position.copy(worldFromGrid(p.gx, p.gz, doc, bob));
        delete mesh.userData.cannonTipAnchorW;
        delete mesh.userData.cannonPostHitScaleYZ;
      }
      const lenMul =
        cannonBoltLengthWorld(p, fx) / Math.max(0.05, fx.boltGeomHeight);
      mesh.scale.set(
        sc,
        sc * levelY * lenMul,
        sc,
      );
      updateCannonDnaHelixLines(
        mesh,
        timeSec,
        p.traveled,
        p.level,
        fadeMul,
      );
    } else {
      mesh.visible = false;
      delete mesh.userData.cannonTipAnchorW;
      delete mesh.userData.cannonPostHitScaleYZ;
    }
  }
}

export function spawnCannonBlastDecals(
  events: readonly { gx: number; gz: number; radiusTiles: number }[],
  doc: MapDocument,
  scene: THREE.Scene,
  decals: CannonBlastDecal[],
): void {
  const bt = getCannonBlastFxTuning();
  for (const e of events) {
    const rWorld = Math.max(bt.minRadiusWorld, e.radiusTiles);
    const geom = new THREE.CircleGeometry(
      rWorld,
      Math.max(8, Math.round(bt.circleSegments)),
    );
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
    mesh.position.copy(worldFromGrid(e.gx, e.gz, doc, bt.groundYOffset));
    scene.add(mesh);
    decals.push({ mesh, age: 0, duration: bt.durationSec, mat });
  }
}

export function updateCannonBlastDecals(
  decals: CannonBlastDecal[],
  dt: number,
  scene: THREE.Scene,
  timeSec: number,
): void {
  const bt = getCannonBlastFxTuning();
  const exp = Math.max(0.5, bt.fadeExponent);
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
    d.mat.uniforms.uFade.value = 1.0 - Math.pow(k, exp);
  }
}

/** No shared bolt materials (each pool mesh owns its ShaderMaterial). */
export function disposeCannonAttackFxShared(): void {}

/** Disposes bolt cylinder plus DNA helix child lines (not handled by scene.traverse after group remove). */
export function disposeCannonProjectilePool(pool: THREE.Mesh[]): void {
  for (const m of pool) {
    m.traverse((o) => {
      if (o instanceof THREE.Line) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
  }
}
