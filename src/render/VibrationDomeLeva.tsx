import { button, folder, Leva, useControls } from "leva";
import { useReducer } from "react";
import {
  copyVibrationDomeTuningToClipboard,
  DEFAULT_VIBRATION_DOME_TUNING,
  resetVibrationDomeTuning,
  vibrationDomeTuning,
  type VibrationDomeSide,
} from "./vibration-dome-tuning.js";

function VibrationDomeLevaPanel({ onRemount }: { onRemount: () => void }) {
  const d = DEFAULT_VIBRATION_DOME_TUNING;

  useControls(
    "Vibration Zone dome",
    () => ({
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
    }),
    [],
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
            rootWidth: "300px",
          },
        }}
      />
      <VibrationDomeLevaPanel key={panelKey} onRemount={bumpPanel} />
    </>
  );
}
