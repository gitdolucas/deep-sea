import { describe, expect, it } from "vitest";
import { DefenseController } from "../src/game/defense-controller.js";
import { EnemyController } from "../src/game/enemy-controller.js";
import { TargetingSystem } from "../src/game/targeting-system.js";

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
      TargetingSystem.selectTarget(defense, [a, b], "first")?.id,
    ).toBe("b");
  });

  it("ignores targetMode: prefers path leader over spatially closer enemy", () => {
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
      TargetingSystem.selectTarget(defense, [pathLeader, spatiallyClose], "closest")
        ?.id,
    ).toBe("f");
  });
});
