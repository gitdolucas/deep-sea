import { describe, expect, it } from "vitest";
import firstTrench from "../data/maps/first_trench.json";
import type { MapDocument } from "../src/game/map-types.js";
import {
  cellsAlongSegment,
  gridCellKey,
  pathCellKeySet,
  pathCellKeySetUnion,
  pathCellVisualKind,
} from "../src/game/path-cells.js";

describe("pathCellKeySet", () => {
  it("includes spawn and corners for first trench", () => {
    const doc = firstTrench as MapDocument;
    const waypoints = doc.paths[0]!.waypoints;
    const set = pathCellKeySet(waypoints);
    expect(set.has(gridCellKey(0, 0))).toBe(true);
    expect(set.has(gridCellKey(5, 0))).toBe(true);
    expect(set.has(gridCellKey(5, 3))).toBe(true);
    expect(set.has(gridCellKey(9, 11))).toBe(true);
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

describe("pathCellVisualKind", () => {
  it("classifies ends and corners on first trench path", () => {
    const doc = firstTrench as MapDocument;
    const set = pathCellKeySet(doc.paths[0]!.waypoints);
    expect(pathCellVisualKind(0, 0, set)).toBe("end");
    expect(pathCellVisualKind(9, 11, set)).toBe("end");
    expect(pathCellVisualKind(5, 0, set)).toBe("corner");
    expect(pathCellVisualKind(3, 0, set)).toBe("straight");
    expect(pathCellVisualKind(6, 3, set)).toBe("straight");
  });
});
