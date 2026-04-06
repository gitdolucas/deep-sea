import { button, folder, Leva, useControls } from "leva";
import { useReducer } from "react";
import {
  cannonBlastFxTuning,
  copyCannonBlastFxTuningToClipboard,
  DEFAULT_CANNON_BLAST_FX_TUNING,
  resetCannonBlastFxTuning,
  snapshotCannonBlastFxTuning,
} from "../game/cannon-blast-tuning.js";
import {
  cannonColumnHitFxTuning,
  cannonLiftFxTuning,
  copyCannonHitFxTuningToClipboard,
  DEFAULT_CANNON_COLUMN_HIT_FX_TUNING,
  DEFAULT_CANNON_LIFT_FX_TUNING,
  resetCannonHitFxTuning,
  snapshotCannonHitFxTuning,
} from "../game/cannon-hit-fx-tuning.js";
import {
  cannonProjectileFxTuning,
  copyCannonProjectileFxTuningToClipboard,
  DEFAULT_CANNON_PROJECTILE_FX_TUNING,
  resetCannonProjectileFxTuning,
  snapshotCannonProjectileFxTuning,
} from "../game/cannon-projectile-fx-tuning.js";
import {
  cannonDnaHelixTuning,
  copyCannonDnaHelixTuningToClipboard,
  DEFAULT_CANNON_DNA_HELIX_TUNING,
  resetCannonDnaHelixTuning,
  snapshotCannonDnaHelixTuning,
} from "./cannon-dna-helix-tuning.js";

const d = DEFAULT_CANNON_DNA_HELIX_TUNING;
const bd = DEFAULT_CANNON_PROJECTILE_FX_TUNING;
const blastD = DEFAULT_CANNON_BLAST_FX_TUNING;
const liftD = DEFAULT_CANNON_LIFT_FX_TUNING;
const colD = DEFAULT_CANNON_COLUMN_HIT_FX_TUNING;

async function copyFullCannonFxJson(): Promise<boolean> {
  const text = `${JSON.stringify(
    {
      projectile: snapshotCannonProjectileFxTuning(),
      dnaHelix: snapshotCannonDnaHelixTuning(),
      liftAndColumn: snapshotCannonHitFxTuning(),
      blast: snapshotCannonBlastFxTuning(),
    },
    null,
    2,
  )}\n`;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.append(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Control tree for Leva — reused by `VisualShowcaseLeva` master panel. */
export function cannonDnaHelixLevaSchema(onRemount: () => void) {
  return {
      General: folder({
        Reset: button(() => {
          resetCannonDnaHelixTuning();
          resetCannonProjectileFxTuning();
          resetCannonHitFxTuning();
          resetCannonBlastFxTuning();
          onRemount();
        }),
        "Copy DNA helix (JSON)": button(() => {
          void copyCannonDnaHelixTuningToClipboard().then((ok) => {
            if (ok) console.info("[Cannon DNA] Copied tuning JSON to clipboard.");
            else console.warn("[Cannon DNA] Could not copy to clipboard.");
          });
        }),
        "Copy bolt & fade (JSON)": button(() => {
          void copyCannonProjectileFxTuningToClipboard().then((ok) => {
            if (ok) {
              console.info("[Cannon bolt] Copied bolt/fade JSON to clipboard.");
            } else console.warn("[Cannon bolt] Could not copy to clipboard.");
          });
        }),
        "Copy lift + column (JSON)": button(() => {
          void copyCannonHitFxTuningToClipboard().then((ok) => {
            if (ok) {
              console.info("[Cannon hit] Copied lift + column JSON to clipboard.");
            } else console.warn("[Cannon hit] Could not copy to clipboard.");
          });
        }),
        "Copy splash blast (JSON)": button(() => {
          void copyCannonBlastFxTuningToClipboard().then((ok) => {
            if (ok) {
              console.info("[Cannon blast] Copied splash JSON to clipboard.");
            } else console.warn("[Cannon blast] Could not copy to clipboard.");
          });
        }),
        "Copy ALL cannon FX (JSON)": button(() => {
          void copyFullCannonFxJson().then((ok) => {
            if (ok) console.info("[Cannon] Copied full FX bundle to clipboard.");
            else console.warn("[Cannon] Could not copy full FX to clipboard.");
          });
        }),
      }),
      "Bolt & fade": folder({
        boltLength: {
          value: bd.boltLength,
          min: 0.2,
          max: 12,
          step: 0.02,
          label: "Max length (world)",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltLength = v;
          },
        },
        boltLengthStartFrac: {
          value: bd.boltLengthStartFrac,
          min: 0.02,
          max: 1,
          step: 0.01,
          label: "Start length (× max)",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltLengthStartFrac = v;
          },
        },
        shrinkBeforeFadeSec: {
          value: bd.shrinkBeforeFadeSec,
          min: 0,
          max: 2,
          step: 0.01,
          label: "Shrink on hit (s, tip fixed)",
          onChange: (v: number) => {
            cannonProjectileFxTuning.shrinkBeforeFadeSec = v;
          },
        },
        fadeInSec: {
          value: bd.fadeInSec,
          min: 0,
          max: 2,
          step: 0.01,
          label: "Fade in (s)",
          onChange: (v: number) => {
            cannonProjectileFxTuning.fadeInSec = v;
          },
        },
        fadeOutSec: {
          value: bd.fadeOutSec,
          min: 0,
          max: 2,
          step: 0.01,
          label: "Fade out after shrink (s)",
          onChange: (v: number) => {
            cannonProjectileFxTuning.fadeOutSec = v;
          },
        },
      }),
      "Bolt body (cylinder mesh)": folder({
        boltGeomHeight: {
          value: bd.boltGeomHeight,
          min: 0.2,
          max: 12,
          step: 0.02,
          label: "Geom height (scale ref)",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltGeomHeight = v;
          },
        },
        boltRadiusBottom: {
          value: bd.boltRadiusBottom,
          min: 0.005,
          max: 0.2,
          step: 0.001,
          label: "Radius bottom",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltRadiusBottom = v;
          },
        },
        boltRadiusTop: {
          value: bd.boltRadiusTop,
          min: 0.005,
          max: 0.2,
          step: 0.001,
          label: "Radius top",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltRadiusTop = v;
          },
        },
        boltCylinderRadialSegs: {
          value: bd.boltCylinderRadialSegs,
          min: 3,
          max: 48,
          step: 1,
          label: "Radial segments",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltCylinderRadialSegs = Math.round(v);
          },
        },
        boltCylinderHeightSegs: {
          value: bd.boltCylinderHeightSegs,
          min: 1,
          max: 16,
          step: 1,
          label: "Height segments",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltCylinderHeightSegs = Math.round(v);
          },
        },
      }),
      "Bolt motion (in flight)": folder({
        bobBase: {
          value: bd.bobBase,
          min: 0,
          max: 2,
          step: 0.01,
          label: "Bob base Y",
          onChange: (v: number) => {
            cannonProjectileFxTuning.bobBase = v;
          },
        },
        bobSinAmp: {
          value: bd.bobSinAmp,
          min: 0,
          max: 0.3,
          step: 0.005,
          label: "Bob wobble amp",
          onChange: (v: number) => {
            cannonProjectileFxTuning.bobSinAmp = v;
          },
        },
        bobSinTimeFreq: {
          value: bd.bobSinTimeFreq,
          min: 0,
          max: 40,
          step: 0.5,
          label: "Bob time freq",
          onChange: (v: number) => {
            cannonProjectileFxTuning.bobSinTimeFreq = v;
          },
        },
        bobSinTravelFreq: {
          value: bd.bobSinTravelFreq,
          min: 0,
          max: 20,
          step: 0.1,
          label: "Bob travel freq",
          onChange: (v: number) => {
            cannonProjectileFxTuning.bobSinTravelFreq = v;
          },
        },
        bobSinIndexPhase: {
          value: bd.bobSinIndexPhase,
          min: 0,
          max: 4,
          step: 0.05,
          label: "Bob index phase",
          onChange: (v: number) => {
            cannonProjectileFxTuning.bobSinIndexPhase = v;
          },
        },
        boltScrollMult: {
          value: bd.boltScrollMult,
          min: 0,
          max: 12,
          step: 0.1,
          label: "Shader scroll × traveled",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltScrollMult = v;
          },
        },
        boltLevelScaleL3: {
          value: bd.boltLevelScaleL3,
          min: 0.5,
          max: 2,
          step: 0.01,
          label: "Scale mult L3+",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltLevelScaleL3 = v;
          },
        },
        boltLevelYBase: {
          value: bd.boltLevelYBase,
          min: 0.5,
          max: 1.5,
          step: 0.01,
          label: "Stretch Y base",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltLevelYBase = v;
          },
        },
        boltLevelYPerLevel: {
          value: bd.boltLevelYPerLevel,
          min: 0,
          max: 0.2,
          step: 0.005,
          label: "Stretch Y / level",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltLevelYPerLevel = v;
          },
        },
        boltScaleWaveAmp: {
          value: bd.boltScaleWaveAmp,
          min: 0,
          max: 0.3,
          step: 0.005,
          label: "Scale breathe amp",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltScaleWaveAmp = v;
          },
        },
        boltScaleWaveTimeFreq: {
          value: bd.boltScaleWaveTimeFreq,
          min: 0,
          max: 40,
          step: 0.5,
          label: "Scale breathe time",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltScaleWaveTimeFreq = v;
          },
        },
        boltScaleWaveTravelFreq: {
          value: bd.boltScaleWaveTravelFreq,
          min: 0,
          max: 20,
          step: 0.5,
          label: "Scale breathe travel",
          onChange: (v: number) => {
            cannonProjectileFxTuning.boltScaleWaveTravelFreq = v;
          },
        },
      }),
      "Enemy lift (sprite)": folder({
        peakWorldY: {
          value: liftD.peakWorldY,
          min: 0,
          max: 2,
          step: 0.01,
          label: "Peak height (world Y)",
          onChange: (v: number) => {
            cannonLiftFxTuning.peakWorldY = v;
          },
        },
        riseSec: {
          value: liftD.riseSec,
          min: 0.01,
          max: 1,
          step: 0.005,
          label: "Rise time (s)",
          onChange: (v: number) => {
            cannonLiftFxTuning.riseSec = v;
          },
        },
        fallSec: {
          value: liftD.fallSec,
          min: 0.01,
          max: 1,
          step: 0.005,
          label: "Fall time (s)",
          onChange: (v: number) => {
            cannonLiftFxTuning.fallSec = v;
          },
        },
        twistAmpX: {
          value: liftD.twistAmpX,
          min: 0,
          max: 1.2,
          step: 0.01,
          label: "Twist amp X (rad)",
          onChange: (v: number) => {
            cannonLiftFxTuning.twistAmpX = v;
          },
        },
        twistAmpY: {
          value: liftD.twistAmpY,
          min: 0,
          max: 1.2,
          step: 0.01,
          label: "Twist amp Y (rad)",
          onChange: (v: number) => {
            cannonLiftFxTuning.twistAmpY = v;
          },
        },
        twistAmpZ: {
          value: liftD.twistAmpZ,
          min: 0,
          max: 1.2,
          step: 0.01,
          label: "Twist amp Z (rad)",
          onChange: (v: number) => {
            cannonLiftFxTuning.twistAmpZ = v;
          },
        },
        twistFreqX: {
          value: liftD.twistFreqX,
          min: 0,
          max: 48,
          step: 0.5,
          label: "Twist freq X (rad/s)",
          onChange: (v: number) => {
            cannonLiftFxTuning.twistFreqX = v;
          },
        },
        twistFreqY: {
          value: liftD.twistFreqY,
          min: 0,
          max: 48,
          step: 0.5,
          label: "Twist freq Y (rad/s)",
          onChange: (v: number) => {
            cannonLiftFxTuning.twistFreqY = v;
          },
        },
        twistFreqZ: {
          value: liftD.twistFreqZ,
          min: 0,
          max: 48,
          step: 0.5,
          label: "Twist freq Z (rad/s)",
          onChange: (v: number) => {
            cannonLiftFxTuning.twistFreqZ = v;
          },
        },
      }),
      "Column hit VFX": folder({
        durationSec: {
          value: colD.durationSec,
          min: 0.1,
          max: 3,
          step: 0.02,
          label: "Duration (s)",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.durationSec = v;
          },
        },
        height: {
          value: colD.height,
          min: 0.2,
          max: 6,
          step: 0.02,
          label: "Column height",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.height = v;
          },
        },
        baseYOffset: {
          value: colD.baseYOffset,
          min: 0,
          max: 3,
          step: 0.02,
          label: "Base Y offset",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.baseYOffset = v;
          },
        },
        radiusBottom: {
          value: colD.radiusBottom,
          min: 0.01,
          max: 0.5,
          step: 0.005,
          label: "Radius bottom",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.radiusBottom = v;
          },
        },
        radiusTop: {
          value: colD.radiusTop,
          min: 0.01,
          max: 0.5,
          step: 0.005,
          label: "Radius top (pre-flare)",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.radiusTop = v;
          },
        },
        flareRadius: {
          value: colD.flareRadius,
          min: 0,
          max: 2,
          step: 0.02,
          label: "Flare amount (rim open)",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.flareRadius = v;
          },
        },
        growEndFrac: {
          value: colD.growEndFrac,
          min: 0.05,
          max: 1,
          step: 0.01,
          label: "Grow ends at (age 0–1)",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.growEndFrac = v;
          },
        },
        openStartFrac: {
          value: colD.openStartFrac,
          min: 0,
          max: 0.95,
          step: 0.01,
          label: "Flare starts at (age 0–1)",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.openStartFrac = v;
          },
        },
        rimSpokeCount: {
          value: colD.rimSpokeCount,
          min: 4,
          max: 64,
          step: 1,
          label: "Rim spokes",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.rimSpokeCount = Math.round(v);
          },
        },
        rimSpokeStrength: {
          value: colD.rimSpokeStrength,
          min: 0,
          max: 1,
          step: 0.02,
          label: "Rim spoke strength",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.rimSpokeStrength = v;
          },
        },
        pulseSpeed: {
          value: colD.pulseSpeed,
          min: 0,
          max: 40,
          step: 0.5,
          label: "Pulse speed",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.pulseSpeed = v;
          },
        },
        radialSegments: {
          value: colD.radialSegments,
          min: 8,
          max: 48,
          step: 1,
          label: "Radial segments",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.radialSegments = Math.round(v);
          },
        },
        heightSegments: {
          value: colD.heightSegments,
          min: 4,
          max: 32,
          step: 1,
          label: "Height segments",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.heightSegments = Math.round(v);
          },
        },
        flareCurveStart: {
          value: colD.flareCurveStart,
          min: 0,
          max: 0.95,
          step: 0.01,
          label: "Flare curve start (UV.y)",
          onChange: (v: number) => {
            cannonColumnHitFxTuning.flareCurveStart = v;
          },
        },
      }),
      "Splash blast (ground)": folder({
        durationSec: {
          value: blastD.durationSec,
          min: 0.1,
          max: 4,
          step: 0.02,
          label: "Duration (s)",
          onChange: (v: number) => {
            cannonBlastFxTuning.durationSec = v;
          },
        },
        groundYOffset: {
          value: blastD.groundYOffset,
          min: 0,
          max: 2,
          step: 0.02,
          label: "Ground Y offset",
          onChange: (v: number) => {
            cannonBlastFxTuning.groundYOffset = v;
          },
        },
        minRadiusWorld: {
          value: blastD.minRadiusWorld,
          min: 0.05,
          max: 3,
          step: 0.02,
          label: "Min radius (world)",
          onChange: (v: number) => {
            cannonBlastFxTuning.minRadiusWorld = v;
          },
        },
        circleSegments: {
          value: blastD.circleSegments,
          min: 8,
          max: 96,
          step: 1,
          label: "Circle segments",
          onChange: (v: number) => {
            cannonBlastFxTuning.circleSegments = Math.round(v);
          },
        },
        fadeExponent: {
          value: blastD.fadeExponent,
          min: 0.5,
          max: 8,
          step: 0.1,
          label: "Fade exponent (k^n)",
          onChange: (v: number) => {
            cannonBlastFxTuning.fadeExponent = v;
          },
        },
      }),
      Geometry: folder({
        strandCount: {
          value: d.strandCount,
          min: 1,
          max: 16,
          step: 1,
          label: "Strand count",
          onChange: (v: number) => {
            cannonDnaHelixTuning.strandCount = Math.round(v);
          },
        },
        segments: {
          value: d.segments,
          min: 8,
          max: 256,
          step: 1,
          onChange: (v: number) => {
            cannonDnaHelixTuning.segments = Math.round(v);
          },
        },
        turns: {
          value: d.turns,
          min: 0.25,
          max: 16,
          step: 0.05,
          label: "Twists along bolt",
          onChange: (v: number) => {
            cannonDnaHelixTuning.turns = v;
          },
        },
        phaseSpreadMul: {
          value: d.phaseSpreadMul,
          min: 0.1,
          max: 2,
          step: 0.01,
          label: "Phase spread",
          onChange: (v: number) => {
            cannonDnaHelixTuning.phaseSpreadMul = v;
          },
        },
      }),
      Radii: folder({
        radiusA: {
          value: d.radiusA,
          min: 0.01,
          max: 0.12,
          step: 0.001,
          label: "Radius A (even strands)",
          onChange: (v: number) => {
            cannonDnaHelixTuning.radiusA = v;
          },
        },
        radiusB: {
          value: d.radiusB,
          min: 0.01,
          max: 0.12,
          step: 0.001,
          label: "Radius B (odd strands)",
          onChange: (v: number) => {
            cannonDnaHelixTuning.radiusB = v;
          },
        },
      }),
      "Twist motion": folder({
        timeTwistSpeed: {
          value: d.timeTwistSpeed,
          min: 0,
          max: 24,
          step: 0.1,
          label: "Time speed",
          onChange: (v: number) => {
            cannonDnaHelixTuning.timeTwistSpeed = v;
          },
        },
        timeTwistPerLevel: {
          value: d.timeTwistPerLevel,
          min: 0,
          max: 8,
          step: 0.05,
          label: "Time speed / level",
          onChange: (v: number) => {
            cannonDnaHelixTuning.timeTwistPerLevel = v;
          },
        },
        traveledTwistSpeed: {
          value: d.traveledTwistSpeed,
          min: 0,
          max: 24,
          step: 0.1,
          label: "Traveled speed",
          onChange: (v: number) => {
            cannonDnaHelixTuning.traveledTwistSpeed = v;
          },
        },
        traveledTwistPerLevel: {
          value: d.traveledTwistPerLevel,
          min: 0,
          max: 8,
          step: 0.05,
          label: "Traveled speed / level",
          onChange: (v: number) => {
            cannonDnaHelixTuning.traveledTwistPerLevel = v;
          },
        },
      }),
      Wobble: folder({
        wobbleAmplitude: {
          value: d.wobbleAmplitude,
          min: 0,
          max: 0.5,
          step: 0.005,
          label: "Amplitude",
          onChange: (v: number) => {
            cannonDnaHelixTuning.wobbleAmplitude = v;
          },
        },
        wobbleTimeFreq: {
          value: d.wobbleTimeFreq,
          min: 0,
          max: 24,
          step: 0.1,
          label: "Time frequency",
          onChange: (v: number) => {
            cannonDnaHelixTuning.wobbleTimeFreq = v;
          },
        },
        wobbleAxialFreq: {
          value: d.wobbleAxialFreq,
          min: 0,
          max: 48,
          step: 0.5,
          label: "Along-bolt frequency",
          onChange: (v: number) => {
            cannonDnaHelixTuning.wobbleAxialFreq = v;
          },
        },
        wobbleStrandOffset: {
          value: d.wobbleStrandOffset,
          min: 0,
          max: 8,
          step: 0.05,
          label: "Strand phase offset",
          onChange: (v: number) => {
            cannonDnaHelixTuning.wobbleStrandOffset = v;
          },
        },
      }),
      "Line material": folder({
        lineOpacity: {
          value: d.lineOpacity,
          min: 0.05,
          max: 1,
          step: 0.01,
          label: "Opacity",
          onChange: (v: number) => {
            cannonDnaHelixTuning.lineOpacity = v;
          },
        },
        lineRenderOrder: {
          value: d.lineRenderOrder,
          min: 0,
          max: 15,
          step: 1,
          label: "Render order",
          onChange: (v: number) => {
            cannonDnaHelixTuning.lineRenderOrder = Math.round(v);
          },
        },
        lineDepthWrite: {
          value: d.lineDepthWrite,
          label: "Depth write",
          onChange: (v: boolean) => {
            cannonDnaHelixTuning.lineDepthWrite = v;
          },
        },
        blending: {
          value: d.blending,
          options: ["additive", "normal"],
          onChange: (v: "additive" | "normal") => {
            cannonDnaHelixTuning.blending = v;
          },
        },
      }),
      "Strand colors": folder({
        color0: {
          value: d.color0,
          onChange: (v: string) => {
            cannonDnaHelixTuning.color0 = v;
          },
        },
        color1: {
          value: d.color1,
          onChange: (v: string) => {
            cannonDnaHelixTuning.color1 = v;
          },
        },
        color2: {
          value: d.color2,
          onChange: (v: string) => {
            cannonDnaHelixTuning.color2 = v;
          },
        },
        color3: {
          value: d.color3,
          onChange: (v: string) => {
            cannonDnaHelixTuning.color3 = v;
          },
        },
        color4: {
          value: d.color4,
          onChange: (v: string) => {
            cannonDnaHelixTuning.color4 = v;
          },
        },
        color5: {
          value: d.color5,
          onChange: (v: string) => {
            cannonDnaHelixTuning.color5 = v;
          },
        },
        color6: {
          value: d.color6,
          onChange: (v: string) => {
            cannonDnaHelixTuning.color6 = v;
          },
        },
        color7: {
          value: d.color7,
          onChange: (v: string) => {
            cannonDnaHelixTuning.color7 = v;
          },
        },
      }),
  };
}

function CannonDnaHelixLevaPanel({ onRemount }: { onRemount: () => void }) {
  useControls(
    "Current Cannon DNA Helix",
    () => cannonDnaHelixLevaSchema(onRemount),
    [onRemount],
  );
  return null;
}

export function CannonDnaHelixLevaRoot() {
  const [panelKey, bumpPanel] = useReducer((k: number) => k + 1, 0);
  return (
    <>
      <Leva
        collapsed={false}
        titleBar={{ drag: true, filter: false }}
        hideCopyButton
        theme={{
          sizes: {
            rootWidth: "340px",
          },
        }}
      />
      <CannonDnaHelixLevaPanel key={panelKey} onRemount={bumpPanel} />
    </>
  );
}
