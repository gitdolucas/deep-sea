import { describe, expect, it } from "vitest";
import {
  arcSpineChainSearchRadius,
  DefenseController,
} from "../src/game/defense-controller.js";
import type { ChainEnemyRef } from "../src/game/defense-controller.js";
import type { GridPos } from "../src/game/types.js";

interface DefenseControllerPrivate {
  maxArcJumps(): number;
  arcSearchRadius(): number;
  pickNearestWithinRadius(
    origin: GridPos,
    enemies: ReadonlyArray<ChainEnemyRef>,
    used: ReadonlySet<string>,
    radiusSq: number,
  ): string | null;
  distanceSquared(a: GridPos, b: GridPos): number;
}

function priv(d: DefenseController): DefenseControllerPrivate {
  return d as unknown as DefenseControllerPrivate;
}

function arcSpine(level: 1 | 2 | 3): DefenseController {
  return new DefenseController({
    id: "d1",
    type: "arc_spine",
    position: [5, 5],
    level,
    targetMode: "first",
  });
}

describe("DefenseController", () => {
  it("arcSpineChainSearchRadius matches tier tuning", () => {
    expect(arcSpineChainSearchRadius(1)).toBe(2.5);
    expect(arcSpineChainSearchRadius(2)).toBe(4.0625);
    expect(arcSpineChainSearchRadius(3)).toBe(5);
  });

  describe("private arc-spine tuning (white-box)", () => {
    it("maxArcJumps matches tier table", () => {
      expect(priv(arcSpine(1)).maxArcJumps()).toBe(2);
      expect(priv(arcSpine(2)).maxArcJumps()).toBe(4);
      expect(priv(arcSpine(3)).maxArcJumps()).toBe(6);
    });

    it("arcSearchRadius grows with level", () => {
      expect(priv(arcSpine(1)).arcSearchRadius()).toBe(2.5);
      expect(priv(arcSpine(2)).arcSearchRadius()).toBe(4.0625);
      expect(priv(arcSpine(3)).arcSearchRadius()).toBe(5);
    });

    it("distanceSquared is squared Euclidean", () => {
      const d = arcSpine(1);
      expect(priv(d).distanceSquared([0, 0], [3, 4])).toBe(25);
    });

    it("pickNearestWithinRadius skips dead, used, and out-of-range", () => {
      const d = arcSpine(1);
      const enemies: ChainEnemyRef[] = [
        { id: "a", position: [0, 0], alive: true },
        { id: "b", position: [1, 0], alive: false },
        { id: "c", position: [0, 2], alive: true },
      ];
      const used = new Set<string>(["c"]);
      const rSq = 2 * 2;
      expect(priv(d).pickNearestWithinRadius([0, 0], enemies, used, rSq)).toBe(
        "a",
      );
    });

    it("pickNearestWithinRadius breaks distance ties by lexicographic id", () => {
      const d = arcSpine(1);
      const enemies: ChainEnemyRef[] = [
        { id: "z", position: [1, 0], alive: true },
        { id: "m", position: [0, 1], alive: true },
      ];
      expect(
        priv(d).pickNearestWithinRadius([0, 0], enemies, new Set(), 2),
      ).toBe("m");
    });
  });

  describe("computeArcChainHits", () => {
    it("returns [] for non-arc defenses", () => {
      const laser = new DefenseController({
        id: "d2",
        type: "tideheart_laser",
        position: [1, 1],
        level: 2,
        targetMode: "closest",
      });
      expect(laser.computeArcChainHits("x", [])).toEqual([]);
    });

    it("chains through nearest neighbors up to jump limit", () => {
      const spine = arcSpine(2); // up to 4 targets in the chain
      const enemies: ChainEnemyRef[] = [
        { id: "p", position: [5, 5], alive: true },
        { id: "n1", position: [6, 5], alive: true },
        { id: "n2", position: [7, 5], alive: true },
        { id: "n3", position: [8, 5], alive: true },
        { id: "far", position: [20, 5], alive: true },
      ];
      const chain = spine.computeArcChainHits("p", enemies);
      expect(chain).toEqual(["p", "n1", "n2", "n3"]);
    });
  });

  describe("upgradeShellCost", () => {
    it("returns scaling costs from docs/defenses/arc-spine.md", () => {
      const d = arcSpine(1);
      expect(d.upgradeShellCost(100)).toBe(200);
      d.level = 2;
      expect(d.upgradeShellCost(100)).toBe(400);
      d.level = 3;
      expect(d.upgradeShellCost(100)).toBeNull();
    });
  });
});
