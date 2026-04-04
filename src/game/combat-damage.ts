import type { EnemyController } from "./enemy-controller.js";

export function damageAfterArmorEffective(
  enemy: EnemyController,
  rawDamage: number,
): number {
  const armor = enemy.effectiveArmorValue();
  return Math.max(1, Math.floor(rawDamage) - armor);
}
