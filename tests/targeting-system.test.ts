import { describe, expect, it } from "vitest";
import { DefenseController } from "../src/game/defense-controller.js";
import { EnemyController } from "../src/game/enemy-controller.js";
import type { TargetMode } from "../src/game/types.js";
import {
  TargetingSystem,
  cycleTargetMode,
  TARGET_MODE_CYCLE_ORDER,
} from "../src/game/targeting-system.js";

const ctx = { castlePosition: [10, 0] as const };

function enemy(
  id: string,
  progress: number,
  hp: number,
): EnemyController {
  return new EnemyController({
    id,
    enemyType: "stoneclaw",
    pathId: "p",
    waypoints: [
      [0, 0],
      [10, 0],
    ],
    pathProgress: progress,
    hp,
    maxHp: hp,
    speedMultiplier: 1,
  });
}

describe("TargetingSystem", () => {
  it("cycleTargetMode walks the full ring", () => {
    let m: TargetMode = "closest";
    for (let i = 0; i < TARGET_MODE_CYCLE_ORDER.length; i++) {
      m = cycleTargetMode(m);
    }
    expect(m).toBe("closest");
    expect(cycleTargetMode("first")).toBe("last");
  });

  it("first targets furthest along the path", () => {
    const defense = new DefenseController({
      id: "d",
      type: "arc_spine",
      position: [5, 0],
      level: 1,
      targetMode: "first",
    });
    const a = enemy("a", 0.2, 10);
    const b = enemy("b", 0.8, 10);
    expect(
      TargetingSystem.selectTarget(defense, [a, b], "first", undefined, ctx)
        ?.id,
    ).toBe("b");
  });

  it("closest targets enemy nearest the tower", () => {
    const defense = new DefenseController({
      id: "d",
      type: "arc_spine",
      position: [0, 0],
      level: 1,
      targetMode: "closest",
    });
    const spatiallyClose = new EnemyController({
      id: "n",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints: [
        [1, 0],
        [2, 0],
      ],
      pathProgress: 0.1,
      hp: 5,
      maxHp: 5,
      speedMultiplier: 1,
    });
    const pathLeader = new EnemyController({
      id: "f",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints: [
        [8, 0],
        [10, 0],
      ],
      pathProgress: 0.95,
      hp: 5,
      maxHp: 5,
      speedMultiplier: 1,
    });
    expect(
      TargetingSystem.selectTarget(
        defense,
        [pathLeader, spatiallyClose],
        "closest",
        undefined,
        ctx,
      )?.id,
    ).toBe("n");
  });

  it("bubble shotgun aim uses selectTarget tile (single in-range enemy, zig-zag path)", () => {
    const castleCtx = { castlePosition: [9, 11] as const };
    const defense = new DefenseController({
      id: "bub",
      type: "bubble_shotgun",
      position: [2, 3],
      level: 1,
      targetMode: "first",
    });
    const e = new EnemyController({
      id: "side",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints: [
        [3, 0],
        [9, 11],
      ],
      pathProgress: 0,
      hp: 10,
      maxHp: 10,
      speedMultiplier: 1,
    });
    const target = TargetingSystem.selectTarget(
      defense,
      [e],
      defense.targetMode,
      { maxAttackRangeTiles: 9 },
      castleCtx,
    );
    const aim = target!.getGridPosition();
    const p = e.getGridPosition();
    expect(aim[0]).toBeCloseTo(p[0], 5);
    expect(aim[1]).toBeCloseTo(p[1], 5);
  });

  it("bubble shotgun aim follows first target, not centroid of pack", () => {
    const defense = new DefenseController({
      id: "bub",
      type: "bubble_shotgun",
      position: [5, 5],
      level: 1,
      targetMode: "first",
    });
    const waypoints: [number, number][] = [
      [5, 4],
      [5, 10],
    ];
    const trailer = new EnemyController({
      id: "trail",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints,
      pathProgress: 0.15,
      hp: 10,
      maxHp: 10,
      speedMultiplier: 1,
    });
    const leader = new EnemyController({
      id: "lead",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints,
      pathProgress: 0.85,
      hp: 10,
      maxHp: 10,
      speedMultiplier: 1,
    });
    const target = TargetingSystem.selectTarget(
      defense,
      [trailer, leader],
      defense.targetMode,
      { maxAttackRangeTiles: 9 },
      ctx,
    );
    expect(target?.id).toBe("lead");
    const aim = target!.getGridPosition();
    const leaderPos = leader.getGridPosition();
    expect(aim[0]).toBeCloseTo(leaderPos[0], 5);
    expect(aim[1]).toBeCloseTo(leaderPos[1], 5);
    const centroidX = (trailer.getGridPosition()[0] + leaderPos[0]) / 2;
    const centroidZ = (trailer.getGridPosition()[1] + leaderPos[1]) / 2;
    expect(Math.abs(aim[0] - centroidX) + Math.abs(aim[1] - centroidZ)).toBeGreaterThan(
      0.05,
    );
  });
});
