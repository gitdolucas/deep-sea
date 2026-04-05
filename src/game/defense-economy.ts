import { buildCostL1 } from "./defense-build-costs.js";
import type { DefenseLevel, DefenseSnapshot, DefenseTypeKey } from "./types.js";

/**
 * Shells spent on tower from placement through current level (docs/economy.md §Spending).
 * L1 = base; L2 = base + 2×base; L3 = base + 2×base + 4×base.
 */
export function totalInvestedShells(
  type: DefenseTypeKey,
  level: DefenseLevel,
): number {
  const base = buildCostL1(type);
  let sum = base;
  if (level >= 2) sum += base * 2;
  if (level >= 3) sum += base * 4;
  return sum;
}

/** Salvage return: floor(50% of total invested) per docs/economy.md §Spending / Salvage. */
export function salvageShellsForDefense(snap: DefenseSnapshot): number {
  const invested = totalInvestedShells(snap.type, snap.level);
  return Math.floor(invested * 0.5);
}

/**
 * Refund when downgrading one tier: same shells as paid for that upgrade step
 * (inverse of {@link import("./defense-controller.js").DefenseController.upgradeShellCost}).
 */
export function downgradeRefundForLevel(
  type: DefenseTypeKey,
  fromLevel: DefenseLevel,
): number | null {
  if (fromLevel <= 1) return null;
  const base = buildCostL1(type);
  if (fromLevel === 2) return base * 2;
  return base * 4;
}
