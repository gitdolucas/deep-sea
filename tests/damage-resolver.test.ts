import { describe, expect, it } from "vitest";
import { damageAfterArmorEffective } from "../src/game/combat-damage.js";
import {
  DamageResolver,
  KILL_SHELL_REWARD,
  attackRangeTiles,
  primaryDamageFor,
} from "../src/game/damage-resolver.js";
import type { KillShellPop } from "../src/game/kill-shell-pop.js";
import { EconomyController } from "../src/game/economy-controller.js";
import { EnemyController } from "../src/game/enemy-controller.js";
import {
  ENEMY_BASE_MAX_HP,
  ENEMY_GLOBAL_STRENGTH_MULT,
} from "../src/game/enemy-stats.js";

describe("DamageResolver", () => {
  it("primaryDamageFor scales by level", () => {
    expect(primaryDamageFor("arc_spine", 1)).toBe(12);
    expect(primaryDamageFor("arc_spine", 3)).toBe(18);
    expect(primaryDamageFor("bubble_shotgun", 1)).toBe(25);
    expect(primaryDamageFor("bubble_shotgun", 3)).toBe(35);
    expect(primaryDamageFor("tideheart_laser", 1)).toBe(2);
    expect(primaryDamageFor("tideheart_laser", 2)).toBe(3);
    expect(primaryDamageFor("tideheart_laser", 3)).toBe(3);
  });

  it("uses finite attack range per defense (Arc Spine +25%: L1 3.75 / L2+ 5)", () => {
    expect(attackRangeTiles("arc_spine", 1)).toBe(3.75);
    expect(attackRangeTiles("arc_spine", 2)).toBe(5);
    expect(attackRangeTiles("arc_spine", 3)).toBe(5);
    expect(attackRangeTiles("tideheart_laser", 1)).toBe(5);
    expect(attackRangeTiles("bubble_shotgun", 1)).toBe(4);
  });

  it("Arc Spine L1 kills scaled Stoneclaw in four primary hits (~3.5× effective damage to 36 HP)", () => {
    const maxHp = Math.floor(
      ENEMY_BASE_MAX_HP.stoneclaw * ENEMY_GLOBAL_STRENGTH_MULT,
    );
    const crab = new EnemyController({
      id: "c",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints: [
        [0, 0],
        [1, 0],
      ],
      pathProgress: 0,
      hp: maxHp,
      maxHp,
      speedMultiplier: 1,
    });
    const raw = primaryDamageFor("arc_spine", 1);
    let hits = 0;
    while (crab.isAlive()) {
      crab.applyDamage(damageAfterArmorEffective(crab, raw));
      hits += 1;
    }
    expect(maxHp).toBe(36);
    expect(hits).toBe(4);
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

    let pops = 0;
    const killShells: KillShellPop[] = [];
    DamageResolver.resolveTowerAttack(
      {
        id: "d",
        type: "arc_spine",
        position: [0, 0],
        level: 1,
        targetMode: "first",
      },
      {
        enemies,
        economy,
        targeting: { castlePosition: [4, 7] },
        onDefensePop: (_id, n) => {
          pops += n;
        },
        onKillShell: (k) => {
          killShells.push(k);
        },
      },
    );
    expect(pops).toBe(1);

    expect(enemies.has("v")).toBe(false);
    expect(economy.getShells()).toBe(KILL_SHELL_REWARD);
    expect(killShells).toEqual([
      { gx: 0.5, gz: 0, shells: KILL_SHELL_REWARD },
    ]);
  });
});
