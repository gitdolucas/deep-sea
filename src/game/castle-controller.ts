/**
 * Citadel HP (docs/map-schema.md `castle` / `saveState.castleHp`).
 */
export class CastleController {
  readonly maxHp: number;
  private currentHp: number;

  constructor(maxHp: number, currentHp?: number) {
    const max = Math.max(0, Math.floor(maxHp));
    this.maxHp = max;
    const cur =
      currentHp === undefined ? max : Math.max(0, Math.floor(currentHp));
    this.currentHp = Math.min(max, cur);
  }

  getCurrentHp(): number {
    return this.currentHp;
  }

  isDestroyed(): boolean {
    return this.currentHp <= 0;
  }

  applyDamage(amount: number): void {
    if (amount <= 0 || this.isDestroyed()) return;
    this.currentHp = Math.max(0, this.currentHp - Math.floor(amount));
  }

  /** Heal without exceeding max (prep rewards / upgrades). */
  heal(amount: number): void {
    if (amount <= 0 || this.isDestroyed()) return;
    this.currentHp = Math.min(this.maxHp, this.currentHp + Math.floor(amount));
  }
}
