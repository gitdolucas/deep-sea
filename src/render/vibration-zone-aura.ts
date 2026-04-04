import * as THREE from "three";
import type { DefenseLevel } from "../game/types.js";

/** UserData tag for the floor aura mesh (dispose/sync). */
export const VIBRATION_AURA_USERDATA_KIND = "vibration_zone_aura";

const VS = `
uniform float uTime;
uniform float uRadius;
uniform float uDistortAmp;
uniform float uRippleFreq;

varying vec2 vLocalXY;
varying float vRadial;

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vLocalXY = position.xy;
  float rad = length(position.xy);
  vRadial = uRadius > 1.0e-4 ? rad / uRadius : 0.0;

  float wave = sin(rad * uRippleFreq - uTime * 3.2) * 0.5 + 0.5;
  float n = hash2(position.xy * 2.7 + uTime * 0.15);
  float tremble = (n - 0.5) * 2.0;
  float edgeAtten = 1.0 - smoothstep(0.82, 1.02, vRadial);
  float disp = uDistortAmp * (0.55 * wave + 0.22 * tremble) * edgeAtten;

  vec3 displaced = vec3(position.x, position.y, disp);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const FS = `
uniform float uTime;
uniform float uRadius;
uniform vec3 uTint;
uniform float uAlphaScale;

varying vec2 vLocalXY;
varying float vRadial;

void main() {
  float r = clamp(vRadial, 0.0, 1.0);
  float ripplesOut = sin((1.0 - r) * 30.0 - uTime * 4.2) * 0.5 + 0.5;
  float crest = smoothstep(0.32, 0.68, ripplesOut);
  float edge = smoothstep(1.0, 0.86, r);
  float baseAlpha = 0.055 * (1.0 - r * 0.65) * uAlphaScale;
  float pulse = sin(uTime * 5.0 + r * 8.0) * 0.5 + 0.5;
  float glow = (crest * 0.24 + baseAlpha * 2.5 + pulse * 0.04) * edge;
  vec3 baseCol = vec3(0.015, 0.045, 0.03);
  vec3 col = mix(baseCol, uTint, glow * 1.65);
  float alpha = clamp((baseAlpha + crest * 0.16 * edge + pulse * 0.025 * edge) * uAlphaScale, 0.0, 0.55);
  if (alpha < 0.012) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

function tierParams(level: DefenseLevel): {
  distortAmp: number;
  rippleFreq: number;
  alphaScale: number;
} {
  switch (level) {
    case 1:
      return { distortAmp: 0.011, rippleFreq: 7.5, alphaScale: 0.85 };
    case 2:
      return { distortAmp: 0.022, rippleFreq: 10.0, alphaScale: 1.0 };
    case 3:
      return { distortAmp: 0.038, rippleFreq: 13.0, alphaScale: 1.2 };
  }
}

/** World-space tint (#39ff6e-style bioluminescent green). */
const DEFAULT_TINT = new THREE.Color(0x39ff6e);

export function createVibrationZoneAuraMesh(
  level: DefenseLevel,
  radiusTiles: number,
): THREE.Mesh {
  const geom = new THREE.CircleGeometry(radiusTiles, 88);
  const { distortAmp, rippleFreq, alphaScale } = tierParams(level);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: radiusTiles },
      uDistortAmp: { value: distortAmp },
      uRippleFreq: { value: rippleFreq },
      uTint: { value: DEFAULT_TINT.clone() },
      uAlphaScale: { value: alphaScale },
    },
    vertexShader: VS,
    fragmentShader: FS,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.kind = VIBRATION_AURA_USERDATA_KIND;
  mesh.renderOrder = 1;
  return mesh;
}

export function updateVibrationZoneAuraMaterial(
  mat: THREE.ShaderMaterial,
  elapsedTime: number,
  level: DefenseLevel,
): void {
  mat.uniforms.uTime.value = elapsedTime;
  const t = tierParams(level);
  mat.uniforms.uDistortAmp.value = t.distortAmp;
  mat.uniforms.uRippleFreq.value = t.rippleFreq;
  mat.uniforms.uAlphaScale.value = t.alphaScale;
}

/** When `radiusTiles` or recycle: replace geometry and radius uniform. */
export function applyVibrationZoneAuraRadius(
  mesh: THREE.Mesh,
  radiusTiles: number,
): void {
  const geom = new THREE.CircleGeometry(radiusTiles, 88);
  mesh.geometry.dispose();
  mesh.geometry = geom;
  const mat = mesh.material as THREE.ShaderMaterial;
  mat.uniforms.uRadius.value = radiusTiles;
}
