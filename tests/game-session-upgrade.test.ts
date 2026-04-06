import { describe, expect, it } from "vitest";
import { GameSession } from "../src/game/game-session.js";
import { buildCostL1 } from "../src/game/defense-build-costs.js";
import { DefenseController } from "../src/game/defense-controller.js";
import type { MapDocument } from "../src/game/map-types.js";

function mapWithDefense(): MapDocument {
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
    defenses: [
      {
        id: "d1",
        type: "arc_spine",
        position: [2, 2],
        level: 1,
        targetMode: "first",
      },
    ],
    waves: [
      {
        wave: 1,
        prepTime: 999,
        isBoss: false,
        groups: [],
      },
    ],
    decorations: [],
  };
}

describe("GameSession tryUpgradeDefense", () => {
  it("spends tiered shell costs and reaches L3", () => {
    const session = new GameSession(mapWithDefense(), { shells: 500 });
    const base = buildCostL1("arc_spine");
    const l1to2 =
      new DefenseController({
        id: "d1",
        type: "arc_spine",
        position: [2, 2],
        level: 1,
        targetMode: "first",
      }).upgradeShellCost(base)!;
    const l2to3 =
      new DefenseController({
        id: "d1",
        type: "arc_spine",
        position: [2, 2],
        level: 2,
        targetMode: "first",
      }).upgradeShellCost(base)!;

    const start = session.economy.getShells();
    expect(session.tryUpgradeDefense("d1")).toBe(true);
    expect(session.map.getDefenses()[0]!.level).toBe(2);
    expect(session.economy.getShells()).toBe(start - l1to2);

    expect(session.tryUpgradeDefense("d1")).toBe(true);
    expect(session.map.getDefenses()[0]!.level).toBe(3);
    expect(session.economy.getShells()).toBe(start - l1to2 - l2to3);

    expect(session.tryUpgradeDefense("d1")).toBe(false);
  });

  it("returns false when shells are insufficient", () => {
    const session = new GameSession(mapWithDefense(), { shells: 0 });
    expect(session.tryUpgradeDefense("d1")).toBe(false);
    expect(session.map.getDefenses()[0]!.level).toBe(1);
  });

  it("returns false after match end", () => {
    const doc = mapWithDefense();
    doc.waves = [];
    const session = new GameSession(doc, { shells: 500 });
    (session as unknown as { outcome: string }).outcome = "win";
    expect(session.tryUpgradeDefense("d1")).toBe(false);
  });
});
