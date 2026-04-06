import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import { worldFromGrid } from "./board.js";
import { COLORS } from "./constants.js";

const SPARKLE_COUNT = 22;
/** Exported for visual showcase scrub sync (matches burst lifetime). */
export const ARC_SPINE_SPARKLE_BURST_DURATION_SEC = 0.28;
const BURST_DURATION_SEC = ARC_SPINE_SPARKLE_BURST_DURATION_SEC;
const SPEED_MIN = 0.95;
const SPEED_MAX = 2.55;
const DRAG = 0.94;

const SPARKLE_VS = `
varying vec3 vColor;
uniform float uPixelScale;

void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float dist = max(-mvPosition.z, 0.15);
  gl_PointSize = clamp(uPixelScale / dist, 6.0, 128.0);
}
`;

const SPARKLE_FS = `
uniform float uFade;
varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float r = length(c) * 2.0;

  float core = 1.0 - smoothstep(0.0, 0.42, r);
  float mid = 1.0 - smoothstep(0.12, 0.78, r);
  float halo = 1.0 - smoothstep(0.32, 1.12, r);

  vec3 base = vColor * (core * 1.35 + mid * 0.62 + halo * 0.24);

  vec3 over = max(base - vec3(0.22), 0.0);
  vec3 bloom = over * 1.85 + over * over * 6.0;
  vec3 outRgb = base + bloom * 0.95;

  float a = (0.32 * core + 0.45 * mid + 0.16 * halo) * uFade;
  a = min(1.0, a + dot(over, vec3(0.4)) * 0.5 * uFade);

  gl_FragColor = vec4(outRgb, a);
}
`;

function createSparkleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uFade: { value: 1 },
      uPixelScale: { value: 115 },
    },
    vertexShader: SPARKLE_VS,
    fragmentShader: SPARKLE_FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });
}

export type ArcSpineHitSparkleBurst = {
  obj: THREE.Points;
  geo: THREE.BufferGeometry;
  mat: THREE.ShaderMaterial;
  vel: Float32Array;
  t: number;
};

export function spawnArcSpineHitSparkles(
  gx: number,
  gz: number,
  doc: MapDocument,
  scene: THREE.Scene,
  bursts: ArcSpineHitSparkleBurst[],
  chainIndex: number,
): void {
  const center = worldFromGrid(gx, gz, doc, 0.62);
  const pos = new Float32Array(SPARKLE_COUNT * 3);
  const col = new Float32Array(SPARKLE_COUNT * 3);
  const vel = new Float32Array(SPARKLE_COUNT * 3);
  const primary = new THREE.Color(
    chainIndex === 0 ? COLORS.chainLightningPrimary : COLORS.chainLightningBounce,
  );
  const hot = primary.clone().multiplyScalar(1.35);
  const pale = new THREE.Color(0xffffff).lerp(primary, 0.45);

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    pos[i * 3] = center.x + (Math.random() - 0.5) * 0.05;
    pos[i * 3 + 1] = center.y + (Math.random() - 0.5) * 0.06;
    pos[i * 3 + 2] = center.z + (Math.random() - 0.5) * 0.05;

    const theta = Math.random() * Math.PI * 2;
    const u = 2 * Math.random() - 1;
    const phi = Math.acos(u);
    const sp = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
    const sinP = Math.sin(phi);
    vel[i * 3] = sp * sinP * Math.cos(theta);
    vel[i * 3 + 1] =
      sp * Math.cos(phi) * 0.55 + sp * (0.28 + Math.random() * 0.22);
    vel[i * 3 + 2] = sp * sinP * Math.sin(theta);

    const rgb = hot.clone().lerp(pale, Math.random());
    col[i * 3] = rgb.r;
    col[i * 3 + 1] = rgb.g;
    col[i * 3 + 2] = rgb.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const mat = createSparkleMaterial();
  const obj = new THREE.Points(geo, mat);
  obj.renderOrder = 4;
  scene.add(obj);
  bursts.push({ obj, geo, mat, vel, t: BURST_DURATION_SEC });
}

export function updateArcSpineHitSparkles(
  bursts: ArcSpineHitSparkleBurst[],
  dt: number,
  scene: THREE.Scene,
): void {
  const initialT = BURST_DURATION_SEC;
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]!;
    b.t -= dt;
    const attr = b.geo.attributes.position as THREE.BufferAttribute;
    const p = attr.array as Float32Array;
    for (let j = 0; j < SPARKLE_COUNT; j++) {
      p[j * 3] += b.vel[j * 3] * dt;
      p[j * 3 + 1] += b.vel[j * 3 + 1] * dt;
      p[j * 3 + 2] += b.vel[j * 3 + 2] * dt;
      b.vel[j * 3 + 1] -= 1.35 * dt;
      b.vel[j * 3] *= DRAG;
      b.vel[j * 3 + 1] *= DRAG;
      b.vel[j * 3 + 2] *= DRAG;
    }
    attr.needsUpdate = true;
    b.mat.uniforms.uFade.value = Math.max(0, b.t / initialT);
    if (b.t <= 0) {
      scene.remove(b.obj);
      b.geo.dispose();
      b.mat.dispose();
      bursts.splice(i, 1);
    }
  }
}
