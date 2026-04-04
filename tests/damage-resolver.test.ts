import { describe, expect, it } from "vitest";
import {
  DamageResolver,
  attackRangeTiles,
  primaryDamageFor,
} from "../src/game/damage-resolver.js";
import { EconomyController } from "../src/game/economy-controller.js";
import { EnemyController } from "../src/game/enemy-controller.js";

describe("DamageResolver", () => {
  it("primaryDamageFor scales by level", () => {
    expect(primaryDamageFor("arc_spine", 1)).toBe(8);
    expect(primaryDamageFor("arc_spine", 3)).toBe(12);
    expect(primaryDamageFor("bubble_shotgun", 1)).toBe(25);
    expect(primaryDamageFor("bubble_shotgun", 3)).toBe(35);
  });

  it("uses finite attack range per defense (Arc Spine L1 = 3 tiles per PRD)", () => {
    expect(attackRangeTiles("arc_spine", 1)).toBe(3);
    expect(attackRangeTiles("arc_spine", 2)).toBe(4);
    expect(attackRangeTiles("tideheart_laser", 1)).toBe(5);
    expect(attackRangeTiles("bubble_shotgun", 1)).toBe(4);
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
      hp: 4,
      maxHp: 12,
      speedMultiplier: 1,
    });
    enemies.set("v", victim);

    DamageResolver.resolveTowerAttack(
      enemies,
      economy,
      {
        id: "d",
        type: "arc_spine",
        position: [0, 0],
        level: 1,
        targetMode: "first",
      },
      { castlePosition: [4, 7] },
    );

    expect(enemies.has("v")).toBe(false);
    expect(economy.getShells()).toBeGreaterThan(0);
  });
});
