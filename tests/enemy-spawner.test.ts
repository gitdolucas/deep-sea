import { describe, expect, it } from "vitest";
import { MapController } from "../src/game/map-controller.js";
import { spawnEnemyFromWaveGroup } from "../src/game/enemy-spawner.js";
import type { MapDocument } from "../src/game/map-types.js";

function tinyMap(): MapDocument {
  return {
    id: "t",
    name: "t",
    difficulty: "normal",
    gridSize: [6, 6],
    castle: { position: [3, 5], hp: 20, size: [1, 1] },
    spawnPoints: [{ id: "s1", position: [0, 0], pathIds: ["p1"] }],
    paths: [
      {
        id: "p1",
        waypoints: [
          [0, 0],
          [3, 5],
        ],
      },
    ],
    defenses: [],
    waves: [],
    decorations: [],
  };
}

describe("spawnEnemyFromWaveGroup", () => {
  it("returns null when path or spawn is invalid", () => {
    const map = new MapController(tinyMap());
    const bad = spawnEnemyFromWaveGroup(
      {
        enemyType: "stoneclaw",
        count: 1,
        spawnId: "missing",
        pathId: "p1",
        interval: 0,
        delay: 0,
        hpMultiplier: 1,
        speedMultiplier: 1,
      },
      map,
      "e1",
    );
    expect(bad).toBeNull();
  });

  it("creates enemy at path start with scaled HP", () => {
    const map = new MapController(tinyMap());
    const e = spawnEnemyFromWaveGroup(
      {
        enemyType: "stoneclaw",
        count: 1,
        spawnId: "s1",
        pathId: "p1",
        interval: 0,
        delay: 0,
        hpMultiplier: 2,
        speedMultiplier: 1,
      },
      map,
      "e1",
    );
    expect(e).not.toBeNull();
    expect(e!.maxHp).toBe(72);
    expect(e!.getPathProgress()).toBe(0);
  });
});
