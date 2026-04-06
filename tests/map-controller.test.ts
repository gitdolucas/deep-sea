import { describe, expect, it } from "vitest";
import { MapController } from "../src/game/map-controller.js";
import type { MapDocument } from "../src/game/map-types.js";
import type { GridPos } from "../src/game/types.js";

interface MapControllerPrivate {
  posKeyFromGrid(pos: GridPos): string;
  positionsEqual(a: GridPos, b: GridPos): boolean;
}

function priv(m: MapController): MapControllerPrivate {
  return m as unknown as MapControllerPrivate;
}

function minimalMap(overrides: Partial<MapDocument> = {}): MapDocument {
  const base: MapDocument = {
    id: "test",
    name: "Test",
    difficulty: "normal",
    gridSize: [4, 4],
    castle: { position: [2, 3], hp: 20, size: [1, 1] },
    spawnPoints: [
      { id: "s1", position: [0, 0], pathIds: ["p1"] },
    ],
    paths: [
      {
        id: "p1",
        waypoints: [
          [0, 0],
          [2, 0],
          [2, 3],
        ],
      },
    ],
    defenses: [],
    waves: [
      {
        wave: 1,
        prepTime: 10,
        isBoss: false,
        groups: [
          {
            enemyType: "stoneclaw",
            count: 1,
            spawnId: "s1",
            pathId: "p1",
            interval: 1,
            delay: 0,
            hpMultiplier: 1,
            speedMultiplier: 1,
          },
        ],
      },
    ],
    decorations: [],
  };
  return { ...base, ...overrides };
}

describe("MapController", () => {
  describe("private helpers (white-box)", () => {
    it("posKeyFromGrid is stable string key", () => {
      const m = new MapController(minimalMap());
      expect(priv(m).posKeyFromGrid([1, 2])).toBe("1,2");
    });

    it("positionsEqual compares grid coordinates", () => {
      const m = new MapController(minimalMap());
      const p = priv(m);
      expect(p.positionsEqual([1, 1], [1, 1])).toBe(true);
      expect(p.positionsEqual([1, 1], [1, 2])).toBe(false);
    });
  });

  describe("layout queries", () => {
    it("getPathWaypoints returns path polyline", () => {
      const m = new MapController(minimalMap());
      expect(m.getPathWaypoints("p1")).toEqual([
        [0, 0],
        [2, 0],
        [2, 3],
      ]);
      expect(m.getPathWaypoints("missing")).toBeUndefined();
    });

    it("positionInBounds respects gridSize", () => {
      const m = new MapController(minimalMap());
      expect(m.positionInBounds([0, 0])).toBe(true);
      expect(m.positionInBounds([3, 3])).toBe(true);
      expect(m.positionInBounds([4, 0])).toBe(false);
      expect(m.positionInBounds([-1, 0])).toBe(false);
    });

    it("isLegalTowerTile is true for in-bounds sand (off path, citadel, decoration)", () => {
      const m = new MapController(minimalMap());
      expect(m.isLegalTowerTile([1, 1])).toBe(true);
      expect(m.isLegalTowerTile([3, 0])).toBe(true);
      expect(m.isLegalTowerTile([0, 0])).toBe(false);
      expect(m.isLegalTowerTile([2, 1])).toBe(false);
    });

    it("isLegalTowerTile is false on citadel footprint", () => {
      const m = new MapController(minimalMap());
      expect(m.isLegalTowerTile([2, 3])).toBe(false);
    });

    it("isLegalTowerTile is false on decoration tiles (docs/map-schema.md)", () => {
      const m = new MapController(
        minimalMap({
          decorations: [
            {
              type: "rock_small",
              position: [3, 0, 3],
              rotation: 0,
              scale: 1,
            },
          ],
        }),
      );
      expect(m.isLegalTowerTile([3, 3])).toBe(false);
      expect(m.isLegalTowerTile([1, 1])).toBe(true);
    });

    it("decoration occupancy uses floor(x) and floor(z) for non-integer coords", () => {
      const m = new MapController(
        minimalMap({
          decorations: [
            {
              type: "rock_small",
              position: [1.9, 0, 1.1],
              rotation: 0,
              scale: 1,
            },
          ],
        }),
      );
      expect(m.isLegalTowerTile([1, 1])).toBe(false);
    });
  });

  describe("defenses", () => {
    it("placeDefense requires a free legal tile", () => {
      const m = new MapController(minimalMap());
      const tower = {
        id: "d1",
        type: "arc_spine" as const,
        position: [1, 1] as GridPos,
        level: 1 as const,
        targetMode: "first" as const,
      };
      expect(m.placeDefense(tower)).toBe(true);
      expect(m.getDefenses()).toHaveLength(1);
      expect(m.placeDefense({ ...tower, id: "d2" })).toBe(false);
    });

    it("placeDefense rejects on-path cells", () => {
      const m = new MapController(minimalMap());
      expect(
        m.placeDefense({
          id: "d1",
          type: "arc_spine",
          position: [0, 0],
          level: 1,
          targetMode: "first",
        }),
      ).toBe(false);
    });

    it("placeDefense rejects citadel tiles", () => {
      const m = new MapController(minimalMap());
      expect(
        m.placeDefense({
          id: "d1",
          type: "arc_spine",
          position: [2, 3],
          level: 1,
          targetMode: "first",
        }),
      ).toBe(false);
    });

    it("placeDefense rejects decoration tiles", () => {
      const m = new MapController(
        minimalMap({
          decorations: [
            {
              type: "kelp_cluster",
              position: [1, 0, 1],
              rotation: 0,
              scale: 1,
            },
          ],
        }),
      );
      expect(
        m.placeDefense({
          id: "d1",
          type: "arc_spine",
          position: [1, 1],
          level: 1,
          targetMode: "first",
        }),
      ).toBe(false);
    });

    it("removeDefense returns false when missing", () => {
      const m = new MapController(minimalMap());
      expect(m.removeDefense("nope")).toBe(false);
    });

    it("tryIncrementDefenseLevel bumps tier up to L3", () => {
      const m = new MapController(minimalMap());
      m.placeDefense({
        id: "d1",
        type: "bubble_shotgun",
        position: [1, 1],
        level: 1,
        targetMode: "closest",
      });
      expect(m.tryIncrementDefenseLevel("d1")).toBe(true);
      expect(m.getDefenses()[0]!.level).toBe(2);
      expect(m.tryIncrementDefenseLevel("d1")).toBe(true);
      expect(m.getDefenses()[0]!.level).toBe(3);
      expect(m.tryIncrementDefenseLevel("d1")).toBe(false);
      expect(m.tryIncrementDefenseLevel("missing")).toBe(false);
    });

    it("snapshotDefenses clones so callers cannot mutate internal array", () => {
      const m = new MapController(minimalMap());
      m.placeDefense({
        id: "d1",
        type: "arc_spine",
        position: [1, 1],
        level: 1,
        targetMode: "first",
      });
      const snap = m.snapshotDefenses();
      snap[0]!.position = [9, 9];
      expect(m.getDefenses()[0]!.position).toEqual([1, 1]);
    });

    it("trySetDefenseTargetMode updates in-place", () => {
      const m = new MapController(minimalMap());
      m.placeDefense({
        id: "d1",
        type: "arc_spine",
        position: [1, 1],
        level: 1,
        targetMode: "first",
      });
      expect(m.trySetDefenseTargetMode("d1", "closest")).toBe(true);
      expect(m.getDefenses()[0]!.targetMode).toBe("closest");
      expect(m.trySetDefenseTargetMode("missing", "last")).toBe(false);
    });
  });

  describe("minimal map fixture", () => {
    it("resolves paths, spawns, and waves", () => {
      const m = new MapController(minimalMap());

      expect(m.id).toBe("test");
      expect(m.getSpawnPoint("s1")?.pathIds).toEqual(["p1"]);
      expect(m.getPathWaypoints("p1")?.[0]).toEqual([0, 0]);
      expect(m.getWaveIndex(1)).toBe(0);
      expect(m.getDecorations().length).toBe(0);
    });
  });
});
