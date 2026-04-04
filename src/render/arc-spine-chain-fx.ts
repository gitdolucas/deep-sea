import * as THREE from "three";

const SUBDIV_ITERS = 6;
const DISPLACEMENT_SCALE = 0.62;

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

const FS = `
uniform float uTime;
uniform float uFade;

varying vec3 vColor;
varying float vPathT;

void main() {
  float flicker = sin(uTime * 72.0 + vPathT * 48.0) * 0.15 + 0.92;
  float crackle = fract(sin((vPathT * 63.1 + uTime * 14.7)) * 43758.5453);
  float n = 0.82 + 0.26 * crackle;
  vec3 core = mix(vColor, vec3(0.82, 0.92, 1.0), 0.42);
  vec3 outRgb = core * flicker * n;
  float alpha = (0.5 + 0.42 * flicker) * uFade;
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
  });
}

/**
 * Random jagged lightning polylines per hop (`LineSegments`), shader flicker, primary vs bounce tint.
 */
export function createArcSpineLightningLine(
  points: THREE.Vector3[],
  primaryHex: number,
  bounceHex: number,
): THREE.LineSegments {
  const rng = Math.random;
  const hops = points.length - 1;
  const geometry = new THREE.BufferGeometry();
  if (hops < 1) {
    const mat = createLightningMaterial();
    const line = new THREE.LineSegments(geometry, mat);
    line.renderOrder = 3;
    return line;
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
  let segIdx = 0;

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
      positions.push(qa.x, qa.y, qa.z, qb.x, qb.y, qb.z);
      colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
      pathT.push(ptA, ptB);
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("pathT", new THREE.Float32BufferAttribute(pathT, 1));

  const mat = createLightningMaterial();
  const line = new THREE.LineSegments(geometry, mat);
  line.renderOrder = 3;
  return line;
}
