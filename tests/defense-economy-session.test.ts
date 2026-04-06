import { describe, expect, it } from "vitest";
import {
  downgradeRefundForLevel,
  salvageShellsForDefense,
  totalInvestedShells,
} from "../src/game/defense-economy.js";
import { GameSession } from "../src/game/game-session.js";
import { MapController } from "../src/game/map-controller.js";
import type { MapDocument } from "../src/game/map-types.js";

function mapWithDefense(
  level: 1 | 2 | 3,
  type: "arc_spine" = "arc_spine",
): MapDocument {
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
        type,
        position: [2, 2],
        level,
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

describe("defense-economy helpers", () => {
  it("totalInvestedShells matches L1 + upgrade steps (Arc Spine base 30)", () => {
    expect(totalInvestedShells("arc_spine", 1)).toBe(30);
    expect(totalInvestedShells("arc_spine", 2)).toBe(30 + 60);
    expect(totalInvestedShells("arc_spine", 3)).toBe(30 + 60 + 120);
  });

  it("salvageShellsForDefense is floor(50% invested)", () => {
    expect(
      salvageShellsForDefense({
        id: "d1",
        type: "arc_spine",
        position: [0, 0],
        level: 1,
        targetMode: "first",
      }),
    ).toBe(Math.floor(30 * 0.5));
    expect(
      salvageShellsForDefense({
        id: "d1",
        type: "arc_spine",
        position: [0, 0],
        level: 3,
        targetMode: "first",
      }),
    ).toBe(Math.floor((30 + 60 + 120) * 0.5));
  });

  it("downgradeRefundForLevel mirrors last upgrade payment", () => {
    expect(downgradeRefundForLevel("arc_spine", 1)).toBeNull();
    expect(downgradeRefundForLevel("arc_spine", 2)).toBe(60);
    expect(downgradeRefundForLevel("arc_spine", 3)).toBe(120);
  });
});

describe("MapController tryDecrementDefenseLevel", () => {
  it("steps 3→2→1 and stops at L1", () => {
    const m = new MapController(mapWithDefense(3));
    expect(m.tryDecrementDefenseLevel("d1")).toBe(true);
    expect(m.getDefenses()[0]!.level).toBe(2);
    expect(m.tryDecrementDefenseLevel("d1")).toBe(true);
    expect(m.getDefenses()[0]!.level).toBe(1);
    expect(m.tryDecrementDefenseLevel("d1")).toBe(false);
  });
});

describe("GameSession downgrade and salvage", () => {
  it("tryDowngradeDefense refunds tier payment and lowers level", () => {
    const session = new GameSession(mapWithDefense(3), { shells: 0 });
    const shellsBefore = session.economy.getShells();
    expect(session.tryDowngradeDefense("d1")).toBe(true);
    expect(session.map.getDefenses()[0]!.level).toBe(2);
    expect(session.economy.getShells()).toBe(shellsBefore + 120);

    expect(session.tryDowngradeDefense("d1")).toBe(true);
    expect(session.map.getDefenses()[0]!.level).toBe(1);
    expect(session.economy.getShells()).toBe(shellsBefore + 120 + 60);

    expect(session.tryDowngradeDefense("d1")).toBe(false);
  });

  it("trySalvageDefense removes tower and refunds half invested", () => {
    const session = new GameSession(mapWithDefense(2), { shells: 0 });
    const salvage = Math.floor(totalInvestedShells("arc_spine", 2) * 0.5);
    expect(session.trySalvageDefense("d1")).toBe(true);
    expect(session.map.getDefenses()).toHaveLength(0);
    expect(session.economy.getShells()).toBe(salvage);
    expect(session.trySalvageDefense("d1")).toBe(false);
  });
});

describe("MapController tryMoveDefenseTo", () => {
  it("moves to empty legal cell and rejects path or occupation", () => {
    const m = new MapController(mapWithDefense(1));
    expect(m.tryMoveDefenseTo("d1", [3, 2])).toBe(true);
    expect(m.getDefenses()[0]!.position).toEqual([3, 2]);
    expect(m.tryMoveDefenseTo("d1", [3, 2])).toBe(false);
    expect(m.tryMoveDefenseTo("d1", [4, 2])).toBe(false);
  });
});

describe("GameSession tryMoveDefenseStep", () => {
  it("steps on grid and blocks invalid cells", () => {
    const session = new GameSession(mapWithDefense(1), { shells: 0 });
    expect(session.tryMoveDefenseStep("d1", "right")).toBe(true);
    expect(session.map.getDefenses()[0]!.position).toEqual([3, 2]);
    expect(session.tryMoveDefenseStep("d1", "left")).toBe(true);
    expect(session.map.getDefenses()[0]!.position).toEqual([2, 2]);
    expect(session.tryMoveDefenseStep("nope", "up")).toBe(false);
  });

  it("cannot move onto path tile", () => {
    const doc: MapDocument = {
      id: "mv",
      name: "mv",
      difficulty: "normal",
      gridSize: [5, 5],
      castle: { position: [2, 4], hp: 20, size: [1, 1] },
      spawnPoints: [{ id: "s1", position: [0, 0], pathIds: ["p1"] }],
      paths: [
        {
          id: "p1",
          waypoints: [
            [0, 0],
            [4, 0],
          ],
        },
      ],
      defenses: [
        {
          id: "t",
          type: "arc_spine",
          position: [2, 1],
          level: 1,
          targetMode: "first",
        },
      ],
      waves: [
        {
          wave: 1,
          prepTime: 99,
          isBoss: false,
          groups: [],
        },
      ],
      decorations: [],
    };
    const session = new GameSession(doc, { shells: 0 });
    expect(session.tryMoveDefenseStep("t", "up")).toBe(false);
  });
});
