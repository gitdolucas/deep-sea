import { button, folder, Leva, useControls } from "leva";
import { useReducer } from "react";
import {
  bubbleAttackFxTuning,
  bumpBubbleAttackFxGeometryRev,
  copyBubbleAttackFxTuningToClipboard,
  DEFAULT_BUBBLE_ATTACK_FX_TUNING,
  resetBubbleAttackFxTuning,
} from "./bubble-attack-fx-tuning.js";
import { bubbleColumnLevaFolders } from "./bubble-column-fx-leva.js";

const d = DEFAULT_BUBBLE_ATTACK_FX_TUNING;

/** Control tree for Leva — reused by `VisualShowcaseLeva` master panel. */
export function bubbleAttackFxLevaSchema(onRemount: () => void) {
  return {
      General: folder({
        "Rebuild cluster geometry": button(() => {
          bumpBubbleAttackFxGeometryRev();
        }),
        Reset: button(() => {
          resetBubbleAttackFxTuning();
          bumpBubbleAttackFxGeometryRev();
          onRemount();
        }),
        "Copy all (JSON)": button(() => {
          void copyBubbleAttackFxTuningToClipboard().then((ok) => {
            if (ok) console.info("[Bubble FX] Copied tuning JSON to clipboard.");
            else console.warn("[Bubble FX] Could not copy to clipboard.");
          });
        }),
      }),
      "Cluster shape": folder({
        clusterCount: {
          value: d.clusterCount,
          min: 4,
          max: 128,
          step: 1,
          onChange: (v: number) => {
            bubbleAttackFxTuning.clusterCount = Math.round(v);
            bumpBubbleAttackFxGeometryRev();
          },
        },
        dropR: {
          value: d.dropR,
          min: 0.04,
          max: 0.35,
          step: 0.005,
          onChange: (v: number) => {
            bubbleAttackFxTuning.dropR = v;
            bumpBubbleAttackFxGeometryRev();
          },
        },
        dropTail: {
          value: d.dropTail,
          min: 0.05,
          max: 0.45,
          step: 0.005,
          onChange: (v: number) => {
            bubbleAttackFxTuning.dropTail = v;
            bumpBubbleAttackFxGeometryRev();
          },
        },
        dropYHalf: {
          value: d.dropYHalf,
          min: 0.01,
          max: 0.12,
          step: 0.002,
          onChange: (v: number) => {
            bubbleAttackFxTuning.dropYHalf = v;
            bumpBubbleAttackFxGeometryRev();
          },
        },
        headBiasExponent: {
          value: d.headBiasExponent,
          min: 0.15,
          max: 1.2,
          step: 0.01,
          label: "Head bias (lower=denser front)",
          onChange: (v: number) => {
            bubbleAttackFxTuning.headBiasExponent = v;
            bumpBubbleAttackFxGeometryRev();
          },
        },
      }),
      Motion: folder({
        bobBase: {
          value: d.bobBase,
          min: 0.2,
          max: 0.8,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.bobBase = v;
          },
        },
        bobAmp: {
          value: d.bobAmp,
          min: 0,
          max: 0.15,
          step: 0.002,
          onChange: (v: number) => {
            bubbleAttackFxTuning.bobAmp = v;
          },
        },
        bobTimeScale: {
          value: d.bobTimeScale,
          min: 0,
          max: 24,
          step: 0.25,
          onChange: (v: number) => {
            bubbleAttackFxTuning.bobTimeScale = v;
          },
        },
        bobIndexSpread: {
          value: d.bobIndexSpread,
          min: 0,
          max: 3,
          step: 0.05,
          onChange: (v: number) => {
            bubbleAttackFxTuning.bobIndexSpread = v;
          },
        },
        bobTravelPhase: {
          value: d.bobTravelPhase,
          min: 0,
          max: 12,
          step: 0.1,
          onChange: (v: number) => {
            bubbleAttackFxTuning.bobTravelPhase = v;
          },
        },
        scaleSplashMul: {
          value: d.scaleSplashMul,
          min: 1,
          max: 1.6,
          step: 0.01,
          label: "L3 scale mul",
          onChange: (v: number) => {
            bubbleAttackFxTuning.scaleSplashMul = v;
          },
        },
        scalePulseAmp: {
          value: d.scalePulseAmp,
          min: 0,
          max: 0.25,
          step: 0.005,
          onChange: (v: number) => {
            bubbleAttackFxTuning.scalePulseAmp = v;
          },
        },
        scalePulseTime: {
          value: d.scalePulseTime,
          min: 0,
          max: 28,
          step: 0.25,
          onChange: (v: number) => {
            bubbleAttackFxTuning.scalePulseTime = v;
          },
        },
        scaleTravelPhase: {
          value: d.scaleTravelPhase,
          min: 0,
          max: 14,
          step: 0.1,
          onChange: (v: number) => {
            bubbleAttackFxTuning.scaleTravelPhase = v;
          },
        },
      }),
      Material: folder({
        renderOrder: {
          value: d.renderOrder,
          min: -2,
          max: 10,
          step: 1,
          onChange: (v: number) => {
            bubbleAttackFxTuning.renderOrder = Math.round(v);
          },
        },
        depthWrite: {
          value: d.depthWrite,
          onChange: (v: boolean) => {
            bubbleAttackFxTuning.depthWrite = v;
          },
        },
        blending: {
          value: d.blending,
          options: ["normal", "additive"] as const,
          onChange: (v: "normal" | "additive") => {
            bubbleAttackFxTuning.blending = v;
          },
        },
      }),
      "Point wobble & size": folder({
        wobbleAmp: {
          value: d.wobbleAmp,
          min: 0,
          max: 0.06,
          step: 0.0005,
          onChange: (v: number) => {
            bubbleAttackFxTuning.wobbleAmp = v;
          },
        },
        wobbleFreqX: {
          value: d.wobbleFreqX,
          min: 0,
          max: 24,
          step: 0.25,
          onChange: (v: number) => {
            bubbleAttackFxTuning.wobbleFreqX = v;
          },
        },
        wobbleFreqY: {
          value: d.wobbleFreqY,
          min: 0,
          max: 24,
          step: 0.25,
          onChange: (v: number) => {
            bubbleAttackFxTuning.wobbleFreqY = v;
          },
        },
        wobbleFreqZ: {
          value: d.wobbleFreqZ,
          min: 0,
          max: 24,
          step: 0.25,
          onChange: (v: number) => {
            bubbleAttackFxTuning.wobbleFreqZ = v;
          },
        },
        wobbleAmpYMul: {
          value: d.wobbleAmpYMul,
          min: 0,
          max: 1.5,
          step: 0.02,
          onChange: (v: number) => {
            bubbleAttackFxTuning.wobbleAmpYMul = v;
          },
        },
        wobbleAmpZMul: {
          value: d.wobbleAmpZMul,
          min: 0,
          max: 1.5,
          step: 0.02,
          onChange: (v: number) => {
            bubbleAttackFxTuning.wobbleAmpZMul = v;
          },
        },
        pointSizeMul: {
          value: d.pointSizeMul,
          min: 4,
          max: 64,
          step: 0.5,
          onChange: (v: number) => {
            bubbleAttackFxTuning.pointSizeMul = v;
          },
        },
        pointSizeBase: {
          value: d.pointSizeBase,
          min: 0.2,
          max: 1.4,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.pointSizeBase = v;
          },
        },
        pointSizePhaseMul: {
          value: d.pointSizePhaseMul,
          min: 0,
          max: 1.2,
          step: 0.02,
          onChange: (v: number) => {
            bubbleAttackFxTuning.pointSizePhaseMul = v;
          },
        },
        pointSizeCamDiv: {
          value: d.pointSizeCamDiv,
          min: 50,
          max: 600,
          step: 5,
          onChange: (v: number) => {
            bubbleAttackFxTuning.pointSizeCamDiv = v;
          },
        },
        pointSizeZMin: {
          value: d.pointSizeZMin,
          min: 0.05,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.pointSizeZMin = v;
          },
        },
        pointSizeClampMin: {
          value: d.pointSizeClampMin,
          min: 1,
          max: 32,
          step: 0.5,
          onChange: (v: number) => {
            bubbleAttackFxTuning.pointSizeClampMin = v;
          },
        },
        pointSizeClampMax: {
          value: d.pointSizeClampMax,
          min: 32,
          max: 400,
          step: 2,
          onChange: (v: number) => {
            bubbleAttackFxTuning.pointSizeClampMax = v;
          },
        },
      }),
      "Bubble colors": folder({
        colorCore: {
          value: d.colorCore,
          onChange: (v: string) => {
            bubbleAttackFxTuning.colorCore = v;
          },
        },
        colorRim: {
          value: d.colorRim,
          onChange: (v: string) => {
            bubbleAttackFxTuning.colorRim = v;
          },
        },
        colorCoreL3: {
          value: d.colorCoreL3,
          label: "L3 core",
          onChange: (v: string) => {
            bubbleAttackFxTuning.colorCoreL3 = v;
          },
        },
        colorRimL3: {
          value: d.colorRimL3,
          label: "L3 rim",
          onChange: (v: string) => {
            bubbleAttackFxTuning.colorRimL3 = v;
          },
        },
      }),
      "Fragment look": folder({
        coreSmoothOuter: {
          value: d.coreSmoothOuter,
          min: 0.5,
          max: 1.5,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.coreSmoothOuter = v;
          },
        },
        coreSmoothInner: {
          value: d.coreSmoothInner,
          min: 0.05,
          max: 0.95,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.coreSmoothInner = v;
          },
        },
        rimInner0: {
          value: d.rimInner0,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.rimInner0 = v;
          },
        },
        rimInner1: {
          value: d.rimInner1,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.rimInner1 = v;
          },
        },
        rimOuter0: {
          value: d.rimOuter0,
          min: 0.8,
          max: 1.2,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.rimOuter0 = v;
          },
        },
        rimOuter1: {
          value: d.rimOuter1,
          min: 0.6,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.rimOuter1 = v;
          },
        },
        rimColorMix: {
          value: d.rimColorMix,
          min: 0,
          max: 2.5,
          step: 0.05,
          onChange: (v: number) => {
            bubbleAttackFxTuning.rimColorMix = v;
          },
        },
        alphaCore: {
          value: d.alphaCore,
          min: 0,
          max: 1,
          step: 0.02,
          onChange: (v: number) => {
            bubbleAttackFxTuning.alphaCore = v;
          },
        },
        alphaRim: {
          value: d.alphaRim,
          min: 0,
          max: 1.5,
          step: 0.02,
          onChange: (v: number) => {
            bubbleAttackFxTuning.alphaRim = v;
          },
        },
        alphaBodyMin: {
          value: d.alphaBodyMin,
          min: 0,
          max: 1,
          step: 0.02,
          onChange: (v: number) => {
            bubbleAttackFxTuning.alphaBodyMin = v;
          },
        },
        alphaCoreBoost: {
          value: d.alphaCoreBoost,
          min: 0,
          max: 1,
          step: 0.02,
          onChange: (v: number) => {
            bubbleAttackFxTuning.alphaCoreBoost = v;
          },
        },
        alphaMax: {
          value: d.alphaMax,
          min: 0.2,
          max: 1,
          step: 0.02,
          onChange: (v: number) => {
            bubbleAttackFxTuning.alphaMax = v;
          },
        },
        twinkleBase: {
          value: d.twinkleBase,
          min: 0.5,
          max: 1.2,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.twinkleBase = v;
          },
        },
        twinkleAmp: {
          value: d.twinkleAmp,
          min: 0,
          max: 0.35,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.twinkleAmp = v;
          },
        },
        twinklePhaseMul: {
          value: d.twinklePhaseMul,
          min: 0,
          max: 80,
          step: 0.5,
          onChange: (v: number) => {
            bubbleAttackFxTuning.twinklePhaseMul = v;
          },
        },
        twinkleD: {
          value: d.twinkleD,
          min: 0,
          max: 20,
          step: 0.25,
          onChange: (v: number) => {
            bubbleAttackFxTuning.twinkleD = v;
          },
        },
      }),
      "Pop rings": folder({
        popDuration: {
          value: d.popDuration,
          min: 0.05,
          max: 0.8,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.popDuration = v;
          },
        },
        popDurationSplash: {
          value: d.popDurationSplash,
          min: 0.05,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.popDurationSplash = v;
          },
        },
        ringInner: {
          value: d.ringInner,
          min: 0.01,
          max: 0.2,
          step: 0.005,
          onChange: (v: number) => {
            bubbleAttackFxTuning.ringInner = v;
          },
        },
        ringOuter: {
          value: d.ringOuter,
          min: 0.1,
          max: 0.8,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.ringOuter = v;
          },
        },
        ringInnerSplash: {
          value: d.ringInnerSplash,
          min: 0.02,
          max: 0.25,
          step: 0.005,
          onChange: (v: number) => {
            bubbleAttackFxTuning.ringInnerSplash = v;
          },
        },
        ringOuterSplash: {
          value: d.ringOuterSplash,
          min: 0.15,
          max: 1,
          step: 0.01,
          onChange: (v: number) => {
            bubbleAttackFxTuning.ringOuterSplash = v;
          },
        },
        ringColor: {
          value: d.ringColor,
          onChange: (v: string) => {
            bubbleAttackFxTuning.ringColor = v;
          },
        },
        ringColorSplash: {
          value: d.ringColorSplash,
          onChange: (v: string) => {
            bubbleAttackFxTuning.ringColorSplash = v;
          },
        },
        ringOpacity: {
          value: d.ringOpacity,
          min: 0.1,
          max: 1,
          step: 0.02,
          onChange: (v: number) => {
            bubbleAttackFxTuning.ringOpacity = v;
          },
        },
        ringScaleGrowth: {
          value: d.ringScaleGrowth,
          min: 0.5,
          max: 4,
          step: 0.05,
          onChange: (v: number) => {
            bubbleAttackFxTuning.ringScaleGrowth = v;
          },
        },
        ringSegments: {
          value: d.ringSegments,
          min: 8,
          max: 64,
          step: 1,
          onChange: (v: number) => {
            bubbleAttackFxTuning.ringSegments = Math.round(v);
          },
        },
      }),
      ...bubbleColumnLevaFolders(),
  };
}

function BubbleAttackFxLevaPanel({ onRemount }: { onRemount: () => void }) {
  useControls(
    "Bubble Shotgun FX",
    () => bubbleAttackFxLevaSchema(onRemount),
    [onRemount],
  );
  return null;
}

export function BubbleAttackFxLevaRoot() {
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
      <BubbleAttackFxLevaPanel key={panelKey} onRemount={bumpPanel} />
    </>
  );
}
