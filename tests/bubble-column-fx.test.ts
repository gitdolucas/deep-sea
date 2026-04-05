import { describe, expect, it } from "vitest";
import { getBubbleColumnRenderConfig } from "../src/render/bubble-column-fx.js";

describe("bubble column FX render config", () => {
  it("resolves shotgun presets with finite positive numbers", () => {
    const muzzle = getBubbleColumnRenderConfig({
      preset: "bubble_shotgun_muzzle",
      seed: 1,
      from: [0, 0],
      to: [2, 0],
      axis: "segment",
      splash: false,
    });
    expect(muzzle.particleCount).toBeGreaterThan(0);
    expect(muzzle.length).toBeGreaterThan(0);
    expect(muzzle.duration).toBeGreaterThan(0);

    const hit = getBubbleColumnRenderConfig({
      preset: "bubble_shotgun_impact",
      seed: 2,
      from: [1, 1],
      to: [1.4, 1],
      axis: "segment",
      splash: true,
    });
    expect(hit.particleCount).toBeGreaterThanOrEqual(28);
    expect(hit.duration).toBeGreaterThan(0);
  });

  it("applies durationScale and intensity", () => {
    const a = getBubbleColumnRenderConfig({
      preset: "bubble_shotgun_muzzle",
      seed: 3,
      from: [0, 0],
      axis: "world_up",
      splash: false,
      durationScale: 2,
      intensity: 0.5,
    });
    const b = getBubbleColumnRenderConfig({
      preset: "bubble_shotgun_muzzle",
      seed: 3,
      from: [0, 0],
      axis: "world_up",
      splash: false,
      durationScale: 1,
      intensity: 1,
    });
    expect(a.duration).toBeCloseTo(b.duration * 2, 5);
    expect(a.length).toBeCloseTo(b.length * 0.5, 5);
  });
});
