import { describe, expect, it } from "vitest";
import { applyAurasFromDefenses } from "../src/game/aura-system.js";
import { EnemyController } from "../src/game/enemy-controller.js";
import { GameSession } from "../src/game/game-session.js";
import type { MapDocument } from "../src/game/map-types.js";

describe("vibration zone aura vs map placements", () => {
  it("covers path cells slightly beyond integer radius (center distance > 3 tiles)", () => {
    /** Tower (2,2); position (5, 2.1) on segment (5,0)→(5,3): dist ≈ 3.002 > 3 but < 3.5. */
    const towerPos = [2, 2] as const;
    const p = 2.1 / 3;
    const enemy = new EnemyController({
      id: "e",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints: [
        [5, 0],
        [5, 3],
      ],
      pathProgress: p,
      hp: 50,
      maxHp: 50,
      speedMultiplier: 1,
    });
    const baseline = new EnemyController({
      id: "b",
      enemyType: "stoneclaw",
      pathId: "p",
      waypoints: [
        [5, 0],
        [5, 3],
      ],
      pathProgress: p,
      hp: 50,
      maxHp: 50,
      speedMultiplier: 1,
    });

    const vibeOnly = [
      {
        id: "vz",
        type: "vibration_zone" as const,
        position: towerPos,
        level: 1 as const,
        targetMode: "first" as const,
      },
    ];

    applyAurasFromDefenses(new Map([[enemy.id, enemy]]), vibeOnly, 0.016);
    applyAurasFromDefenses(new Map([[baseline.id, baseline]]), [], 0.016);
    enemy.tickMovement(0.5);
    baseline.tickMovement(0.5);
    expect(enemy.getPathProgress()).toBeLessThan(baseline.getPathProgress());
  });

  it("GameSession.tick applies vibration slow end-to-end (tight corridor map)", () => {
    const doc: MapDocument = {
      id: "vib_test",
      name: "vib_test",
      difficulty: "normal",
      gridSize: [8, 8],
      castle: { position: [4, 7], hp: 20, size: [1, 1] },
      spawnPoints: [{ id: "s1", position: [0, 0], pathIds: ["p1"] }],
      paths: [
        {
          id: "p1",
          waypoints: [
            [0, 0],
            [4, 0],
            [4, 7],
          ],
        },
      ],
      buildSlots: [{ position: [2, 2], type: "standard" }],
      defenses: [
        {
          id: "vz",
          type: "vibration_zone",
          position: [2, 2],
          level: 1,
          targetMode: "first",
        },
      ],
      waves: [
        {
          wave: 1,
          prepTime: 0,
          isBoss: false,
          groups: [
            {
              enemyType: "stoneclaw",
              count: 1,
              spawnId: "s1",
              pathId: "p1",
              interval: 0,
              delay: 0,
              hpMultiplier: 1,
              speedMultiplier: 1,
            },
          ],
        },
      ],
      decorations: [],
    };

    const noVibDoc: MapDocument = {
      ...doc,
      defenses: [],
    };

    const withVib = new GameSession(doc);
    const noVib = new GameSession(noVibDoc);
    withVib.tick(0.01);
    noVib.tick(0.01);
    for (let i = 0; i < 40; i++) {
      withVib.tick(0.1);
      noVib.tick(0.1);
    }
    const ev = [...withVib.getEnemies().values()].find((e) => e.isAlive());
    const bv = [...noVib.getEnemies().values()].find((e) => e.isAlive());
    expect(ev && bv).toBeTruthy();
    expect(ev!.getPathProgress()).toBeLessThan(bv!.getPathProgress());
  });
});
