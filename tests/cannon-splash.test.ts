import { describe, expect, it } from "vitest";
import { EnemyController } from "../src/game/enemy-controller.js";
import { applyCurrentCannonImpact } from "../src/game/damage-resolver.js";
import { EconomyController } from "../src/game/economy-controller.js";
import { CANNON_SPLASH_DAMAGE_FRAC } from "../src/game/combat-balance.js";
import { damageAfterArmorEffective } from "../src/game/combat-damage.js";

describe("Current Cannon splash", () => {
  it("damages a secondary enemy within splash radius of the primary", () => {
    const primary = new EnemyController({
      id: "p",
      enemyType: "stoneclaw",
      pathId: "p1",
      waypoints: [
        [5, 0],
        [6, 0],
      ],
      pathProgress: 0,
      hp: 80,
      maxHp: 80,
      speedMultiplier: 1,
    });
    const neighbor = new EnemyController({
      id: "n",
      enemyType: "stoneclaw",
      pathId: "p2",
      waypoints: [
        [6, 0],
        [7, 0],
      ],
      pathProgress: 0,
      hp: 80,
      maxHp: 80,
      speedMultiplier: 1,
    });
    expect(primary.getGridPosition()).toEqual([5, 0]);
    expect(neighbor.getGridPosition()).toEqual([6, 0]);

    const hpBeforeP = primary.hp;
    const hpBeforeN = neighbor.hp;
    const economy = new EconomyController({ shells: 0 });
    const enemies = new Map([
      [primary.id, primary],
      [neighbor.id, neighbor],
    ]);

    const res = applyCurrentCannonImpact(
      {
        enemies,
        economy,
        targeting: { castlePosition: [10, 0] },
      },
      {
        id: "cannon_1",
        type: "current_cannon",
        position: [2, 0],
        level: 2,
        targetMode: "first",
      },
      primary.id,
    );

    expect(res).not.toBeNull();
    expect(res!.cannonBlast).toBeDefined();
    expect(res!.chainLightningVfx).toBe(false);
    expect(primary.hp).toBeLessThan(hpBeforeP);
    expect(neighbor.hp).toBeLessThan(hpBeforeN);

    const splashRaw = Math.floor(19 * CANNON_SPLASH_DAMAGE_FRAC);
    const expectedSplash = damageAfterArmorEffective(neighbor, splashRaw);
    expect(neighbor.hp).toBe(hpBeforeN - expectedSplash);
  });
});
