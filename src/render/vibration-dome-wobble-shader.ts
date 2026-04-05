import * as THREE from "three";
import type { VibrationDomeTuning } from "./vibration-dome-tuning.js";

/** Attached to `material.userData` after first compile. */
export type VibrationDomeWobbleUniforms = {
  uVzWobbleTime: THREE.IUniform<number>;
  uVzWobbleAmp: THREE.IUniform<number>;
  uVzWobbleFreq: THREE.IUniform<number>;
  uVzWobbleRadial: THREE.IUniform<number>;
};

const USERDATA_KEY = "vzWobbleUniforms";

/** Must live at global scope — not inside `main()`. */
const WOBBLE_UNIFORMS_AFTER_COMMON = /* glsl */ `
#include <common>

uniform float uVzWobbleTime;
uniform float uVzWobbleAmp;
uniform float uVzWobbleFreq;
uniform float uVzWobbleRadial;
`;

const WOBBLE_AFTER_BEGIN_VERTEX = /* glsl */ `
#include <begin_vertex>
{
  if ( uVzWobbleAmp > 1.0e-6 ) {
    vec3 n = normalize( transformedNormal );
    float t = uVzWobbleTime;
    float f = uVzWobbleFreq;
    float s1 = sin( dot( transformed, vec3( f, f * 1.17, f * 0.93 ) ) + t * 3.1 );
    float s2 =       cos( transformed.x * f * 1.4 - transformed.y * f * 0.81 + t * 2.65 );
    float rad = length( transformed.xz );
    float s3 = sin( rad * uVzWobbleRadial - t * 4.8 );
    float w = s1 * 0.45 + s2 * 0.33 + s3 * 0.22;
    w = clamp( w, -1.2, 1.2 );
    transformed += n * ( uVzWobbleAmp * w );
  }
}
`;

/**
 * Vertex displacement on the physical / transmissive dome — keeps Three’s
 * transmission pipeline; injects after `<begin_vertex>` when `transformedNormal` exists.
 */
export function attachVibrationDomeVertexWobble(
  material: THREE.MeshPhysicalMaterial,
): void {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    if (shader.vertexShader.includes("uVzWobbleTime")) return;

    shader.uniforms.uVzWobbleTime = { value: 0 };
    shader.uniforms.uVzWobbleAmp = { value: 0.06 };
    shader.uniforms.uVzWobbleFreq = { value: 3 };
    shader.uniforms.uVzWobbleRadial = { value: 4 };

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      WOBBLE_UNIFORMS_AFTER_COMMON,
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      WOBBLE_AFTER_BEGIN_VERTEX,
    );

    const refs: VibrationDomeWobbleUniforms = {
      uVzWobbleTime: shader.uniforms.uVzWobbleTime as THREE.IUniform<number>,
      uVzWobbleAmp: shader.uniforms.uVzWobbleAmp as THREE.IUniform<number>,
      uVzWobbleFreq: shader.uniforms.uVzWobbleFreq as THREE.IUniform<number>,
      uVzWobbleRadial: shader.uniforms.uVzWobbleRadial as THREE.IUniform<number>,
    };
    (material.userData as { [key: string]: unknown })[USERDATA_KEY] = refs;
  };

  material.needsUpdate = true;
}

export function updateVibrationDomeWobbleUniforms(
  material: THREE.MeshPhysicalMaterial,
  elapsedSeconds: number,
  t: VibrationDomeTuning,
): void {
  const refs = (material.userData as { [USERDATA_KEY]?: VibrationDomeWobbleUniforms })[
    USERDATA_KEY
  ];
  if (!refs) return;
  refs.uVzWobbleTime.value = elapsedSeconds * t.wobbleTimeScale;
  refs.uVzWobbleAmp.value = t.wobbleEnabled ? t.wobbleAmp : 0;
  refs.uVzWobbleFreq.value = t.wobbleFreq;
  refs.uVzWobbleRadial.value = t.wobbleRadial;
}
