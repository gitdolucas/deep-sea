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
          [4, 0],
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

  it("can place other defense types at their L1 shell cost", () => {
    const doc = combatMap();
    doc.defenses = [];
    const session = new GameSession(doc);
    expect(session.tryPurchaseDefenseL1("bubble_shotgun", "b1", [2, 2])).toBe(
      true,
    );
    expect(session.economy.getShells()).toBe(50 - 28);
    const d = session.map.getDefenses()[0];
    expect(d?.type).toBe("bubble_shotgun");
    expect(d?.level).toBe(1);
  });

  it("bubble shotgun does not spawn projectiles when no enemy is in attack range", () => {
    const doc = combatMap();
    doc.spawnPoints = [{ id: "far", position: [10, 0], pathIds: ["p_far"] }];
    doc.paths = [
      {
        id: "p_far",
        waypoints: [
          [10, 0],
          [10, 7],
          [4, 7],
        ],
      },
    ];
    doc.defenses = [
      {
        id: "bub",
        type: "bubble_shotgun",
        position: [2, 2],
        level: 1,
        targetMode: "first",
      },
    ];
    doc.waves = [
      {
        wave: 1,
        prepTime: 0,
        isBoss: false,
        groups: [
          {
            enemyType: "stoneclaw",
            count: 1,
            spawnId: "far",
            pathId: "p_far",
            interval: 0,
            delay: 0,
            hpMultiplier: 1,
            speedMultiplier: 0,
          },
        ],
      },
    ];
    const session = new GameSession(doc);
    session.tick(0.01);
    expect(session.getLivingEnemyCount()).toBe(1);
    for (let i = 0; i < 30; i++) session.tick(0.2);
    expect(session.getBubbleProjectiles().length).toBe(0);
  });

  it("exposes per-defense cooldown remaining for UI", () => {
    const doc = combatMap();
    doc.defenses = [
      {
        id: "d_arc",
        type: "arc_spine",
        position: [2, 2],
        level: 1,
        targetMode: "first",
      },
    ];
    const session = new GameSession(doc);
    expect(session.getDefenseCooldownRemaining("d_arc")).toBe(0);
    session.tick(0.05);
    const r = session.getDefenseCooldownRemaining("d_arc");
    expect(r).toBeGreaterThan(1.4);
    expect(r).toBeLessThanOrEqual(1.5);
  });

  it("does not start defense cooldown until an attack actually fires", () => {
    const doc = combatMap();
    doc.waves = [
      {
        wave: 1,
        prepTime: 60,
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
    ];
    doc.defenses = [
      {
        id: "d_arc",
        type: "arc_spine",
        position: [2, 2],
        level: 1,
        targetMode: "first",
      },
    ];
    const session = new GameSession(doc);
    for (let i = 0; i < 20; i++) session.tick(0.1);
    expect(session.getLivingEnemyCount()).toBe(0);
    expect(session.getDefenseCooldownRemaining("d_arc")).toBe(0);
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
