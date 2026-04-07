import { button, folder, Leva, useControls } from "leva";
import { useReducer } from "react";
import {
  copyInkVeilTuningToClipboard,
  DEFAULT_INK_VEIL_TUNING,
  inkVeilTuning,
  resetInkVeilTuning,
  type InkVeilSurfaceBlending,
} from "./ink-veil-tuning.js";

/** Leva control tree — reused by {@link VisualShowcaseLeva}. */
export function inkVeilLevaSchema(onRemount: () => void) {
  const d = DEFAULT_INK_VEIL_TUNING;

  return {
    General: folder({
      applyOverrides: {
        value: d.applyOverrides,
        label: "Apply overrides",
        onChange: (v: boolean) => {
          inkVeilTuning.applyOverrides = v;
        },
      },
      Reset: button(() => {
        resetInkVeilTuning();
        onRemount();
      }),
      "Copy all (JSON)": button(() => {
        void copyInkVeilTuningToClipboard().then((ok) => {
          if (ok) console.info("[Ink Veil] Copied tuning JSON to clipboard.");
          else console.warn("[Ink Veil] Could not copy to clipboard.");
        });
      }),
    }),
    Placement: folder({
      floorYOffset: {
        value: d.floorYOffset,
        min: -1.2,
        max: 0.8,
        step: 0.01,
        onChange: (v: number) => {
          inkVeilTuning.floorYOffset = v;
        },
      },
      diskYOffset: {
        value: d.diskYOffset,
        min: 0,
        max: 0.08,
        step: 0.001,
        label: "Disk lift (Z-fight)",
        onChange: (v: number) => {
          inkVeilTuning.diskYOffset = v;
        },
      },
    }),
    Geometry: folder({
      diskSegments: {
        value: d.diskSegments,
        min: 8,
        max: 128,
        step: 1,
        onChange: (v: number) => {
          inkVeilTuning.diskSegments = Math.round(v);
        },
      },
      domeWidthSegments: {
        value: d.domeWidthSegments,
        min: 8,
        max: 96,
        step: 1,
        onChange: (v: number) => {
          inkVeilTuning.domeWidthSegments = Math.round(v);
        },
      },
      domeHeightSegments: {
        value: d.domeHeightSegments,
        min: 6,
        max: 64,
        step: 1,
        onChange: (v: number) => {
          inkVeilTuning.domeHeightSegments = Math.round(v);
        },
      },
    }),
    "Render order": folder({
      renderOrderSurface: {
        value: d.renderOrderSurface,
        min: -2,
        max: 12,
        step: 1,
        label: "Disk + dome",
        onChange: (v: number) => {
          inkVeilTuning.renderOrderSurface = Math.round(v);
        },
      },
      renderOrderParticles: {
        value: d.renderOrderParticles,
        min: -2,
        max: 12,
        step: 1,
        label: "Particles",
        onChange: (v: number) => {
          inkVeilTuning.renderOrderParticles = Math.round(v);
        },
      },
    }),
    Colors: folder({
      inkCoreColor: {
        value: d.inkCoreColor,
        label: "Ink core",
        onChange: (v: string) => {
          inkVeilTuning.inkCoreColor = v;
        },
      },
      inkRimColor: {
        value: d.inkRimColor,
        label: "Ink rim",
        onChange: (v: string) => {
          inkVeilTuning.inkRimColor = v;
        },
      },
    }),
    "Per-level": folder({
      swirlL1: {
        value: d.swirlSpeed[0],
        min: 0,
        max: 3,
        step: 0.02,
        label: "Swirl L1",
        onChange: (v: number) => {
          (inkVeilTuning.swirlSpeed as number[])[0] = v;
        },
      },
      swirlL2: {
        value: d.swirlSpeed[1],
        min: 0,
        max: 3,
        step: 0.02,
        label: "Swirl L2",
        onChange: (v: number) => {
          (inkVeilTuning.swirlSpeed as number[])[1] = v;
        },
      },
      swirlL3: {
        value: d.swirlSpeed[2],
        min: 0,
        max: 3,
        step: 0.02,
        label: "Swirl L3",
        onChange: (v: number) => {
          (inkVeilTuning.swirlSpeed as number[])[2] = v;
        },
      },
      opacityMulL1: {
        value: d.opacityMul[0],
        min: 0.2,
        max: 2,
        step: 0.02,
        label: "Opacity L1",
        onChange: (v: number) => {
          (inkVeilTuning.opacityMul as number[])[0] = v;
        },
      },
      opacityMulL2: {
        value: d.opacityMul[1],
        min: 0.2,
        max: 2,
        step: 0.02,
        label: "Opacity L2",
        onChange: (v: number) => {
          (inkVeilTuning.opacityMul as number[])[1] = v;
        },
      },
      opacityMulL3: {
        value: d.opacityMul[2],
        min: 0.2,
        max: 2,
        step: 0.02,
        label: "Opacity L3",
        onChange: (v: number) => {
          (inkVeilTuning.opacityMul as number[])[2] = v;
        },
      },
      ringHintL1: {
        value: d.ringHint[0],
        min: 0,
        max: 1.5,
        step: 0.02,
        label: "Ring L1",
        onChange: (v: number) => {
          (inkVeilTuning.ringHint as number[])[0] = v;
        },
      },
      ringHintL2: {
        value: d.ringHint[1],
        min: 0,
        max: 1.5,
        step: 0.02,
        label: "Ring L2",
        onChange: (v: number) => {
          (inkVeilTuning.ringHint as number[])[1] = v;
        },
      },
      ringHintL3: {
        value: d.ringHint[2],
        min: 0,
        max: 1.5,
        step: 0.02,
        label: "Ring L3",
        onChange: (v: number) => {
          (inkVeilTuning.ringHint as number[])[2] = v;
        },
      },
      noiseScaleBase: {
        value: d.noiseScaleBase,
        min: 0.3,
        max: 3,
        step: 0.02,
        onChange: (v: number) => {
          inkVeilTuning.noiseScaleBase = v;
        },
      },
      noiseScalePerLevel: {
        value: d.noiseScalePerLevel,
        min: 0,
        max: 0.5,
        step: 0.01,
        onChange: (v: number) => {
          inkVeilTuning.noiseScalePerLevel = v;
        },
      },
      edgeSoftnessBase: {
        value: d.edgeSoftnessBase,
        min: 0.01,
        max: 0.35,
        step: 0.005,
        onChange: (v: number) => {
          inkVeilTuning.edgeSoftnessBase = v;
        },
      },
      edgeSoftnessPerLevel: {
        value: d.edgeSoftnessPerLevel,
        min: 0,
        max: 0.1,
        step: 0.005,
        onChange: (v: number) => {
          inkVeilTuning.edgeSoftnessPerLevel = v;
        },
      },
    }),
    Wobble: folder({
      wobbleEnabled: {
        value: d.wobbleEnabled,
        label: "Enabled",
        onChange: (v: boolean) => {
          inkVeilTuning.wobbleEnabled = v;
        },
      },
      wobbleAmp: {
        value: d.wobbleAmp,
        min: 0,
        max: 1.2,
        step: 0.01,
        label: "Amplitude",
        onChange: (v: number) => {
          inkVeilTuning.wobbleAmp = v;
        },
      },
      wobbleFreq: {
        value: d.wobbleFreq,
        min: 0.5,
        max: 12,
        step: 0.05,
        label: "Frequency",
        onChange: (v: number) => {
          inkVeilTuning.wobbleFreq = v;
        },
      },
      wobbleRadial: {
        value: d.wobbleRadial,
        min: 0.5,
        max: 22,
        step: 0.25,
        label: "Radial waves",
        onChange: (v: number) => {
          inkVeilTuning.wobbleRadial = v;
        },
      },
      wobbleTimeScale: {
        value: d.wobbleTimeScale,
        min: 0,
        max: 4,
        step: 0.05,
        label: "Time scale",
        onChange: (v: number) => {
          inkVeilTuning.wobbleTimeScale = v;
        },
      },
    }),
    Shader: folder({
      fresnelPow: {
        value: d.fresnelPow,
        min: 0.5,
        max: 8,
        step: 0.05,
        label: "Fresnel pow",
        onChange: (v: number) => {
          inkVeilTuning.fresnelPow = v;
        },
      },
      noiseTimeScale: {
        value: d.noiseTimeScale,
        min: 0,
        max: 4,
        step: 0.05,
        label: "Noise time scale",
        onChange: (v: number) => {
          inkVeilTuning.noiseTimeScale = v;
        },
      },
      fbmStrength: {
        value: d.fbmStrength,
        min: 0,
        max: 5,
        step: 0.05,
        onChange: (v: number) => {
          inkVeilTuning.fbmStrength = v;
        },
      },
      swirlTierBase: {
        value: d.swirlTierBase,
        min: 0.2,
        max: 1.5,
        step: 0.01,
        label: "Swirl tier base",
        onChange: (v: number) => {
          inkVeilTuning.swirlTierBase = v;
        },
      },
      swirlTierPerLevel: {
        value: d.swirlTierPerLevel,
        min: 0,
        max: 0.3,
        step: 0.005,
        label: "Swirl tier / level",
        onChange: (v: number) => {
          inkVeilTuning.swirlTierPerLevel = v;
        },
      },
      streakAngFreq: {
        value: d.streakAngFreq,
        min: 1,
        max: 40,
        step: 0.5,
        label: "Streak angular freq",
        onChange: (v: number) => {
          inkVeilTuning.streakAngFreq = v;
        },
      },
      streakRadialFreq: {
        value: d.streakRadialFreq,
        min: 1,
        max: 40,
        step: 0.5,
        label: "Streak radial freq",
        onChange: (v: number) => {
          inkVeilTuning.streakRadialFreq = v;
        },
      },
      streakTimeScale: {
        value: d.streakTimeScale,
        min: 0,
        max: 8,
        step: 0.1,
        label: "Streak time scale",
        onChange: (v: number) => {
          inkVeilTuning.streakTimeScale = v;
        },
      },
      alphaGlobal: {
        value: d.alphaGlobal,
        min: 0.2,
        max: 2,
        step: 0.02,
        label: "Alpha global",
        onChange: (v: number) => {
          inkVeilTuning.alphaGlobal = v;
        },
      },
    }),
    Particles: folder({
      Count: folder({
        particleCountL1: {
          value: d.particleCount[0],
          min: 0,
          max: 400,
          step: 1,
          label: "L1",
          onChange: (v: number) => {
            (inkVeilTuning.particleCount as number[])[0] = Math.round(v);
          },
        },
        particleCountL2: {
          value: d.particleCount[1],
          min: 0,
          max: 400,
          step: 1,
          label: "L2",
          onChange: (v: number) => {
            (inkVeilTuning.particleCount as number[])[1] = Math.round(v);
          },
        },
        particleCountL3: {
          value: d.particleCount[2],
          min: 0,
          max: 400,
          step: 1,
          label: "L3",
          onChange: (v: number) => {
            (inkVeilTuning.particleCount as number[])[2] = Math.round(v);
          },
        },
      }),
      Spawn: folder({
        particleSpawnRMin: {
          value: d.particleSpawnRMin,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Ring r min",
          onChange: (v: number) => {
            inkVeilTuning.particleSpawnRMin = v;
          },
        },
        particleSpawnRRange: {
          value: d.particleSpawnRRange,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Ring r range",
          onChange: (v: number) => {
            inkVeilTuning.particleSpawnRRange = v;
          },
        },
      }),
      Motion: folder({
        particleTimeLo: {
          value: d.particleTimeLo,
          min: 0,
          max: 2,
          step: 0.02,
          label: "Time phase lo",
          onChange: (v: number) => {
            inkVeilTuning.particleTimeLo = v;
          },
        },
        particleTimeRange: {
          value: d.particleTimeRange,
          min: 0,
          max: 2,
          step: 0.02,
          label: "Time phase range",
          onChange: (v: number) => {
            inkVeilTuning.particleTimeRange = v;
          },
        },
        particleOrbitSpeed: {
          value: d.particleOrbitSpeed,
          min: 0,
          max: 6,
          step: 0.05,
          label: "Orbit speed",
          onChange: (v: number) => {
            inkVeilTuning.particleOrbitSpeed = v;
          },
        },
        particleRadialTightness: {
          value: d.particleRadialTightness,
          min: 0.2,
          max: 1.2,
          step: 0.01,
          label: "Radial tight",
          onChange: (v: number) => {
            inkVeilTuning.particleRadialTightness = v;
          },
        },
        particleWobbleFreq: {
          value: d.particleWobbleFreq,
          min: 0,
          max: 8,
          step: 0.05,
          label: "Wobble freq",
          onChange: (v: number) => {
            inkVeilTuning.particleWobbleFreq = v;
          },
        },
        particleWobblePhaseMul: {
          value: d.particleWobblePhaseMul,
          min: 0,
          max: 24,
          step: 0.25,
          label: "Wobble phase spread",
          onChange: (v: number) => {
            inkVeilTuning.particleWobblePhaseMul = v;
          },
        },
        particleWobbleStr: {
          value: d.particleWobbleStr,
          min: 0,
          max: 0.35,
          step: 0.005,
          label: "Wobble str (× radius)",
          onChange: (v: number) => {
            inkVeilTuning.particleWobbleStr = v;
          },
        },
        particleLiftRate: {
          value: d.particleLiftRate,
          min: 0,
          max: 4,
          step: 0.05,
          label: "Lift bob rate",
          onChange: (v: number) => {
            inkVeilTuning.particleLiftRate = v;
          },
        },
        particleLiftAmp: {
          value: d.particleLiftAmp,
          min: 0,
          max: 1.5,
          step: 0.02,
          label: "Lift height",
          onChange: (v: number) => {
            inkVeilTuning.particleLiftAmp = v;
          },
        },
        particleWobbleAlongOrbit: {
          value: d.particleWobbleAlongOrbit,
          min: 0,
          max: 2,
          step: 0.05,
          label: "Wobble on Z",
          onChange: (v: number) => {
            inkVeilTuning.particleWobbleAlongOrbit = v;
          },
        },
      }),
      "Size (px)": folder({
        particlePointSizeMul: {
          value: d.particlePointSizeMul,
          min: 0.05,
          max: 4,
          step: 0.02,
          label: "Global mul",
          onChange: (v: number) => {
            inkVeilTuning.particlePointSizeMul = v;
          },
        },
        particlePxBase: {
          value: d.particlePxBase,
          min: 0,
          max: 120,
          step: 1,
          label: "Base px",
          onChange: (v: number) => {
            inkVeilTuning.particlePxBase = v;
          },
        },
        particlePxSpread: {
          value: d.particlePxSpread,
          min: 0,
          max: 80,
          step: 1,
          label: "Random px",
          onChange: (v: number) => {
            inkVeilTuning.particlePxSpread = v;
          },
        },
        particlePxDepthScale: {
          value: d.particlePxDepthScale,
          min: 20,
          max: 400,
          step: 5,
          label: "Depth scale",
          onChange: (v: number) => {
            inkVeilTuning.particlePxDepthScale = v;
          },
        },
        particlePxDepthRef: {
          value: d.particlePxDepthRef,
          min: 0.05,
          max: 2,
          step: 0.02,
          label: "Depth ref (clamp)",
          onChange: (v: number) => {
            inkVeilTuning.particlePxDepthRef = v;
          },
        },
        particlePxMin: {
          value: d.particlePxMin,
          min: 0.5,
          max: 32,
          step: 0.5,
          label: "Clamp min",
          onChange: (v: number) => {
            inkVeilTuning.particlePxMin = v;
          },
        },
        particlePxMax: {
          value: d.particlePxMax,
          min: 4,
          max: 256,
          step: 1,
          label: "Clamp max",
          onChange: (v: number) => {
            inkVeilTuning.particlePxMax = v;
          },
        },
      }),
      Look: folder({
        particleColor: {
          value: d.particleColor,
          label: "Tint",
          onChange: (v: string) => {
            inkVeilTuning.particleColor = v;
          },
        },
        particleAlphaLo: {
          value: d.particleAlphaLo,
          min: 0,
          max: 1,
          step: 0.02,
          label: "Per-point α lo",
          onChange: (v: number) => {
            inkVeilTuning.particleAlphaLo = v;
          },
        },
        particleAlphaRange: {
          value: d.particleAlphaRange,
          min: 0,
          max: 1,
          step: 0.02,
          label: "Per-point α range",
          onChange: (v: number) => {
            inkVeilTuning.particleAlphaRange = v;
          },
        },
        particleSoftInner: {
          value: d.particleSoftInner,
          min: 0,
          max: 0.49,
          step: 0.01,
          label: "Soft inner (UV)",
          onChange: (v: number) => {
            inkVeilTuning.particleSoftInner = v;
          },
        },
        particleSoftOuter: {
          value: d.particleSoftOuter,
          min: 0.1,
          max: 0.5,
          step: 0.01,
          label: "Soft outer (UV)",
          onChange: (v: number) => {
            inkVeilTuning.particleSoftOuter = v;
          },
        },
        particleOpacityMul: {
          value: d.particleOpacityMul,
          min: 0,
          max: 2,
          step: 0.02,
          label: "Sprite α mul",
          onChange: (v: number) => {
            inkVeilTuning.particleOpacityMul = v;
          },
        },
      }),
      Pipeline: folder({
        particleDepthWrite: {
          value: d.particleDepthWrite,
          label: "Depth write",
          onChange: (v: boolean) => {
            inkVeilTuning.particleDepthWrite = v;
          },
        },
        particleDepthTest: {
          value: d.particleDepthTest,
          label: "Depth test",
          onChange: (v: boolean) => {
            inkVeilTuning.particleDepthTest = v;
          },
        },
        particleBlending: {
          value: d.particleBlending,
          options: ["normal", "additive", "multiply"] as InkVeilSurfaceBlending[],
          label: "Blending",
          onChange: (v: InkVeilSurfaceBlending) => {
            inkVeilTuning.particleBlending = v;
          },
        },
      }),
    }),
    Surface: folder({
      surfaceDepthWrite: {
        value: d.surfaceDepthWrite,
        label: "Depth write",
        onChange: (v: boolean) => {
          inkVeilTuning.surfaceDepthWrite = v;
        },
      },
      surfaceDepthTest: {
        value: d.surfaceDepthTest,
        label: "Depth test",
        onChange: (v: boolean) => {
          inkVeilTuning.surfaceDepthTest = v;
        },
      },
      surfaceBlending: {
        value: d.surfaceBlending,
        options: ["normal", "additive", "multiply"] as InkVeilSurfaceBlending[],
        label: "Blending",
        onChange: (v: InkVeilSurfaceBlending) => {
          inkVeilTuning.surfaceBlending = v;
        },
      },
    }),
  };
}

function InkVeilLevaPanel({ onRemount }: { onRemount: () => void }) {
  useControls("Ink Veil aura", () => inkVeilLevaSchema(onRemount), [onRemount]);
  return null;
}

export function InkVeilLevaRoot() {
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
      <InkVeilLevaPanel key={panelKey} onRemount={bumpPanel} />
    </>
  );
}
