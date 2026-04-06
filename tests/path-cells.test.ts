import { describe, expect, it } from "vitest";
import {
  cellsAlongSegment,
  gridCellKey,
  pathCellKeySet,
  pathCellKeySetUnion,
  pathCellNeighborOffsets,
  pathCellVisualKind,
} from "../src/game/path-cells.js";

describe("pathCellKeySet", () => {
  it("includes cells along an orthogonal polyline", () => {
    const waypoints = [
      [0, 0],
      [4, 0],
      [4, 4],
      [7, 4],
      [7, 11],
    ] as const;
    const set = pathCellKeySet(waypoints);
    expect(set.has(gridCellKey(0, 0))).toBe(true);
    expect(set.has(gridCellKey(4, 0))).toBe(true);
    expect(set.has(gridCellKey(4, 4))).toBe(true);
    expect(set.has(gridCellKey(7, 11))).toBe(true);
    expect(set.has(gridCellKey(2, 3))).toBe(false);
  });
});

describe("pathCellKeySetUnion", () => {
  it("merges cells from multiple paths", () => {
    const set = pathCellKeySetUnion([
      { waypoints: [[0, 0], [1, 0]] },
      { waypoints: [[1, 0], [1, 2]] },
    ]);
    expect(set.has(gridCellKey(0, 0))).toBe(true);
    expect(set.has(gridCellKey(1, 2))).toBe(true);
  });
});

describe("cellsAlongSegment", () => {
  it("fills horizontal and vertical ranges inclusive", () => {
    expect(cellsAlongSegment([0, 0], [2, 0])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    expect(cellsAlongSegment([3, 5], [3, 3])).toEqual([
      [3, 3],
      [3, 4],
      [3, 5],
    ]);
  });
});

describe("pathCellNeighborOffsets", () => {
  it("lists on-path cardinals in +x, −x, +z, −z scan order", () => {
    const horizontal = pathCellKeySet([
      [2, 0],
      [3, 0],
      [4, 0],
    ]);
    expect(pathCellNeighborOffsets(3, 0, horizontal)).toEqual([
      [1, 0],
      [-1, 0],
    ]);
    const vertical = pathCellKeySet([
      [2, 1],
      [2, 2],
      [2, 3],
    ]);
    expect(pathCellNeighborOffsets(2, 2, vertical)).toEqual([
      [0, 1],
      [0, -1],
    ]);
  });
});

describe("pathCellVisualKind", () => {
  it("classifies ends, straight runs, and corners on an orthogonal path", () => {
    const waypoints = [
      [0, 0],
      [4, 0],
      [4, 4],
      [7, 4],
      [7, 11],
    ] as const;
    const set = pathCellKeySet(waypoints);
    expect(pathCellVisualKind(0, 0, set)).toBe("end");
    expect(pathCellVisualKind(7, 11, set)).toBe("end");
    expect(pathCellVisualKind(2, 0, set)).toBe("straight");
    expect(pathCellVisualKind(4, 0, set)).toBe("corner");
    expect(pathCellVisualKind(7, 4, set)).toBe("corner");
    expect(pathCellVisualKind(4, 4, set)).toBe("corner");
  });
});
