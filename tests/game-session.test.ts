import { describe, expect, it } from "vitest";
import { GameSession } from "../src/game/game-session.js";
import type { MapDocument } from "../src/game/map-types.js";

function combatMap(): MapDocument {
  return {
    id: "t",
    name: "t",
    difficulty: "normal",
    gridSize: [8, 8],
    castle: { position: [4, 7], hp: 20, size: [1, 1] },
    spawnPoints: [{ id: "s1", position: [0, 0], pathIds: ["p1"] }],
    paths: [
      {
        id: "p1",
        waypoints: [
          [0, 0],
          [4, 7],
        ],
      },
    ],
    buildSlots: [{ position: [2, 2], type: "standard" }],
    defenses: [
      {
        id: "d1",
        type: "tideheart_laser",
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
            speedMultiplier: 0.05,
          },
        ],
      },
    ],
    decorations: [],
  };
}

describe("GameSession", () => {
  it("runs wave spawn, tower damage, and wave advance", () => {
    const session = new GameSession(combatMap());

    expect(session.waveDirector.getPhase()).toBe("prep");
    session.tick(0.01);
    expect(session.waveDirector.getPhase()).toBe("active");
    expect(session.getLivingEnemyCount()).toBe(1);

    for (let i = 0; i < 80 && session.getLivingEnemyCount() > 0; i++) {
      session.tick(0.15);
    }

    expect(session.getLivingEnemyCount()).toBe(0);
    expect(session.castle.maxHp).toBe(20);
    expect(session.waveDirector.getPhase()).toBe("completed");
    expect(session.getOutcome()).toBe("win");
    expect(session.economy.getShells()).toBeGreaterThan(0);
  });

  it("starts with MVP shells and can place Arc Spine L1", () => {
    const doc = combatMap();
    doc.defenses = [];
    const session = new GameSession(doc);
    expect(session.economy.getShells()).toBe(50);
    expect(session.tryPurchaseArcSpineL1("t1", [2, 2])).toBe(true);
    expect(session.economy.getShells()).toBe(20);
    expect(session.map.getDefenses()).toHaveLength(1);
  });

  it("applies leak damage when an enemy finishes the path", () => {
    const doc = combatMap();
    doc.defenses = [];
    doc.waves = [
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
            speedMultiplier: 40,
          },
        ],
      },
    ];
    const session = new GameSession(doc);
    session.tick(0.01);
    for (let i = 0; i < 50 && session.getLivingEnemyCount() > 0; i++) {
      session.tick(0.05);
    }
    expect(session.getLivingEnemyCount()).toBe(0);
    expect(session.castle.getCurrentHp()).toBeLessThan(session.castle.maxHp);
  });
});
