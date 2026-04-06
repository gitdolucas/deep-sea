import * as THREE from "three";
import type { VibrationDomeTuning } from "./vibration-dome-tuning.js";

/**
 * View-dependent rim glow after transmission. Patches MeshPhysicalMaterial
 * fragment shader — if Three.js changes meshphysical.glsl.js, grep for
 * `outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance` after upgrades.
 */

const USERDATA_KEY = "vzFresnelUniforms";

export type VibrationDomeFresnelUniforms = {
  uVzFresnelPower: THREE.IUniform<number>;
  uVzFresnelIntensity: THREE.IUniform<number>;
  uVzFresnelColor: THREE.IUniform<THREE.Color>;
};

const FRESNEL_UNIFORMS_AFTER_COMMON = /* glsl */ `
#include <common>

uniform float uVzFresnelPower;
uniform float uVzFresnelIntensity;
uniform vec3 uVzFresnelColor;
`;

/** After transmission_fragment; geometryNormal / geometryViewDir from lights chunks. */
const OUTGOING_LIGHT_NEEDLE =
  "\tvec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;";

const OUTGOING_LIGHT_REPLACE = /* glsl */ `\tvec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;

	{
		float vzNdV = saturate( dot( normalize( geometryNormal ), geometryViewDir ) );
		float vzFresnel = pow( 1.0 - vzNdV, uVzFresnelPower );
		outgoingLight += uVzFresnelColor * vzFresnel * uVzFresnelIntensity;
	}
`;

export function attachVibrationDomeFresnelRim(
  material: THREE.MeshPhysicalMaterial,
): void {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    if (shader.fragmentShader.includes("uVzFresnelPower")) return;

    shader.uniforms.uVzFresnelPower = { value: 4 };
    shader.uniforms.uVzFresnelIntensity = { value: 0.2 };
    shader.uniforms.uVzFresnelColor = {
      value: new THREE.Color(0x39ff6e),
    };

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      FRESNEL_UNIFORMS_AFTER_COMMON,
    );

    if (!shader.fragmentShader.includes(OUTGOING_LIGHT_NEEDLE)) {
      console.warn(
        "[vibration-dome-fresnel] meshphysical fragment missing outgoingLight line — Fresnel rim skipped. Check three.js version.",
      );
      return;
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      OUTGOING_LIGHT_NEEDLE,
      OUTGOING_LIGHT_REPLACE,
    );

    const refs: VibrationDomeFresnelUniforms = {
      uVzFresnelPower: shader.uniforms.uVzFresnelPower as THREE.IUniform<number>,
      uVzFresnelIntensity: shader.uniforms
        .uVzFresnelIntensity as THREE.IUniform<number>,
      uVzFresnelColor: shader.uniforms.uVzFresnelColor as THREE.IUniform<THREE.Color>,
    };
    (material.userData as { [key: string]: unknown })[USERDATA_KEY] = refs;
  };

  material.needsUpdate = true;
}

export function updateVibrationDomeFresnelUniforms(
  material: THREE.MeshPhysicalMaterial,
  t: VibrationDomeTuning,
): void {
  const refs = (material.userData as { [USERDATA_KEY]?: VibrationDomeFresnelUniforms })[
    USERDATA_KEY
  ];
  if (!refs) return;
  refs.uVzFresnelPower.value = t.fresnelPower;
  refs.uVzFresnelIntensity.value = t.fresnelIntensity;
  refs.uVzFresnelColor.value.set(t.fresnelColor);
}
