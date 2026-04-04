import { describe, expect, it } from "vitest";
import { EnemyController } from "../src/game/enemy-controller.js";
import type { GridPos } from "../src/game/types.js";

/** Typing for white-box tests against TS `private` methods (compile-time only). */
interface EnemyControllerPrivate {
  clamp(value: number, min: number, max: number): number;
  totalPathLength(): number;
  segmentLength(a: GridPos, b: GridPos): number;
  positionFromProgress(progress: number): GridPos;
  effectiveSpeedTilesPerSec(): number;
}

function priv(e: EnemyController): EnemyControllerPrivate {
  return e as unknown as EnemyControllerPrivate;
}

function makeStoneclaw(
  overrides: Partial<ConstructorParameters<typeof EnemyController>[0]> = {},
): EnemyController {
  return new EnemyController({
    id: "e1",
    enemyType: "stoneclaw",
    pathId: "path_main",
    waypoints: [
      [0, 0],
      [0, 3],
      [4, 3],
    ],
    pathProgress: 0,
    hp: 10,
    maxHp: 10,
    speedMultiplier: 1,
    ...overrides,
  });
}

describe("EnemyController", () => {
  describe("private helpers (white-box)", () => {
    it("clamp limits to [min, max]", () => {
      const e = makeStoneclaw();
      const p = priv(e);
      expect(p.clamp(5, 0, 10)).toBe(5);
      expect(p.clamp(-1, 0, 10)).toBe(0);
      expect(p.clamp(11, 0, 10)).toBe(10);
    });

    it("segmentLength is Euclidean on the xz grid", () => {
      const e = makeStoneclaw();
      expect(priv(e).segmentLength([0, 0], [3, 4])).toBe(5);
    });

    it("totalPathLength sums waypoint segments", () => {
      const e = makeStoneclaw();
      // [0,0]->[0,3] = 3, [0,3]->[4,3] = 4
      expect(priv(e).totalPathLength()).toBe(7);
    });

    it("positionFromProgress interpolates along the polyline", () => {
      const e = makeStoneclaw();
      const p = priv(e);
      expect(p.positionFromProgress(0)).toEqual([0, 0]);
      expect(p.positionFromProgress(3 / 7)).toEqual([0, 3]);
      expect(p.positionFromProgress(1)).toEqual([4, 3]);
    });

    it("effectiveSpeedTilesPerSec scales base speed by multiplier", () => {
      const e = makeStoneclaw({ speedMultiplier: 2 });
      expect(priv(e).effectiveSpeedTilesPerSec()).toBeCloseTo(3, 5);
    });
  });

  describe("public movement", () => {
    it("tick advances pathProgress toward 1", () => {
      const e = makeStoneclaw();
      const before = e.getPathProgress();
      e.tick(1);
      expect(e.getPathProgress()).toBeGreaterThan(before);
      expect(e.getPathProgress()).toBeLessThanOrEqual(1);
    });

    it("getGridPosition matches end of path at progress 1", () => {
      const e = makeStoneclaw({ pathProgress: 1 });
      expect(e.getGridPosition()).toEqual([4, 3]);
    });
  });
});
