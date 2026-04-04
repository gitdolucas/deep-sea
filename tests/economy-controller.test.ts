import { describe, expect, it } from "vitest";
import { EconomyController } from "../src/game/economy-controller.js";

interface EconomyControllerPrivate {
  normalizeSpendAmount(cost: number): number | null;
  normalizeIncomeAmount(amount: number): number;
  isValidNonNegativeFinite(n: number): boolean;
  floorNonNegative(n: number): number;
}

function priv(e: EconomyController): EconomyControllerPrivate {
  return e as unknown as EconomyControllerPrivate;
}

describe("EconomyController", () => {
  describe("private helpers (white-box)", () => {
    it("isValidNonNegativeFinite rejects NaN/Infinity and negatives", () => {
      const eco = new EconomyController({ shells: 0 });
      const p = priv(eco);
      expect(p.isValidNonNegativeFinite(0)).toBe(true);
      expect(p.isValidNonNegativeFinite(3.7)).toBe(true);
      expect(p.isValidNonNegativeFinite(-1)).toBe(false);
      expect(p.isValidNonNegativeFinite(Number.NaN)).toBe(false);
      expect(p.isValidNonNegativeFinite(Number.POSITIVE_INFINITY)).toBe(false);
    });

    it("floorNonNegative floors and clamps invalid to 0", () => {
      const eco = new EconomyController({ shells: 0 });
      const p = priv(eco);
      expect(p.floorNonNegative(12.9)).toBe(12);
      expect(p.floorNonNegative(-3)).toBe(0);
      expect(p.floorNonNegative(Number.NaN)).toBe(0);
    });

    it("normalizeSpendAmount floors valid values and rejects invalid", () => {
      const eco = new EconomyController({ shells: 0 });
      const p = priv(eco);
      expect(p.normalizeSpendAmount(10)).toBe(10);
      expect(p.normalizeSpendAmount(9.9)).toBe(9);
      expect(p.normalizeSpendAmount(-1)).toBeNull();
    });

    it("normalizeIncomeAmount returns floored income or 0", () => {
      const eco = new EconomyController({ shells: 0 });
      const p = priv(eco);
      expect(p.normalizeIncomeAmount(4.2)).toBe(4);
      expect(p.normalizeIncomeAmount(-1)).toBe(0);
    });
  });

  describe("public API", () => {
    it("trySpend deducts floored cost when affordable", () => {
      const eco = new EconomyController({ shells: 100, totalShellsEarned: 100 });
      expect(eco.trySpend(30)).toBe(true);
      expect(eco.getShells()).toBe(70);
      expect(eco.getTotalShellsEarned()).toBe(100);
    });

    it("trySpend fails when broke or invalid", () => {
      const eco = new EconomyController({ shells: 5 });
      expect(eco.trySpend(10)).toBe(false);
      expect(eco.getShells()).toBe(5);
      expect(eco.trySpend(Number.NaN)).toBe(false);
    });

    it("earn increases shells and lifetime earned", () => {
      const eco = new EconomyController({ shells: 10, totalShellsEarned: 10 });
      eco.earn(7);
      expect(eco.getShells()).toBe(17);
      expect(eco.getTotalShellsEarned()).toBe(17);
    });

    it("refund increases shells but not lifetime earned", () => {
      const eco = new EconomyController({ shells: 50, totalShellsEarned: 200 });
      eco.refund(25);
      expect(eco.getShells()).toBe(75);
      expect(eco.getTotalShellsEarned()).toBe(200);
    });

    it("toSnapshot matches saveState economy fields", () => {
      const eco = new EconomyController({ shells: 3, totalShellsEarned: 99 });
      eco.earn(1);
      expect(eco.toSnapshot()).toEqual({ shells: 4, totalShellsEarned: 100 });
    });

    it("constructor floors initial balances", () => {
      const eco = new EconomyController({ shells: 9.8, totalShellsEarned: 20.2 });
      expect(eco.getShells()).toBe(9);
      expect(eco.getTotalShellsEarned()).toBe(20);
    });
  });
});
