import * as THREE from "three";
import { getCannonColumnHitFxTuning } from "../game/cannon-hit-fx-tuning.js";
import type { MapDocument } from "../game/map-types.js";
import { worldFromGrid } from "./board.js";

export type CannonColumnHitFx = {
  mesh: THREE.Mesh;
  age: number;
  duration: number;
  mat: THREE.ShaderMaterial;
};

const columnVertexShader = `
uniform float uGrow;
uniform float uOpen;
uniform float uFlareRadius;
uniform float uFlareCurveStart;

varying vec2 vUv;
varying vec3 vLocalPos;

void main() {
  vUv = uv;
  vec3 p = position;
  float yn = uv.y;
  float flareMask = smoothstep(uFlareCurveStart, 1.0, yn);
  float flare = flareMask * uOpen * uFlareRadius;
  float r = length(p.xz);
  vec2 dir = r > 1e-5 ? p.xz / r : vec2(1.0, 0.0);
  p.xz += dir * flare * yn * yn;
  p.y *= uGrow;
  vLocalPos = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const columnFragmentShader = `
uniform float uFade;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uRimSpokes;
uniform float uRimStrength;
uniform float uOpen;

varying vec2 vUv;
varying vec3 vLocalPos;

void main() {
  float radial = 1.0 - abs(vUv.x - 0.5) * 2.0;
  radial = pow(max(radial, 0.0), 1.35);
  float ax = vUv.y;
  float pulse = 0.72 + 0.28 * sin(uTime * uPulseSpeed - ax * 22.0);
  float ang = atan(vLocalPos.x, vLocalPos.z);
  float spokes = pow(abs(sin(ang * uRimSpokes + uTime * 1.1)), 0.5);
  float topMask = smoothstep(0.5, 0.98, vUv.y);
  float rim = spokes * topMask * uOpen * uRimStrength;

  vec3 colDeep = vec3(0.0, 0.35, 0.55);
  vec3 colBright = vec3(0.45, 0.92, 1.0);
  vec3 col = mix(colDeep, colBright, clamp(radial * pulse + rim * 0.45, 0.0, 1.0));
  float alpha = (0.1 + 0.4 * radial) * uFade * pulse;
  alpha += rim * 0.22 * uFade;
  gl_FragColor = vec4(col, alpha);
}
`;

function applyGrowOpenUniforms(
  mat: THREE.ShaderMaterial,
  age: number,
  duration: number,
  timeSec: number,
): void {
  const t = getCannonColumnHitFxTuning();
  const k = duration > 0 ? age / duration : 1;
  const growEnd = Math.max(0.02, t.growEndFrac);
  const openStart = Math.min(
    Math.max(t.openStartFrac, 0),
    0.98,
  );
  const grow =
    k < growEnd
      ? THREE.MathUtils.smoothstep(0, 1, k / growEnd)
      : 1;
  const open =
    k < openStart
      ? 0
      : THREE.MathUtils.smoothstep(0, 1, (k - openStart) / (1 - openStart));

  mat.uniforms.uGrow.value = grow;
  mat.uniforms.uOpen.value = open;
  mat.uniforms.uTime.value = timeSec;
  mat.uniforms.uFade.value = Math.max(0, 1 - k * k);
  mat.uniforms.uPulseSpeed.value = t.pulseSpeed;
  mat.uniforms.uRimSpokes.value = t.rimSpokeCount;
  mat.uniforms.uRimStrength.value = t.rimSpokeStrength;
  mat.uniforms.uFlareRadius.value = t.flareRadius;
  mat.uniforms.uFlareCurveStart.value = t.flareCurveStart;
}

export function spawnCannonColumnHits(
  events: readonly {
    gx: number;
    gz: number;
    fromGx: number;
    fromGz: number;
  }[],
  doc: MapDocument,
  parent: THREE.Group,
  out: CannonColumnHitFx[],
  timeSec: number,
): void {
  const t = getCannonColumnHitFxTuning();
  const duration = t.durationSec;
  for (const e of events) {
    const geom = new THREE.CylinderGeometry(
      t.radiusTop,
      t.radiusBottom,
      t.height,
      t.radialSegments,
      t.heightSegments,
      true,
    );
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uGrow: { value: 0 },
        uOpen: { value: 0 },
        uFlareRadius: { value: t.flareRadius },
        uFlareCurveStart: { value: t.flareCurveStart },
        uFade: { value: 1 },
        uTime: { value: timeSec },
        uPulseSpeed: { value: t.pulseSpeed },
        uRimSpokes: { value: t.rimSpokeCount },
        uRimStrength: { value: t.rimSpokeStrength },
      },
      vertexShader: columnVertexShader,
      fragmentShader: columnFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.renderOrder = 5;
    const base = worldFromGrid(e.gx, e.gz, doc, 0.02);
    mesh.position.set(base.x, base.y + t.baseYOffset + t.height * 0.5, base.z);
    parent.add(mesh);
    applyGrowOpenUniforms(mat, 0, duration, timeSec);
    out.push({ mesh, age: 0, duration, mat });
  }
}

export function updateCannonColumnHits(
  out: CannonColumnHitFx[],
  dt: number,
  parent: THREE.Group,
  timeSec: number,
): void {
  for (let i = out.length - 1; i >= 0; i--) {
    const x = out[i]!;
    x.age += dt;
    const k = x.age / x.duration;
    applyGrowOpenUniforms(x.mat, x.age, x.duration, timeSec);
    if (k >= 1) {
      parent.remove(x.mesh);
      x.mesh.geometry.dispose();
      x.mat.dispose();
      out.splice(i, 1);
    }
  }
}
