import { describe, expect, it } from "vitest";
import {
  defenseCardIconSpriteStyles,
  entitySpriteRegionKeyForDefense,
} from "../src/render/entity-sprite-dom.js";

describe("entitySpriteRegionKeyForDefense", () => {
  it("maps atlas defenses", () => {
    expect(entitySpriteRegionKeyForDefense("arc_spine")).toBe("arc_spine");
    expect(entitySpriteRegionKeyForDefense("vibration_zone")).toBe("vibration_zone");
    expect(entitySpriteRegionKeyForDefense("ink_veil")).toBe("ink_veil");
  });

  it("returns null for non-atlas defenses", () => {
    expect(entitySpriteRegionKeyForDefense("bubble_shotgun")).toBeNull();
    expect(entitySpriteRegionKeyForDefense("current_cannon")).toBeNull();
    expect(entitySpriteRegionKeyForDefense("tideheart_laser")).toBeNull();
  });
});

describe("defenseCardIconSpriteStyles", () => {
  it("uses contain scale and atlas URL", () => {
    const { inner } = defenseCardIconSpriteStyles("arc_spine", 64, 64);
    expect(inner.backgroundImage).toContain("url(");
    expect(inner.backgroundImage).toContain("/textures/sprites.png");
    expect(inner.backgroundSize).toMatch(/^\d+(\.\d+)?px \d+(\.\d+)?px$/);
    expect(inner.backgroundPosition).toMatch(/^-?[\d.]+px -?[\d.]+px$/);
  });
});
