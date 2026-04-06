import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import { worldGroundGridSpan } from "./board.js";

/**
 * Water turbulence / seabed murk (world-tiled domain).
 * Based on GLSL Sandbox — David Hoskins; original water turbulence by joltz0r.
 */

/** Top surface of {@link buildMapBoard} cell boxes (`CELL_BOX` height). */
const CELL_TOP_Y = 0.055;

/** Caustic layer floats this far above the cell tops (translucent “water sheet”). */
const CAUSTIC_PLANE_Y_OFFSET = 0.05;

const VERT = `
varying vec2 vWorldXZ;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldXZ = worldPos.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = `
#define TAU 6.28318530718
#define MAX_ITER 5

uniform float uTime;
uniform float uTiling;
uniform float uOpacity;

varying vec2 vWorldXZ;

void main() {
  float time = uTime * 0.5 + 23.0;
  vec2 uv = vWorldXZ * uTiling;
  vec2 p = mod(uv * TAU, TAU) - 250.0;
  vec2 i = vec2(p);
  float c = 1.0;
  float inten = 0.005;

  for (int n = 0; n < MAX_ITER; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(
      cos(t - i.x) + sin(t + i.y),
      sin(t - i.y) + cos(t + i.x)
    );
    c += 1.0 / length(vec2(
      p.x / (sin(i.x + t) / inten),
      p.y / (cos(i.y + t) / inten)
    ));
  }
  c /= float(MAX_ITER);
  c = 1.17 - pow(c, 1.4);
  vec3 colour = vec3(pow(abs(c), 8.0));
  colour = clamp(colour + vec3(0.0, 0.35, 0.5), 0.0, 1.0);
  // Slightly mute so coral/path tiles stay readable under the blend.
  colour *= vec3(0.9, 0.94, 0.98);
  // ~50% less bright for a subtler water layer.
  colour *= 0.5;

  gl_FragColor = vec4(colour, uOpacity);
}
`;

export type SeabedOverlayResult = {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
};

/**
 * Horizontal translucent plane over the scene world ground grid (same span as `GridHelper` /
 * {@link worldGroundGridSpan}), above cell tops.
 * Caustics use world coordinates so the pattern tiles coherently as the camera pans.
 */
export function createSeabedOverlay(doc: MapDocument): SeabedOverlayResult {
  const span = worldGroundGridSpan(doc);
  const geo = new THREE.PlaneGeometry(span, span);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTiling: { value: 0.095 },
      /** Lower = more see-through (translucent water layer). */
      uOpacity: { value: 0.24 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "SeabedOverlay";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = CELL_TOP_Y + CAUSTIC_PLANE_Y_OFFSET;
  mesh.renderOrder = 1;

  return { mesh, material: mat };
}
