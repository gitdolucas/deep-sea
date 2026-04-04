import { describe, expect, it } from "vitest";
import { DefenseController } from "../src/game/defense-controller.js";
import { EnemyController } from "../src/game/enemy-controller.js";
import { TargetingSystem } from "../src/game/targeting-system.js";

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

  it("bubble aim uses in-range enemies when forward cone is empty (zig-zag paths)", () => {
    const tower = [2, 3] as const;
    const castle = [9, 11] as const;
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
    const aim = TargetingSystem.selectBubbleAimTile(
      tower,
      [e],
      9,
      { castlePosition: castle },
    );
    const p = e.getGridPosition();
    expect(aim[0]).toBeCloseTo(p[0], 5);
    expect(aim[1]).toBeCloseTo(p[1], 5);
  });
});
