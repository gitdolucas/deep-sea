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
      min: 0.2,
      max: 2.5,
      step: 0.05,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].particleCountMul = v;
      },
    },
    lengthMul: {
      value: d.lengthMul,
      min: 0.3,
      max: 2,
      step: 0.05,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].lengthMul = v;
      },
    },
    radiusMul: {
      value: d.radiusMul,
      min: 0.3,
      max: 2.2,
      step: 0.05,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].radiusMul = v;
      },
    },
    durationMul: {
      value: d.durationMul,
      min: 0.25,
      max: 2.5,
      step: 0.05,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].durationMul = v;
      },
    },
    baseY: {
      value: d.baseY,
      min: 0.15,
      max: 0.85,
      step: 0.01,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].baseY = v;
      },
    },
    wobble: {
      value: d.wobble,
      min: 0,
      max: 0.12,
      step: 0.001,
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].wobble = v;
      },
    },
    worldRiseMax: {
      value: d.worldRiseMax,
      min: 0,
      max: 1.8,
      step: 0.02,
      label: "World rise (max Y)",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].worldRiseMax = v;
      },
    },
    risePow: {
      value: d.risePow,
      min: 0.4,
      max: 3,
      step: 0.05,
      label: "Rise curve (pow)",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].risePow = v;
      },
    },
    releaseLag: {
      value: d.releaseLag,
      min: 0,
      max: 0.95,
      step: 0.02,
      label: "Release stagger",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].releaseLag = v;
      },
    },
    columnNoiseFreq: {
      value: d.columnNoiseFreq,
      min: 0,
      max: 12,
      step: 0.1,
      label: "Column noise freq",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].columnNoiseFreq = v;
      },
    },
    columnNoiseAmp: {
      value: d.columnNoiseAmp,
      min: 0,
      max: 0.35,
      step: 0.005,
      label: "Column noise amp",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].columnNoiseAmp = v;
      },
    },
    releaseNoiseFreq: {
      value: d.releaseNoiseFreq,
      min: 0,
      max: 24,
      step: 0.25,
      label: "Release noise freq",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].releaseNoiseFreq = v;
      },
    },
    releaseNoiseAmp: {
      value: d.releaseNoiseAmp,
      min: 0,
      max: 0.45,
      step: 0.005,
      label: "Release noise amp",
      onChange: (v: number) => {
        bubbleColumnFxTuning[key].releaseNoiseAmp = v;
      },
    },
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
      min: -2,
      max: 12,
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
