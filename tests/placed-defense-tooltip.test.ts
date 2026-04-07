import { describe, expect, it } from "vitest";
import {
  buildDefenseUpgradeCompare,
  linesForPlacedDefense,
} from "../src/game/placed-defense-tooltip.js";

describe("buildDefenseUpgradeCompare", () => {
  it("returns null at max tier", () => {
    expect(
      buildDefenseUpgradeCompare({
        id: "d",
        type: "arc_spine",
        position: [0, 0],
        level: 3,
        targetMode: "first",
      }),
    ).toBeNull();
  });

  it("Arc Spine L1→L2 marks core and chain rows as changed", () => {
    const rows = buildDefenseUpgradeCompare({
      id: "d",
      type: "arc_spine",
      position: [0, 0],
      level: 1,
      targetMode: "first",
    })!;
    const by = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(by.Range?.changed).toBe(true);
    expect(by.Range?.before).toContain("3.8");
    expect(by.Range?.after).toMatch(/5.*tiles/);
    expect(by.Interval?.changed).toBe(true);
    expect(by.Damage?.changed).toBe(true);
    expect(by.Damage?.before).toContain("12");
    expect(by.Damage?.after).toContain("15");
    expect(by.Chain?.changed).toBe(true);
    expect(by.Chain?.before).toContain("2 enemies");
    expect(by.Chain?.after).toContain("4 enemies");
  });

  it("vibration zone L1→L2 shows slow aura increase", () => {
    const rows = buildDefenseUpgradeCompare({
      id: "d",
      type: "vibration_zone",
      position: [0, 0],
      level: 1,
      targetMode: "first",
    })!;
    const slow = rows.find((r) => r.label === "Slow in aura");
    expect(slow?.before).toBe("30%");
    expect(slow?.after).toBe("50%");
    expect(slow?.changed).toBe(true);
  });
});

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
    expect(text).toContain("Range: 3.8 tiles");
    expect(text).toContain("Interval: 1.275s");
    expect(text).toContain("Base damage: 12");
    expect(text).toContain("up to 2 enemies");
    expect(text).toContain("hop radius 2.5");
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
