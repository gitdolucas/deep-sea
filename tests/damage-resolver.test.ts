import { describe, expect, it } from "vitest";
import { DamageResolver, primaryDamageFor } from "../src/game/damage-resolver.js";
import { EconomyController } from "../src/game/economy-controller.js";
import { EnemyController } from "../src/game/enemy-controller.js";

describe("DamageResolver", () => {
  it("primaryDamageFor scales by level", () => {
    expect(primaryDamageFor("arc_spine", 1)).toBe(5);
    expect(primaryDamageFor("arc_spine", 3)).toBe(11);
  });

  it("kills grant shells and remove enemy", () => {
    const enemies = new Map<string, EnemyController>();
    const economy = new EconomyController({ shells: 0 });
    const victim = new EnemyController({
      id: "v",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints: [
        [0, 0],
        [1, 0],
      ],
      pathProgress: 0.5,
      hp: 6,
      maxHp: 12,
      speedMultiplier: 1,
    });
    enemies.set("v", victim);

    DamageResolver.resolveTowerAttack(enemies, economy, {
      id: "d",
      type: "tideheart_laser",
      position: [0, 0],
      level: 1,
      targetMode: "first",
    });

    expect(enemies.has("v")).toBe(false);
    expect(economy.getShells()).toBeGreaterThan(0);
  });
});
