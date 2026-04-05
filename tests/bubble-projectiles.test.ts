import { describe, expect, it } from "vitest";
import type { BubbleColumnFxEvent } from "../src/game/bubble-column-fx-events.js";
import {
  spawnBubbleVolley,
  tickBubbleProjectiles,
} from "../src/game/bubble-projectiles.js";
import { EnemyController } from "../src/game/enemy-controller.js";
import { EconomyController } from "../src/game/economy-controller.js";

describe("bubble projectiles", () => {
  it("spawns 3 / 5 / 7 bubbles per docs tier spread", () => {
    expect(spawnBubbleVolley([0, 0], [1, 0], 1).length).toBe(3);
    expect(spawnBubbleVolley([0, 0], [1, 0], 2).length).toBe(5);
    expect(spawnBubbleVolley([0, 0], [1, 0], 3).length).toBe(7);
  });

  it("emits pop FX when a bubble connects", () => {
    const stoneclaw = new EnemyController({
      id: "claw1",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints: [
        [0, 0],
        [10, 0],
      ],
      pathProgress: 0.1,
      hp: 40,
      maxHp: 40,
      speedMultiplier: 1,
    });
    const enemies = new Map([[stoneclaw.id, stoneclaw]]);
    const economy = new EconomyController({ shells: 0 });
    const pops: { gx: number; gz: number; splash: boolean }[] = [];
    const projs = spawnBubbleVolley([0, 0], [8, 0], 1);
    const columns: BubbleColumnFxEvent[] = [];
    tickBubbleProjectiles(projs, 0.45, enemies, economy, pops, columns);
    expect(pops.length).toBeGreaterThanOrEqual(1);
    expect(pops[0]).toMatchObject({ splash: false });
    expect(columns.length).toBeGreaterThanOrEqual(1);
    expect(columns[0]).toMatchObject({
      preset: "bubble_shotgun_impact",
      axis: "segment",
      splash: false,
    });
    expect(columns[0]!.to).toBeDefined();
  });

  it("hits Stoneclaw along the travel segment (no tunneling on large dt)", () => {
    /** On path x-axis at [1,0]; bubble flies from (0,0) toward +x. One big step skips past x=1 if we only test the endpoint. */
    const stoneclaw = new EnemyController({
      id: "claw1",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints: [
        [0, 0],
        [10, 0],
      ],
      pathProgress: 0.1,
      hp: 40,
      maxHp: 40,
      speedMultiplier: 1,
    });
    expect(stoneclaw.getGridPosition()[0]).toBeCloseTo(1, 5);

    const enemies = new Map([[stoneclaw.id, stoneclaw]]);
    const economy = new EconomyController({ shells: 0 });
    const projs = spawnBubbleVolley([0, 0], [8, 0], 1);
    const before = stoneclaw.hp;
    tickBubbleProjectiles(projs, 0.45, enemies, economy);
    expect(stoneclaw.hp).toBeLessThan(before);
  });
});
