import { describe, expect, it } from "vitest";
import {
  ARMORY_CARD_PERK,
  ARMORY_DISPLAY_NAME,
} from "../src/game/defense-armory-meta.js";
import { ARMORY_DEFENSE_ORDER } from "../src/game/defense-build-costs.js";

describe("defense-armory-meta", () => {
  it("defines display name and perk for every armory defense type", () => {
    for (const type of ARMORY_DEFENSE_ORDER) {
      expect(ARMORY_DISPLAY_NAME[type].length).toBeGreaterThan(1);
      expect(ARMORY_CARD_PERK[type].length).toBeGreaterThan(4);
    }
  });
});
