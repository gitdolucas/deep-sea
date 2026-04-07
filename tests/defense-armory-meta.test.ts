import { describe, expect, it } from "vitest";
import {
  ARMORY_CARD_PERK,
  ARMORY_DISPLAY_NAME,
  ARMORY_PRIMARY_ROLE,
  ARMORY_ROLE_TAGS,
} from "../src/game/defense-armory-meta.js";
import { ARMORY_DEFENSE_ORDER } from "../src/game/defense-build-costs.js";

describe("defense-armory-meta", () => {
  it("defines display name and perk for every armory defense type", () => {
    for (const type of ARMORY_DEFENSE_ORDER) {
      expect(ARMORY_DISPLAY_NAME[type].length).toBeGreaterThan(1);
      expect(ARMORY_CARD_PERK[type].length).toBeGreaterThan(4);
    }
  });

  it("defines primary role and 1–2 role tags per defense", () => {
    for (const type of ARMORY_DEFENSE_ORDER) {
      expect(ARMORY_PRIMARY_ROLE[type]).toMatch(
        /^(damage|control|support|aura)$/,
      );
      const tags = ARMORY_ROLE_TAGS[type];
      expect(tags.length).toBeGreaterThanOrEqual(1);
      expect(tags.length).toBeLessThanOrEqual(2);
      for (const t of tags) {
        expect(t.length).toBeGreaterThan(2);
      }
    }
  });
});
