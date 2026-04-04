import { describe, expect, it } from "vitest";
import { CastleController } from "../src/game/castle-controller.js";

describe("CastleController", () => {
  it("tracks damage and destruction", () => {
    const c = new CastleController(20);
    expect(c.getCurrentHp()).toBe(20);
    c.applyDamage(7);
    expect(c.getCurrentHp()).toBe(13);
    expect(c.isDestroyed()).toBe(false);
    c.applyDamage(20);
    expect(c.getCurrentHp()).toBe(0);
    expect(c.isDestroyed()).toBe(true);
    c.applyDamage(99);
    expect(c.getCurrentHp()).toBe(0);
  });

  it("respects explicit currentHp below max", () => {
    const c = new CastleController(20, 15);
    expect(c.getCurrentHp()).toBe(15);
    c.heal(100);
    expect(c.getCurrentHp()).toBe(20);
  });
});
