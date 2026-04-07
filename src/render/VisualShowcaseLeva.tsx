import { button, folder, Leva, useControls } from "leva";
import { useReducer } from "react";
import {
  bumpBubbleAttackFxGeometryRev,
  resetBubbleAttackFxTuning,
} from "./bubble-attack-fx-tuning.js";
import { bubbleAttackFxLevaSchema } from "./BubbleAttackFxLeva.js";
import { resetBubbleColumnFxTuning } from "./bubble-column-fx-tuning.js";
import { cannonDnaHelixLevaSchema } from "./CannonDnaHelixLeva.js";
import { resetCannonBlastFxTuning } from "../game/cannon-blast-tuning.js";
import { resetCannonHitFxTuning } from "../game/cannon-hit-fx-tuning.js";
import { resetCannonProjectileFxTuning } from "../game/cannon-projectile-fx-tuning.js";
import { resetCannonDnaHelixTuning } from "./cannon-dna-helix-tuning.js";
import { getVisualShowcaseRuntime } from "./visual-showcase-runtime.js";
import {
  getShowcaseFxLoopSeconds,
  resetShowcaseFxLoopSeconds,
  setShowcaseFxLoopSeconds,
} from "./visual-showcase-tuning.js";
import { inkVeilLevaSchema } from "./InkVeilLeva.js";
import { resetInkVeilTuning } from "./ink-veil-tuning.js";
import { vibrationDomeLevaSchema } from "./VibrationDomeLeva.js";
import { resetVibrationDomeTuning } from "./vibration-dome-tuning.js";

/** Matches defaults in `seabed-overlay.ts` createSeabedOverlay. */
const DEFAULT_SEABED_TILING = 0.095;
const DEFAULT_SEABED_OPACITY = 0.24;

const DEFAULT_SHOWCASE_FX_TICK = 0.18;

function scrubAndSeabedFolder(onRemount: () => void) {
  const rt = getVisualShowcaseRuntime();
  const seabed = rt?.getSeabedMaterial();
  return folder({
    fxTick: {
      value: rt?.getFxTick() ?? DEFAULT_SHOWCASE_FX_TICK,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (v: number) => {
        const a = getVisualShowcaseRuntime();
        if (!a) return;
        a.setFxTick(Math.max(0, Math.min(1, v)));
        a.syncFxTickToDom();
      },
    },
    virtualLoopSec: {
      value: getShowcaseFxLoopSeconds(),
      min: 0.25,
      max: 120,
      step: 0.25,
      label: "Virtual sec at tick 1",
      onChange: (v: number) => {
        setShowcaseFxLoopSeconds(v);
      },
    },
    "Reset scrub + loop": button(() => {
      resetShowcaseFxLoopSeconds();
      const a = getVisualShowcaseRuntime();
      if (a) {
        a.setFxTick(DEFAULT_SHOWCASE_FX_TICK);
        a.syncFxTickToDom();
      }
      onRemount();
    }),
    Seabed: folder({
      uTiling: {
        value: (seabed?.uniforms.uTiling?.value as number) ?? DEFAULT_SEABED_TILING,
        min: 0.01,
        max: 0.5,
        step: 0.005,
        label: "Caustic tiling",
        onChange: (v: number) => {
          const m = getVisualShowcaseRuntime()?.getSeabedMaterial();
          if (m) (m.uniforms.uTiling as { value: number }).value = v;
        },
      },
      uOpacity: {
        value: (seabed?.uniforms.uOpacity?.value as number) ?? DEFAULT_SEABED_OPACITY,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Layer opacity",
        onChange: (v: number) => {
          const m = getVisualShowcaseRuntime()?.getSeabedMaterial();
          if (m) (m.uniforms.uOpacity as { value: number }).value = v;
        },
      },
      "Reset seabed": button(() => {
        const m = getVisualShowcaseRuntime()?.getSeabedMaterial();
        if (m) {
          (m.uniforms.uTiling as { value: number }).value = DEFAULT_SEABED_TILING;
          (m.uniforms.uOpacity as { value: number }).value = DEFAULT_SEABED_OPACITY;
        }
        onRemount();
      }),
    }),
  });
}

function VisualShowcaseLevaPanel({ onRemount }: { onRemount: () => void }) {
  useControls(
    "Visual showcase (all tuners)",
    () => ({
      "Scrub & seabed": scrubAndSeabedFolder(onRemount),
      Master: folder({
        "Reset ALL FX + scrub + seabed": button(() => {
          resetBubbleAttackFxTuning();
          bumpBubbleAttackFxGeometryRev();
          resetBubbleColumnFxTuning();
          resetCannonDnaHelixTuning();
          resetCannonProjectileFxTuning();
          resetCannonHitFxTuning();
          resetCannonBlastFxTuning();
          resetVibrationDomeTuning();
          resetInkVeilTuning();
          resetShowcaseFxLoopSeconds();
          const m = getVisualShowcaseRuntime()?.getSeabedMaterial();
          if (m) {
            (m.uniforms.uTiling as { value: number }).value = DEFAULT_SEABED_TILING;
            (m.uniforms.uOpacity as { value: number }).value = DEFAULT_SEABED_OPACITY;
          }
          const a = getVisualShowcaseRuntime();
          if (a) {
            a.setFxTick(DEFAULT_SHOWCASE_FX_TICK);
            a.syncFxTickToDom();
          }
          onRemount();
        }),
      }),
      "Bubble Shotgun FX": folder(bubbleAttackFxLevaSchema(onRemount)),
      "Current Cannon (DNA + bolt + hit + splash)": folder(
        cannonDnaHelixLevaSchema(onRemount),
      ),
      "Vibration Zone dome": folder(vibrationDomeLevaSchema(onRemount)),
      "Ink Veil aura": folder(inkVeilLevaSchema(onRemount)),
    }),
    [onRemount],
  );
  return null;
}

export function VisualShowcaseLevaRoot() {
  const [panelKey, bumpPanel] = useReducer((k: number) => k + 1, 0);
  return (
    <>
      <Leva
        collapsed={false}
        titleBar={{ drag: true, filter: true }}
        hideCopyButton
        theme={{
          sizes: {
            rootWidth: "min(440px, 96vw)",
          },
        }}
      />
      <VisualShowcaseLevaPanel key={panelKey} onRemount={bumpPanel} />
    </>
  );
}
