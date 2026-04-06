import { describe, expect, it } from "vitest";
import { MapController } from "../src/game/map-controller.js";
import { WaveDirector } from "../src/game/wave-director.js";
import type { MapDocument } from "../src/game/map-types.js";
import type { EnemyController } from "../src/game/enemy-controller.js";

function sessionMap(): MapDocument {
  return {
    id: "t",
    name: "t",
    difficulty: "normal",
    gridSize: [6, 6],
    castle: { position: [3, 5], hp: 20, size: [1, 1] },
    spawnPoints: [{ id: "s1", position: [0, 0], pathIds: ["p1"] }],
    paths: [
      { id: "p1", waypoints: [
        [0, 0],
        [3, 5],
      ] },
    ],
    defenses: [],
    waves: [
      {
        wave: 1,
        prepTime: 2,
        isBoss: false,
        groups: [
          {
            enemyType: "stoneclaw",
            count: 2,
            spawnId: "s1",
            pathId: "p1",
            interval: 1,
            delay: 0.5,
            hpMultiplier: 1,
            speedMultiplier: 1,
          },
        ],
      },
      {
        wave: 2,
        prepTime: 1,
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
}

describe("WaveDirector", () => {
  it("runs prep then spawns with delay and interval", () => {
    const map = new MapController(sessionMap());
    const spawned: EnemyController[] = [];
    let id = 0;
    const wd = new WaveDirector(map, {
      spawnEnemy: (e) => spawned.push(e),
      assignEnemyId: () => `e_${++id}`,
    });

    expect(wd.getPhase()).toBe("prep");
    expect(wd.getPrepRemaining()).toBe(2);

    wd.tick(2);
    expect(wd.getPhase()).toBe("active");
    expect(spawned).toHaveLength(0);

    wd.tick(0.5);
    expect(spawned).toHaveLength(1);

    wd.tick(0.5);
    expect(spawned).toHaveLength(1);

    wd.tick(0.6);
    expect(spawned).toHaveLength(2);
    expect(wd.isWaveSpawnComplete()).toBe(true);
  });

  it("advances to next prep when wave is clear", () => {
    const map = new MapController(sessionMap());
    const wd = new WaveDirector(map, {
      spawnEnemy: () => {},
      assignEnemyId: () => "x",
    });

    wd.tick(2);
    wd.tick(10);
    expect(wd.isWaveSpawnComplete()).toBe(true);
    wd.tryAdvanceWaveIfCleared(0);
    expect(wd.getWaveIndex()).toBe(1);
    expect(wd.getPhase()).toBe("prep");
  });

  it("marks completed after final wave clear", () => {
    const map = new MapController(sessionMap());
    const wd = new WaveDirector(map, {
      spawnEnemy: () => {},
      assignEnemyId: () => "x",
    });

    wd.tick(2);
    wd.tick(10);
    wd.tryAdvanceWaveIfCleared(0);
    wd.tick(1);
    wd.tick(10);
    wd.tryAdvanceWaveIfCleared(0);
    expect(wd.getPhase()).toBe("completed");
  });
});
