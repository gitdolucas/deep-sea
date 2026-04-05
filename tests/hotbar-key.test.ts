import { describe, expect, it } from "vitest";
import { hotbarIndexFromKey } from "../src/game/hotbar-key.js";

describe("hotbarIndexFromKey", () => {
  it("maps digit keys 1–9 to zero-based indices", () => {
    expect(hotbarIndexFromKey("1")).toBe(0);
    expect(hotbarIndexFromKey("6")).toBe(5);
    expect(hotbarIndexFromKey("9")).toBe(8);
  });

  it("returns null for non-digit or multi-char input", () => {
    expect(hotbarIndexFromKey("0")).toBeNull();
    expect(hotbarIndexFromKey("a")).toBeNull();
    expect(hotbarIndexFromKey("10")).toBeNull();
    expect(hotbarIndexFromKey("")).toBeNull();
  });
});
