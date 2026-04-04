import { describe, expect, it } from "vitest";
import { GAMEPLAY_TIPS } from "../src/render/gameplay-tips.js";

describe("GAMEPLAY_TIPS", () => {
  it("has multiple non-empty entries", () => {
    expect(GAMEPLAY_TIPS.length).toBeGreaterThan(5);
    for (const line of GAMEPLAY_TIPS) {
      expect(line.trim().length).toBeGreaterThan(10);
    }
  });
});
