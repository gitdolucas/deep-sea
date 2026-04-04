import type { EconomySnapshot } from "./types.js";

export interface EconomyInitialState {
  shells: number;
  /**
   * Lifetime income stat (`saveState.totalShellsEarned`). When omitted, defaults to `shells`
   * (fine for a new run starting at 0). For a starting bonus that should not raise lifetime stats,
   * set `totalShellsEarned` explicitly (e.g. `{ shells: 100, totalShellsEarned: 0 }`).
   */
  totalShellsEarned?: number;
}

/**
 * Shell currency: spend on builds/upgrades, earn from drops and rewards, optional sell refunds.
 */
export class EconomyController {
  private shells: number;
  private totalShellsEarned: number;

  constructor(initial: EconomyInitialState) {
    this.shells = this.floorNonNegative(initial.shells);
    const earned = initial.totalShellsEarned ?? initial.shells;
    this.totalShellsEarned = this.floorNonNegative(earned);
  }

  getShells(): number {
    return this.shells;
  }

  getTotalShellsEarned(): number {
    return this.totalShellsEarned;
  }

  toSnapshot(): EconomySnapshot {
    return {
      shells: this.shells,
      totalShellsEarned: this.totalShellsEarned,
    };
  }

  canAfford(cost: number): boolean {
    const n = this.normalizeSpendAmount(cost);
    if (n === null) return false;
    if (n === 0) return true;
    return this.shells >= n;
  }

  /** Returns false if cost is invalid or balance is insufficient. Zero cost is a no-op success. */
  trySpend(cost: number): boolean {
    const n = this.normalizeSpendAmount(cost);
    if (n === null) return false;
    if (n === 0) return true;
    if (this.shells < n) return false;
    this.shells -= n;
    return true;
  }

  /** Shells from enemy drops, wave bonuses, objectives — counts toward lifetime earned. */
  earn(amount: number): void {
    const n = this.normalizeIncomeAmount(amount);
    if (n <= 0) return;
    this.shells += n;
    this.totalShellsEarned += n;
  }

  /** Selling a tower / undo — adds shells without affecting lifetime earned. */
  refund(amount: number): void {
    const n = this.normalizeIncomeAmount(amount);
    if (n <= 0) return;
    this.shells += n;
  }

  private normalizeSpendAmount(cost: number): number | null {
    if (!this.isValidNonNegativeFinite(cost)) return null;
    return Math.floor(cost);
  }

  private normalizeIncomeAmount(amount: number): number {
    if (!this.isValidNonNegativeFinite(amount)) return 0;
    return Math.floor(amount);
  }

  private isValidNonNegativeFinite(n: number): boolean {
    return Number.isFinite(n) && n >= 0;
  }

  private floorNonNegative(n: number): number {
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(n);
  }
}
