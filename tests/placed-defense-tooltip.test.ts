import { describe, expect, it } from "vitest";
import { linesForPlacedDefense } from "../src/game/placed-defense-tooltip.js";

describe("linesForPlacedDefense", () => {
  it("includes core stats and arc spine chain data for L1", () => {
    const lines = linesForPlacedDefense({
      id: "def_1",
      type: "arc_spine",
      position: [3, 4],
      level: 1,
      targetMode: "closest",
    });
    const text = lines.join("\n");
    expect(text).toContain("Arc Spine · L1");
    expect(text).toContain("Target: Closest");
    expect(text).toContain("Range: 3 tiles");
    expect(text).toContain("Interval: 1.5s");
    expect(text).toContain("Base damage: 8");
    expect(text).toContain("up to 2 enemies");
    expect(text).toContain("hop radius 2");
    expect(text).toContain("×0.8");
    expect(text).toContain("[3, 4]");
    expect(text).toContain("def_1");
  });

  it("describes vibration zone slow", () => {
    const lines = linesForPlacedDefense({
      id: "d",
      type: "vibration_zone",
      position: [0, 0],
      level: 2,
      targetMode: "first",
    });
    expect(lines.some((l) => l.includes("50%"))).toBe(true);
  });
});
