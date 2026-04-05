import type { GridPos } from "./types.js";

/** Extensible presets for parametric bubble columns (render maps preset → visuals). */
export type BubbleColumnFxPreset =
  | "bubble_shotgun_muzzle"
  | "bubble_shotgun_impact";

/** Segment: column axis from `from` toward `to` in XZ (world). `world_up`: axis is +Y at `from`. */
export type BubbleColumnFxAxisMode = "segment" | "world_up";

/** Headless VFX request — no Three.js; consumed by the render layer each frame. */
export interface BubbleColumnFxEvent {
  preset: BubbleColumnFxPreset;
  /** Stable hash for particle placement / phase. */
  seed: number;
  from: GridPos;
  /** Required for `segment`; ignored for `world_up` if absent (falls back to short +Z offset). */
  to?: GridPos;
  axis: BubbleColumnFxAxisMode;
  /** L3 splash styling on impact presets. */
  splash: boolean;
  durationScale?: number;
  intensity?: number;
}
