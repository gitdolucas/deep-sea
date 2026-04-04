import { describe, expect, it } from "vitest";
import { EnemyController } from "../src/game/enemy-controller.js";
import { resolveCurrentCannonAttack } from "../src/game/damage-resolver.js";
import { EconomyController } from "../src/game/economy-controller.js";
import { damageAfterArmorEffective } from "../src/game/combat-damage.js";

function stoneclaw(over: Partial<ConstructorParameters<typeof EnemyController>[0]> = {}) {
  return new EnemyController({
    id: "e",
    enemyType: "stoneclaw",
    pathId: "p",
    waypoints: [
      [0, 0],
      [10, 0],
    ],
    pathProgress: 0.5,
    hp: 50,
    maxHp: 50,
    speedMultiplier: 1,
    ...over,
  });
}

describe("status effects (docs/combat.md §5)", () => {
  it("vibration slow reduces movement progress per second", () => {
    const a = stoneclaw();
    const b = stoneclaw({ id: "e2" });
    a.resetAuraForTick();
    b.resetAuraForTick();
    a.applyVibrationAura(0.2, false);
    a.postAuraTick(0);
    b.postAuraTick(0);
    a.tickMovement(1);
    b.tickMovement(1);
    expect(a.getPathProgress()).toBeLessThan(b.getPathProgress());
  });

  it("ink blind reduces citadel leak multiplier while in cloud", () => {
    const e = stoneclaw();
    e.resetAuraForTick();
    e.applyInkAura(0.7, 0);
    e.postAuraTick(0);
    expect(e.getCitadelLeakMultiplier()).toBe(0.7);
  });

  it("ink L3 armor shred increases damage taken (lower effective armor)", () => {
    const e = stoneclaw();
    e.resetAuraForTick();
    e.applyInkAura(0.3, 5);
    expect(e.effectiveArmorValue()).toBe(0);
    const raw = 4;
    expect(damageAfterArmorEffective(e, raw)).toBe(4);
  });

  it("current cannon knockback reduces path progress (non-colossus)", () => {
    const economy = new EconomyController({ shells: 0 });
    const e = stoneclaw({ pathProgress: 0.9 });
    const enemies = new Map([[e.id, e]]);
    const p = e.getPathProgress();
    resolveCurrentCannonAttack(
      {
        enemies,
        economy,
        targeting: { castlePosition: [10, 0] },
      },
      {
        id: "c",
        type: "current_cannon",
        position: [5, 0],
        level: 2,
        targetMode: "first",
      },
    );
    expect(e.getPathProgress()).toBeLessThan(p);
    expect(e.isAlive()).toBe(true);
  });

  it("abyssal colossus ignores cannon knockback", () => {
    const economy = new EconomyController({ shells: 0 });
    const e = new EnemyController({
      id: "boss",
      enemyType: "abyssal_colossus",
      pathId: "p",
      waypoints: [
        [0, 0],
        [10, 0],
      ],
      pathProgress: 0.9,
      hp: 500,
      maxHp: 500,
      speedMultiplier: 1,
    });
    const enemies = new Map([[e.id, e]]);
    const p = e.getPathProgress();
    resolveCurrentCannonAttack(
      {
        enemies,
        economy,
        targeting: { castlePosition: [10, 0] },
      },
      {
        id: "c",
        type: "current_cannon",
        position: [5, 0],
        level: 2,
        targetMode: "first",
      },
    );
    expect(e.getPathProgress()).toBe(p);
  });

  it("Arc L3 refresh burn adds tick charges", () => {
    const e = stoneclaw();
    e.refreshArcBurn();
    let ticks = 0;
    e.tickDamageOverTime(2.1, (_en, _amt) => {
      ticks += 1;
    });
    expect(ticks).toBeGreaterThan(0);
  });
});
