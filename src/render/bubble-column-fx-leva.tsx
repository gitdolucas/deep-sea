import { button, folder } from "leva";
import {
  bubbleColumnFxTuning,
  copyBubbleColumnFxTuningToClipboard,
  DEFAULT_BUBBLE_COLUMN_FX_TUNING,
  resetBubbleColumnFxTuning,
  type BubbleColumnPresetTuning,
} from "./bubble-column-fx-tuning.js";

const cd = DEFAULT_BUBBLE_COLUMN_FX_TUNING;

function presetFolder(
  key: "muzzle" | "impact" | "impactSplash",
  d: BubbleColumnPresetTuning,
) {
  return folder({
    particleCountMul: {
      value: d.particleCountMul,
      min: 0.05,
      max: 5,
      step: 0.05,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].particleCountMul = v;
      },
    },
    lengthMul: {
      value: d.lengthMul,
      min: 0.05,
      max: 5,
      step: 0.05,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].lengthMul = v;
      },
    },
    radiusMul: {
      value: d.radiusMul,
      min: 0.05,
      max: 5,
      step: 0.05,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].radiusMul = v;
      },
    },
    durationMul: {
      value: d.durationMul,
      min: 0.05,
      max: 8,
      step: 0.05,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].durationMul = v;
      },
    },
    baseY: {
      value: d.baseY,
      min: 0,
      max: 2,
      step: 0.01,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].baseY = v;
      },
    },
    wobble: {
      value: d.wobble,
      min: 0,
      max: 0.35,
      step: 0.001,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].wobble = v;
      },
    },
    worldRiseMax: {
      value: d.worldRiseMax,
      min: 0,
      max: 4,
      step: 0.02,
      label: "World rise (max Y)",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].worldRiseMax = v;
      },
    },
    risePow: {
      value: d.risePow,
      min: 0.2,
      max: 6,
      step: 0.05,
      label: "Rise curve (pow)",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].risePow = v;
      },
    },
    releaseLag: {
      value: d.releaseLag,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Release stagger",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].releaseLag = v;
      },
    },
    columnNoiseFreq: {
      value: d.columnNoiseFreq,
      min: 0,
      max: 48,
      step: 0.1,
      label: "Column noise freq",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].columnNoiseFreq = v;
      },
    },
    columnNoiseAmp: {
      value: d.columnNoiseAmp,
      min: 0,
      max: 1.5,
      step: 0.005,
      label: "Column noise amp",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].columnNoiseAmp = v;
      },
    },
    releaseNoiseFreq: {
      value: d.releaseNoiseFreq,
      min: 0,
      max: 48,
      step: 0.25,
      label: "Release noise freq",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].releaseNoiseFreq = v;
      },
    },
    releaseNoiseAmp: {
      value: d.releaseNoiseAmp,
      min: 0,
      max: 1.5,
      step: 0.005,
      label: "Release noise amp",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].releaseNoiseAmp = v;
      },
    },
    "Point size (sprites)": folder({
      pointSizeMul: {
        value: d.pointSizeMul,
        min: 0.25,
        max: 96,
        step: 0.25,
        label: "Size mul",
        onChange: (v: number) => {
          bubbleColumnFxTuning[key].pointSizeMul = v;
        },
      },
      pointSizeBase: {
        value: d.pointSizeBase,
        min: 0.02,
        max: 2.5,
        step: 0.01,
        label: "Base (× phase floor)",
        onChange: (v: number) => {
          bubbleColumnFxTuning[key].pointSizeBase = v;
        },
      },
      pointSizePhaseMul: {
        value: d.pointSizePhaseMul,
        min: 0,
        max: 3,
        step: 0.01,
        label: "Phase mix",
        onChange: (v: number) => {
          bubbleColumnFxTuning[key].pointSizePhaseMul = v;
        },
      },
      pointAlongSpread: {
        value: d.pointAlongSpread,
        min: 0,
        max: 1.25,
        step: 0.01,
        label: "Along spread (bottom vs top)",
        onChange: (v: number) => {
          bubbleColumnFxTuning[key].pointAlongSpread = v;
        },
      },
      pointAgeFade: {
        value: d.pointAgeFade,
        min: 0,
        max: 2.5,
        step: 0.02,
        label: "Shrink over lifetime",
        onChange: (v: number) => {
          bubbleColumnFxTuning[key].pointAgeFade = v;
        },
      },
      pointSizeCamDiv: {
        value: d.pointSizeCamDiv,
        min: 20,
        max: 1500,
        step: 5,
        label: "Camera div",
        onChange: (v: number) => {
          bubbleColumnFxTuning[key].pointSizeCamDiv = v;
        },
      },
      pointSizeZMin: {
        value: d.pointSizeZMin,
        min: 0.01,
        max: 3,
        step: 0.01,
        label: "Depth clamp (min Z)",
        onChange: (v: number) => {
          bubbleColumnFxTuning[key].pointSizeZMin = v;
        },
      },
      pointSizeClampMin: {
        value: d.pointSizeClampMin,
        min: 0.05,
        max: 120,
        step: 0.5,
        label: "Clamp min px",
        onChange: (v: number) => {
          bubbleColumnFxTuning[key].pointSizeClampMin = v;
        },
      },
      pointSizeClampMax: {
        value: d.pointSizeClampMax,
        min: 2,
        max: 640,
        step: 1,
        label: "Clamp max px",
        onChange: (v: number) => {
          bubbleColumnFxTuning[key].pointSizeClampMax = v;
        },
      },
    }),
    colorCore: {
      value: d.colorCore,
      onChange: (v: string) => {
        bubbleColumnFxTuning[key].colorCore = v;
      },
    },
    colorRim: {
      value: d.colorRim,
      onChange: (v: string) => {
        bubbleColumnFxTuning[key].colorRim = v;
      },
    },
    renderOrder: {
      value: d.renderOrder,
      min: -8,
      max: 24,
      step: 1,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].renderOrder = Math.round(v);
      },
    },
    depthWrite: {
      value: d.depthWrite,
      onChange: (v: boolean) => {
        bubbleColumnFxTuning[key].depthWrite = v;
      },
    },
    blending: {
      value: d.blending,
      options: ["normal", "additive"] as const,
      onChange: (v: "normal" | "additive") => {
        bubbleColumnFxTuning[key].blending = v;
      },
    },
  });
}

/** Nested folders for Bubble column FX (spread into Bubble Shotgun Leva panel). */
export function bubbleColumnLevaFolders() {
  return {
    "Bubble column": folder({
      General: folder({
        applyOverrides: {
          value: cd.applyOverrides,
          label: "Apply Leva overrides",
          onChange: (v: boolean) => {
            bubbleColumnFxTuning.applyOverrides = v;
          },
        },
        Reset: button(() => {
          resetBubbleColumnFxTuning();
        }),
        "Copy column JSON": button(() => {
          void copyBubbleColumnFxTuningToClipboard().then((ok) => {
            if (ok) {
              console.info("[Bubble column] Copied tuning JSON to clipboard.");
            } else {
              console.warn("[Bubble column] Could not copy to clipboard.");
            }
          });
        }),
      }),
      "Shot (muzzle)": presetFolder("muzzle", cd.muzzle),
      "Hit (impact)": presetFolder("impact", cd.impact),
      "Hit L3 splash": presetFolder("impactSplash", cd.impactSplash),
    }),
  };
}
