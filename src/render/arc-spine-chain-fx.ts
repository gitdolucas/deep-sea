import * as THREE from "three";

const SUBDIV_ITERS = 6;
const DISPLACEMENT_SCALE = 0.62;

/** Half-width of ribbon in world units (~tiles). Keep small — reads as a tight bolt, not a beam. */
export const ARC_SPINE_CHAIN_HALF_WIDTH = 0.028;

// `color` is already declared by Three's ShaderMaterial prefix when vertexColors: true.
const VS = `
attribute float pathT;
varying vec3 vColor;
varying float vPathT;

void main() {
  vColor = color;
  vPathT = pathT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Humus-style electro plasma along the bolt (2D mapping from `vPathT`).
 * Noise: hash FBM — not Shadertoy Simplex (CC BY-NC-SA).
 */
const FS = `
uniform float uTime;
uniform float uFade;

varying vec3 vColor;
varying float vPathT;

float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 33.32);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 m) {
  return 0.5333333 * vnoise(m)
    + 0.2666667 * vnoise(2.0 * m)
    + 0.1333333 * vnoise(4.0 * m)
    + 0.0666667 * vnoise(8.0 * m);
}

void main() {
  float a = vPathT;
  // Wider vertical analogue to full-screen uv (Humus used ~[-1,1]²); narrow range made y always large → black after (1-g)^4.
  vec2 uv = vec2(a * 2.0 - 1.0, sin(a * 38.0 + uTime * 13.0));
  vec2 p = vec2(
    a * 1.12 + 0.03 * sin(uTime * 3.5 + a * 22.0),
    a * 0.88 + uTime * 0.06
  );
  vec3 p3 = vec3(p, uTime * 0.4);
  float intensity = fbm(p3 * 12.0 + 12.0);
  intensity = intensity * 2.0 - 1.0;

  float t = clamp((uv.x * -uv.x * 0.16) + 0.15, 0.0, 1.0);
  float y = abs(intensity * -t + uv.y);
  float g = pow(clamp(y * 0.55, 0.0005, 1.0), 0.2);

  vec3 plasma = vec3(1.35, 1.2, 1.48);
  plasma = plasma * -g + plasma;
  // Single squaring — double was crushing line pixels vs fullscreen demo.
  plasma = plasma * plasma;

  float flicker = sin(uTime * 72.0 + vPathT * 48.0) * 0.14 + 0.91;
  float crackle = fract(sin((vPathT * 63.1 + uTime * 14.7)) * 43758.5453);
  float n = 0.8 + 0.28 * crackle;
  vec3 core = mix(vColor, vec3(0.82, 0.92, 1.0), 0.4) * flicker * n;

  vec3 electro = plasma * vColor * 3.2;
  vec3 outRgb = electro + core * 1.1;
  float alpha = (0.52 + 0.44 * flicker) * uFade;

  // Bright-pass reinjection (~bloom) without full-screen blur: exaggerates hot core + cyan fringe.
  vec3 over = max(outRgb - vec3(0.42), 0.0);
  outRgb += over * 2.35 + over * over * 4.2;
  alpha = min(1.0, alpha + dot(over, vec3(0.35)) * 0.38 * uFade);

  gl_FragColor = vec4(outRgb, alpha);
}
`;

const _dir = new THREE.Vector3();
const _helper = new THREE.Vector3();
const _perpA = new THREE.Vector3();
const _perpB = new THREE.Vector3();

/**
 * Build a random jagged path from `start` to `end` (midpoint displacement, new RNG each call).
 */
function buildRandomLightningPolyline(
  start: THREE.Vector3,
  end: THREE.Vector3,
  rng: () => number,
): THREE.Vector3[] {
  let pts: THREE.Vector3[] = [start.clone(), end.clone()];

  for (let iter = 0; iter < SUBDIV_ITERS; iter++) {
    const falloff = DISPLACEMENT_SCALE * Math.pow(0.52, iter + 1);
    const next: THREE.Vector3[] = [];
    next.push(pts[0]!.clone());

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      _dir.subVectors(b, a);
      const segLen = _dir.length();
      if (segLen < 1e-6) {
        next.push(b.clone());
        continue;
      }
      _dir.multiplyScalar(1 / segLen);

      if (Math.abs(_dir.y) < 0.95) {
        _helper.set(0, 1, 0);
      } else {
        _helper.set(1, 0, 0);
      }
      _perpA.crossVectors(_dir, _helper).normalize();
      _perpB.crossVectors(_dir, _perpA).normalize();

      const u = (rng() - 0.5) * 2;
      const v = (rng() - 0.5) * 2;
      const w = (rng() - 0.5) * 2;
      const mag = segLen * falloff;

      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const mz = (a.z + b.z) * 0.5;

      const mid = new THREE.Vector3(
        mx + (_perpA.x * u + _perpB.x * v) * mag + _dir.x * w * mag * 0.18,
        my + (_perpA.y * u + _perpB.y * v + _dir.y * w) * mag * 0.55,
        mz + (_perpA.z * u + _perpB.z * v) * mag + _dir.z * w * mag * 0.18,
      );

      next.push(mid);
      next.push(b.clone());
    }
    pts = next;
  }

  return pts;
}

function createLightningMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
    },
    vertexShader: VS,
    fragmentShader: FS,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
}

function pushRibbonQuad(
  qa: THREE.Vector3,
  qb: THREE.Vector3,
  col: THREE.Color,
  ptA: number,
  ptB: number,
  halfW: number,
  positions: number[],
  colors: number[],
  pathT: number[],
  indices: number[],
): void {
  _dir.subVectors(qb, qa);
  const segLen = _dir.length();
  if (segLen < 1e-6) return;
  _dir.multiplyScalar(1 / segLen);

  _helper.set(0, 1, 0);
  _perpA.crossVectors(_dir, _helper);
  if (_perpA.lengthSq() < 1e-10) {
    _helper.set(1, 0, 0);
    _perpA.crossVectors(_dir, _helper);
  }
  _perpA.normalize().multiplyScalar(halfW);

  const i0 = positions.length / 3;
  const ax = qa.x - _perpA.x;
  const ay = qa.y - _perpA.y;
  const az = qa.z - _perpA.z;
  const bx = qa.x + _perpA.x;
  const by = qa.y + _perpA.y;
  const bz = qa.z + _perpA.z;
  const cx = qb.x + _perpA.x;
  const cy = qb.y + _perpA.y;
  const cz = qb.z + _perpA.z;
  const dx = qb.x - _perpA.x;
  const dy = qb.y - _perpA.y;
  const dz = qb.z - _perpA.z;

  positions.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
  for (let i = 0; i < 4; i++) {
    colors.push(col.r, col.g, col.b);
  }
  pathT.push(ptA, ptA, ptB, ptB);
  indices.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
}

/**
 * Random jagged lightning polylines per hop as a thick ribbon mesh (world-space width), electro shader, primary vs bounce tint.
 */
export function createArcSpineLightningLine(
  points: THREE.Vector3[],
  primaryHex: number,
  bounceHex: number,
): THREE.Mesh {
  const rng = Math.random;
  const hops = points.length - 1;
  const geometry = new THREE.BufferGeometry();
  if (hops < 1) {
    const mat = createLightningMaterial();
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.renderOrder = 3;
    return mesh;
  }

  const primary = new THREE.Color(primaryHex);
  const bounceCol = new THREE.Color(bounceHex);

  const polylines: THREE.Vector3[][] = [];
  const hopColors: THREE.Color[] = [];
  for (let h = 0; h < hops; h++) {
    const start = points[h]!;
    const end = points[h + 1]!;
    polylines.push(buildRandomLightningPolyline(start, end, rng));
    hopColors.push(h === 0 ? primary : bounceCol);
  }

  let totalSegs = 0;
  for (const poly of polylines) {
    totalSegs += Math.max(0, poly.length - 1);
  }
  const div = Math.max(1, totalSegs);

  const positions: number[] = [];
  const colors: number[] = [];
  const pathT: number[] = [];
  const indices: number[] = [];
  let segIdx = 0;
  const halfW = ARC_SPINE_CHAIN_HALF_WIDTH;

  for (let h = 0; h < hops; h++) {
    const poly = polylines[h]!;
    const col = hopColors[h]!;
    const segs = poly.length - 1;
    for (let k = 0; k < segs; k++) {
      const qa = poly[k]!;
      const qb = poly[k + 1]!;
      const ptA = segIdx / div;
      const ptB = (segIdx + 1) / div;
      segIdx++;
      pushRibbonQuad(qa, qb, col, ptA, ptB, halfW, positions, colors, pathT, indices);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("pathT", new THREE.Float32BufferAttribute(pathT, 1));

  const mat = createLightningMaterial();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.renderOrder = 3;
  return mesh;
}
