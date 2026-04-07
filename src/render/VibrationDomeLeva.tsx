import { button, folder, Leva, useControls } from "leva";
import { useReducer } from "react";
import type { InkVeilSurfaceBlending } from "./ink-veil-tuning.js";
import {
  copyVibrationDomeTuningToClipboard,
  DEFAULT_VIBRATION_DOME_TUNING,
  resetVibrationDomeTuning,
  vibrationDomeTuning,
  type VibrationDomeSide,
} from "./vibration-dome-tuning.js";

/** Control tree for Leva — reused by `VisualShowcaseLeva` master panel. */
export function vibrationDomeLevaSchema(onRemount: () => void) {
  const d = DEFAULT_VIBRATION_DOME_TUNING;

  return {
      General: folder({
        applyOverrides: {
          value: d.applyOverrides,
          label: "Apply overrides",
          onChange: (v: boolean) => {
            vibrationDomeTuning.applyOverrides = v;
          },
        },
        Reset: button(() => {
          resetVibrationDomeTuning();
          onRemount();
        }),
        "Copy all (JSON)": button(() => {
          void copyVibrationDomeTuningToClipboard().then((ok) => {
            if (ok) console.info("[Vibration dome] Copied tuning JSON to clipboard.");
            else console.warn("[Vibration dome] Could not copy to clipboard.");
          });
        }),
      }),
      Material: folder({
        transmission: {
          value: d.transmission,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.transmission = v;
          },
        },
        thicknessScale: {
          value: d.thicknessScale,
          min: 0.2,
          max: 3,
          step: 0.05,
          onChange: (v: number) => {
            vibrationDomeTuning.thicknessScale = v;
          },
        },
        roughness: {
          value: d.roughness,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.roughness = v;
          },
        },
        metalness: {
          value: d.metalness,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.metalness = v;
          },
        },
        ior: {
          value: d.ior,
          min: 1,
          max: 2.5,
          step: 0.02,
          onChange: (v: number) => {
            vibrationDomeTuning.ior = v;
          },
        },
        opacity: {
          value: d.opacity,
          min: 0.1,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.opacity = v;
          },
        },
        depthWrite: {
          value: d.depthWrite,
          onChange: (v: boolean) => {
            vibrationDomeTuning.depthWrite = v;
          },
        },
        side: {
          value: d.side,
          options: ["double", "front", "back"] as VibrationDomeSide[],
          onChange: (v: VibrationDomeSide) => {
            vibrationDomeTuning.side = v;
          },
        },
        renderOrder: {
          value: d.renderOrder,
          min: -2,
          max: 10,
          step: 1,
          onChange: (v: number) => {
            vibrationDomeTuning.renderOrder = Math.round(v);
          },
        },
        dispersion: {
          value: d.dispersion,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.dispersion = v;
          },
        },
      }),
      Attenuation: folder({
        attenuationDistance: {
          value: d.attenuationDistance,
          min: 0.5,
          max: 40,
          step: 0.5,
          onChange: (v: number) => {
            vibrationDomeTuning.attenuationDistance = v;
          },
        },
        attenuationColor: {
          value: d.attenuationColor,
          onChange: (v: string) => {
            vibrationDomeTuning.attenuationColor = v;
          },
        },
        baseColor: {
          value: d.baseColor,
          onChange: (v: string) => {
            vibrationDomeTuning.baseColor = v;
          },
        },
      }),
      Emissive: folder({
        emissiveScale: {
          value: d.emissiveScale,
          min: 0,
          max: 0.4,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.emissiveScale = v;
          },
        },
        emissiveIntensity: {
          value: d.emissiveIntensity,
          min: 0,
          max: 3,
          step: 0.05,
          onChange: (v: number) => {
            vibrationDomeTuning.emissiveIntensity = v;
          },
        },
      }),
      Fresnel: folder({
        fresnelPower: {
          value: d.fresnelPower,
          min: 0.5,
          max: 12,
          step: 0.1,
          label: "Power",
          onChange: (v: number) => {
            vibrationDomeTuning.fresnelPower = v;
          },
        },
        fresnelIntensity: {
          value: d.fresnelIntensity,
          min: 0,
          max: 1.5,
          step: 0.01,
          label: "Intensity",
          onChange: (v: number) => {
            vibrationDomeTuning.fresnelIntensity = v;
          },
        },
        fresnelColor: {
          value: d.fresnelColor,
          label: "Color",
          onChange: (v: string) => {
            vibrationDomeTuning.fresnelColor = v;
          },
        },
      }),
      Clearcoat: folder({
        clearcoat: {
          value: d.clearcoat,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.clearcoat = v;
          },
        },
        clearcoatRoughness: {
          value: d.clearcoatRoughness,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.clearcoatRoughness = v;
          },
        },
        envMapIntensity: {
          value: d.envMapIntensity,
          min: 0,
          max: 3,
          step: 0.05,
          onChange: (v: number) => {
            vibrationDomeTuning.envMapIntensity = v;
          },
        },
      }),
      Geometry: folder({
        geometryWidthSegments: {
          value: d.geometryWidthSegments,
          min: 8,
          max: 96,
          step: 1,
          onChange: (v: number) => {
            vibrationDomeTuning.geometryWidthSegments = Math.round(v);
          },
        },
        geometryHeightSegments: {
          value: d.geometryHeightSegments,
          min: 4,
          max: 48,
          step: 1,
          onChange: (v: number) => {
            vibrationDomeTuning.geometryHeightSegments = Math.round(v);
          },
        },
        floorYOffset: {
          value: d.floorYOffset,
          min: -0.5,
          max: 0.5,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.floorYOffset = v;
          },
        },
      }),
      "Base disk (seabed)": folder({
        baseDiskEnabled: {
          value: d.baseDiskEnabled,
          label: "Enabled",
          onChange: (v: boolean) => {
            vibrationDomeTuning.baseDiskEnabled = v;
          },
        },
        baseDiskSegments: {
          value: d.baseDiskSegments,
          min: 8,
          max: 128,
          step: 1,
          label: "Segments",
          onChange: (v: number) => {
            vibrationDomeTuning.baseDiskSegments = Math.round(v);
          },
        },
        baseDiskYOffset: {
          value: d.baseDiskYOffset,
          min: -0.5,
          max: 4,
          step: 0.02,
          label: "Y offset",
          onChange: (v: number) => {
            vibrationDomeTuning.baseDiskYOffset = v;
          },
        },
        baseDiskColor: {
          value: d.baseDiskColor,
          onChange: (v: string) => {
            vibrationDomeTuning.baseDiskColor = v;
          },
        },
        baseDiskOpacity: {
          value: d.baseDiskOpacity,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            vibrationDomeTuning.baseDiskOpacity = v;
          },
        },
        baseDiskEdgeSoftness: {
          value: d.baseDiskEdgeSoftness,
          min: 0.02,
          max: 0.45,
          step: 0.01,
          label: "Edge softness",
          onChange: (v: number) => {
            vibrationDomeTuning.baseDiskEdgeSoftness = v;
          },
        },
        "Rim & falloff": folder({
          baseDiskRimColor: {
            value: d.baseDiskRimColor,
            label: "Rim color",
            onChange: (v: string) => {
              vibrationDomeTuning.baseDiskRimColor = v;
            },
          },
          baseDiskRimIntensity: {
            value: d.baseDiskRimIntensity,
            min: 0,
            max: 1.5,
            step: 0.02,
            label: "Rim intensity",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskRimIntensity = v;
            },
          },
          baseDiskRimPower: {
            value: d.baseDiskRimPower,
            min: 0.5,
            max: 10,
            step: 0.05,
            label: "Rim power",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskRimPower = v;
            },
          },
          baseDiskEdgeInnerK: {
            value: d.baseDiskEdgeInnerK,
            min: 0.5,
            max: 6,
            step: 0.05,
            label: "Edge inner K",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskEdgeInnerK = v;
            },
          },
          baseDiskEdgeOuterK: {
            value: d.baseDiskEdgeOuterK,
            min: 0.1,
            max: 3,
            step: 0.05,
            label: "Edge outer K",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskEdgeOuterK = v;
            },
          },
          baseDiskEdgeDiscardK: {
            value: d.baseDiskEdgeDiscardK,
            min: 0.5,
            max: 4,
            step: 0.05,
            label: "Discard K",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskEdgeDiscardK = v;
            },
          },
          baseDiskCenterHole: {
            value: d.baseDiskCenterHole,
            min: 0,
            max: 1,
            step: 0.02,
            label: "Center fade",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskCenterHole = v;
            },
          },
          baseDiskCenterHoleRadius: {
            value: d.baseDiskCenterHoleRadius,
            min: 0.05,
            max: 0.95,
            step: 0.01,
            label: "Hole inner r",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskCenterHoleRadius = v;
            },
          },
        }),
        "Procedural pool (fbm)": folder({
          baseDiskNoiseScaleBase: {
            value: d.baseDiskNoiseScaleBase,
            min: 0.5,
            max: 8,
            step: 0.05,
            label: "Noise scale base",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskNoiseScaleBase = v;
            },
          },
          baseDiskNoiseScalePerLevel: {
            value: d.baseDiskNoiseScalePerLevel,
            min: 0,
            max: 0.6,
            step: 0.01,
            label: "Noise / level",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskNoiseScalePerLevel = v;
            },
          },
          baseDiskFresnelPow: {
            value: d.baseDiskFresnelPow,
            min: 0.5,
            max: 12,
            step: 0.1,
            label: "Ink fresnel pow",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskFresnelPow = v;
            },
          },
          baseDiskNoiseTimeScale: {
            value: d.baseDiskNoiseTimeScale,
            min: 0,
            max: 2.5,
            step: 0.05,
            label: "Noise time",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskNoiseTimeScale = v;
            },
          },
          baseDiskFbmStrength: {
            value: d.baseDiskFbmStrength,
            min: 0,
            max: 5,
            step: 0.05,
            label: "Fbm strength",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskFbmStrength = v;
            },
          },
          baseDiskSwirlTierBase: {
            value: d.baseDiskSwirlTierBase,
            min: 0,
            max: 1,
            step: 0.01,
            label: "Swirl tier base",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskSwirlTierBase = v;
            },
          },
          baseDiskSwirlTierPerLevel: {
            value: d.baseDiskSwirlTierPerLevel,
            min: 0,
            max: 0.2,
            step: 0.005,
            label: "Swirl / level",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskSwirlTierPerLevel = v;
            },
          },
          baseDiskStreakAngFreq: {
            value: d.baseDiskStreakAngFreq,
            min: 2,
            max: 36,
            step: 0.5,
            label: "Streak ang",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskStreakAngFreq = v;
            },
          },
          baseDiskStreakRadialFreq: {
            value: d.baseDiskStreakRadialFreq,
            min: 2,
            max: 30,
            step: 0.5,
            label: "Streak radial",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskStreakRadialFreq = v;
            },
          },
          baseDiskStreakTimeScale: {
            value: d.baseDiskStreakTimeScale,
            min: 0.5,
            max: 16,
            step: 0.25,
            label: "Streak speed",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskStreakTimeScale = v;
            },
          },
          baseDiskProcAlphaGlobal: {
            value: d.baseDiskProcAlphaGlobal,
            min: 0.2,
            max: 1.5,
            step: 0.02,
            label: "Proc alpha global",
            onChange: (v: number) => {
              vibrationDomeTuning.baseDiskProcAlphaGlobal = v;
            },
          },
          Swirl: folder({
            baseDiskSwirlL1: {
              value: d.baseDiskSwirlSpeed[0],
              min: 0,
              max: 8,
              step: 0.05,
              label: "L1",
              onChange: (v: number) => {
                (vibrationDomeTuning.baseDiskSwirlSpeed as number[])[0] = v;
              },
            },
            baseDiskSwirlL2: {
              value: d.baseDiskSwirlSpeed[1],
              min: 0,
              max: 8,
              step: 0.05,
              label: "L2",
              onChange: (v: number) => {
                (vibrationDomeTuning.baseDiskSwirlSpeed as number[])[1] = v;
              },
            },
            baseDiskSwirlL3: {
              value: d.baseDiskSwirlSpeed[2],
              min: 0,
              max: 8,
              step: 0.05,
              label: "L3",
              onChange: (v: number) => {
                (vibrationDomeTuning.baseDiskSwirlSpeed as number[])[2] = v;
              },
            },
          }),
          "Opacity mul": folder({
            baseDiskOpacityMulL1: {
              value: d.baseDiskOpacityMul[0],
              min: 0.2,
              max: 2,
              step: 0.02,
              label: "L1",
              onChange: (v: number) => {
                (vibrationDomeTuning.baseDiskOpacityMul as number[])[0] = v;
              },
            },
            baseDiskOpacityMulL2: {
              value: d.baseDiskOpacityMul[1],
              min: 0.2,
              max: 2,
              step: 0.02,
              label: "L2",
              onChange: (v: number) => {
                (vibrationDomeTuning.baseDiskOpacityMul as number[])[1] = v;
              },
            },
            baseDiskOpacityMulL3: {
              value: d.baseDiskOpacityMul[2],
              min: 0.2,
              max: 2,
              step: 0.02,
              label: "L3",
              onChange: (v: number) => {
                (vibrationDomeTuning.baseDiskOpacityMul as number[])[2] = v;
              },
            },
          }),
          "Ring hint": folder({
            baseDiskRingL1: {
              value: d.baseDiskRingHint[0],
              min: 0,
              max: 1,
              step: 0.02,
              label: "L1",
              onChange: (v: number) => {
                (vibrationDomeTuning.baseDiskRingHint as number[])[0] = v;
              },
            },
            baseDiskRingL2: {
              value: d.baseDiskRingHint[1],
              min: 0,
              max: 1,
              step: 0.02,
              label: "L2",
              onChange: (v: number) => {
                (vibrationDomeTuning.baseDiskRingHint as number[])[1] = v;
              },
            },
            baseDiskRingL3: {
              value: d.baseDiskRingHint[2],
              min: 0,
              max: 1,
              step: 0.02,
              label: "L3",
              onChange: (v: number) => {
                (vibrationDomeTuning.baseDiskRingHint as number[])[2] = v;
              },
            },
          }),
        }),
        baseDiskRenderOrder: {
          value: d.baseDiskRenderOrder,
          min: -4,
          max: 10,
          step: 1,
          label: "Render order",
          onChange: (v: number) => {
            vibrationDomeTuning.baseDiskRenderOrder = Math.round(v);
          },
        },
        baseDiskDepthWrite: {
          value: d.baseDiskDepthWrite,
          label: "Depth write",
          onChange: (v: boolean) => {
            vibrationDomeTuning.baseDiskDepthWrite = v;
          },
        },
        baseDiskDepthTest: {
          value: d.baseDiskDepthTest,
          label: "Depth test",
          onChange: (v: boolean) => {
            vibrationDomeTuning.baseDiskDepthTest = v;
          },
        },
        baseDiskBlending: {
          value: d.baseDiskBlending,
          options: ["normal", "additive", "multiply"] as InkVeilSurfaceBlending[],
          label: "Blending",
          onChange: (v: InkVeilSurfaceBlending) => {
            vibrationDomeTuning.baseDiskBlending = v;
          },
        },
      }),
      "Field particles": folder({
        fieldParticlesEnabled: {
          value: d.fieldParticlesEnabled,
          label: "Enabled",
          onChange: (v: boolean) => {
            vibrationDomeTuning.fieldParticlesEnabled = v;
          },
        },
        fieldParticleRenderOrder: {
          value: d.fieldParticleRenderOrder,
          min: -4,
          max: 12,
          step: 1,
          label: "Render order",
          onChange: (v: number) => {
            vibrationDomeTuning.fieldParticleRenderOrder = Math.round(v);
          },
        },
        fieldParticleYOffset: {
          value: d.fieldParticleYOffset,
          min: -2,
          max: 4,
          step: 0.02,
          label: "Y offset (burst base)",
          onChange: (v: number) => {
            vibrationDomeTuning.fieldParticleYOffset = v;
          },
        },
        Count: folder({
          fieldParticleL1: {
            value: d.fieldParticleCount[0],
            min: 0,
            max: 600,
            step: 1,
            label: "L1",
            onChange: (v: number) => {
              (vibrationDomeTuning.fieldParticleCount as number[])[0] = Math.round(v);
            },
          },
          fieldParticleL2: {
            value: d.fieldParticleCount[1],
            min: 0,
            max: 400,
            step: 1,
            label: "L2",
            onChange: (v: number) => {
              (vibrationDomeTuning.fieldParticleCount as number[])[1] = Math.round(v);
            },
          },
          fieldParticleL3: {
            value: d.fieldParticleCount[2],
            min: 0,
            max: 400,
            step: 1,
            label: "L3",
            onChange: (v: number) => {
              (vibrationDomeTuning.fieldParticleCount as number[])[2] = Math.round(v);
            },
          },
        }),
        Motion: folder({
          fieldParticleTimeLo: {
            value: d.fieldParticleTimeLo,
            min: 0,
            max: 3,
            step: 0.02,
            label: "Time scale lo",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleTimeLo = v;
            },
          },
          fieldParticleTimeRange: {
            value: d.fieldParticleTimeRange,
            min: 0,
            max: 2,
            step: 0.02,
            label: "Time scale range",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleTimeRange = v;
            },
          },
          fieldParticleOrbitSpeed: {
            value: d.fieldParticleOrbitSpeed,
            min: 0,
            max: 14,
            step: 0.05,
            label: "Pulse to shell",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleOrbitSpeed = v;
            },
          },
          fieldParticleRadialTightness: {
            value: d.fieldParticleRadialTightness,
            min: 0.4,
            max: 1.12,
            step: 0.01,
            label: "Shell reach",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleRadialTightness = v;
            },
          },
          fieldParticleWobbleAlongOrbit: {
            value: d.fieldParticleWobbleAlongOrbit,
            min: 0,
            max: 0.45,
            step: 0.01,
            label: "Dir jitter",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleWobbleAlongOrbit = v;
            },
          },
          fieldParticleWobbleStr: {
            value: d.fieldParticleWobbleStr,
            min: 0,
            max: 0.28,
            step: 0.005,
            label: "Radial noise",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleWobbleStr = v;
            },
          },
          fieldParticleLiftRate: {
            value: d.fieldParticleLiftRate,
            min: 0,
            max: 8,
            step: 0.05,
            label: "Pulse beat rate",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleLiftRate = v;
            },
          },
          fieldParticleWobbleFreq: {
            value: d.fieldParticleWobbleFreq,
            min: 0,
            max: 16,
            step: 0.05,
            label: "Shell wobble freq",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleWobbleFreq = v;
            },
          },
          fieldParticleWobblePhaseMul: {
            value: d.fieldParticleWobblePhaseMul,
            min: 0,
            max: 14,
            step: 0.05,
            label: "Shell wobble phase",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleWobblePhaseMul = v;
            },
          },
          fieldParticleLiftAmp: {
            value: d.fieldParticleLiftAmp,
            min: 0,
            max: 0.35,
            step: 0.005,
            label: "Shell wobble amp",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleLiftAmp = v;
            },
          },
        }),
        "Size (px)": folder({
          fieldParticlePointSizeMul: {
            value: d.fieldParticlePointSizeMul,
            min: 0.05,
            max: 4,
            step: 0.02,
            label: "Global mul",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticlePointSizeMul = v;
            },
          },
          fieldParticlePxBase: {
            value: d.fieldParticlePxBase,
            min: 0,
            max: 80,
            step: 1,
            label: "Base px",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticlePxBase = v;
            },
          },
          fieldParticlePxSpread: {
            value: d.fieldParticlePxSpread,
            min: 0,
            max: 60,
            step: 1,
            label: "Random px",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticlePxSpread = v;
            },
          },
        }),
        Look: folder({
          fieldParticleColor: {
            value: d.fieldParticleColor,
            label: "Tint",
            onChange: (v: string) => {
              vibrationDomeTuning.fieldParticleColor = v;
            },
          },
          fieldParticleOpacityMul: {
            value: d.fieldParticleOpacityMul,
            min: 0,
            max: 2,
            step: 0.02,
            label: "Sprite α mul",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleOpacityMul = v;
            },
          },
          fieldParticleSoftInner: {
            value: d.fieldParticleSoftInner,
            min: 0,
            max: 0.49,
            step: 0.01,
            label: "Soft inner",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleSoftInner = v;
            },
          },
          fieldParticleSoftOuter: {
            value: d.fieldParticleSoftOuter,
            min: 0.1,
            max: 0.5,
            step: 0.01,
            label: "Soft outer",
            onChange: (v: number) => {
              vibrationDomeTuning.fieldParticleSoftOuter = v;
            },
          },
        }),
        Pipeline: folder({
          fieldParticleDepthWrite: {
            value: d.fieldParticleDepthWrite,
            label: "Depth write",
            onChange: (v: boolean) => {
              vibrationDomeTuning.fieldParticleDepthWrite = v;
            },
          },
          fieldParticleDepthTest: {
            value: d.fieldParticleDepthTest,
            label: "Depth test",
            onChange: (v: boolean) => {
              vibrationDomeTuning.fieldParticleDepthTest = v;
            },
          },
          fieldParticleBlending: {
            value: d.fieldParticleBlending,
            options: ["normal", "additive", "multiply"] as InkVeilSurfaceBlending[],
            label: "Blending",
            onChange: (v: InkVeilSurfaceBlending) => {
              vibrationDomeTuning.fieldParticleBlending = v;
            },
          },
        }),
      }),
      Debug: folder({
        showWireframe: {
          value: d.showWireframe,
          label: "Red edge wire",
          onChange: (v: boolean) => {
            vibrationDomeTuning.showWireframe = v;
          },
        },
      }),
      Renderer: folder({
        transmissionResolutionScale: {
          value: d.transmissionResolutionScale,
          min: 0.25,
          max: 1,
          step: 0.05,
          label: "Transmission RT scale",
          onChange: (v: number) => {
            vibrationDomeTuning.transmissionResolutionScale = v;
          },
        },
      }),
      Wobble: folder({
        wobbleEnabled: {
          value: d.wobbleEnabled,
          label: "Enabled",
          onChange: (v: boolean) => {
            vibrationDomeTuning.wobbleEnabled = v;
          },
        },
        wobbleAmp: {
          value: d.wobbleAmp,
          min: 0,
          max: 0.55,
          step: 0.005,
          label: "Amplitude",
          onChange: (v: number) => {
            vibrationDomeTuning.wobbleAmp = v;
          },
        },
        wobbleFreq: {
          value: d.wobbleFreq,
          min: 0.5,
          max: 12,
          step: 0.1,
          label: "Frequency",
          onChange: (v: number) => {
            vibrationDomeTuning.wobbleFreq = v;
          },
        },
        wobbleRadial: {
          value: d.wobbleRadial,
          min: 0.5,
          max: 14,
          step: 0.25,
          label: "Radial waves",
          onChange: (v: number) => {
            vibrationDomeTuning.wobbleRadial = v;
          },
        },
        wobbleTimeScale: {
          value: d.wobbleTimeScale,
          min: 0,
          max: 4,
          step: 0.05,
          label: "Time scale",
          onChange: (v: number) => {
            vibrationDomeTuning.wobbleTimeScale = v;
          },
        },
      }),
  };
}

function VibrationDomeLevaPanel({ onRemount }: { onRemount: () => void }) {
  useControls(
    "Vibration Zone dome",
    () => vibrationDomeLevaSchema(onRemount),
    [onRemount],
  );
  return null;
}

export function VibrationDomeLevaRoot() {
  const [panelKey, bumpPanel] = useReducer((k: number) => k + 1, 0);
  return (
    <>
      <Leva
        collapsed={false}
        titleBar={{ drag: true, filter: false }}
        hideCopyButton
        theme={{
          sizes: {
            rootWidth: "320px",
          },
        }}
      />
      <VibrationDomeLevaPanel key={panelKey} onRemount={bumpPanel} />
    </>
  );
}
