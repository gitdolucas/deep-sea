import { describe, expect, it } from "vitest";
import {
  simulateCannonProjectiles,
  type CannonProjectileState,
} from "../src/game/cannon-projectiles.js";
import { EconomyController } from "../src/game/economy-controller.js";

const FADE_TEST_SEC = 0.32;

describe("cannon projectiles", () => {
  it("counts down fade after hit then removes the projectile", () => {
    const p: CannonProjectileState = {
      gx: 0,
      gz: 0,
      vgx: 1,
      vgz: 0,
      defenseId: "d1",
      targetEnemyId: "e1",
      level: 1,
      traveled: 1,
      timeAlive: 1,
      fadeOutRemaining: FADE_TEST_SEC,
    };
    const projectiles = [p];
    const ctx = {
      enemies: new Map(),
      economy: new EconomyController({ shells: 0 }),
      targeting: { castlePosition: [0, 0] as [number, number] },
    };
    simulateCannonProjectiles(
      projectiles,
      0.1,
      ctx,
      () => undefined,
      () => {},
    );
    expect(projectiles.length).toBe(1);
    expect(p.fadeOutRemaining).toBeCloseTo(FADE_TEST_SEC - 0.1, 5);
    simulateCannonProjectiles(
      projectiles,
      FADE_TEST_SEC,
      ctx,
      () => undefined,
      () => {},
    );
    expect(projectiles.length).toBe(0);
  });
});
