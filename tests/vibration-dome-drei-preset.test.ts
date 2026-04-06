import { describe, expect, it } from "vitest";
import {
  DEFAULT_VIBRATION_DOME_TUNING,
  VIBRATION_DOME_DREI_GLASS_PRESET,
} from "../src/render/vibration-dome-tuning.js";

describe("VIBRATION_DOME_DREI_GLASS_PRESET", () => {
  it("maps Drei-style Leva export fields onto engine tuning (approximate)", () => {
    const merged = {
      ...DEFAULT_VIBRATION_DOME_TUNING,
      ...VIBRATION_DOME_DREI_GLASS_PRESET,
    };
    expect(merged.transmission).toBe(1);
    expect(merged.roughness).toBe(0);
    expect(merged.ior).toBe(1.5);
    expect(merged.dispersion).toBe(0.06);
    expect(merged.anisotropy).toBe(0.1);
    expect(merged.baseColor).toBe("#c9ffa1");
    expect(merged.attenuationColor).toBe("#ffffff");
    expect(merged.attenuationDistance).toBe(0.5);
    expect(merged.clearcoat).toBe(1);
    expect(merged.transmissionResolutionScale).toBe(1);
  });
});
