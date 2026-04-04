import { describe, expect, it } from "vitest";
import tutorialShallows from "../data/maps/tutorial_shallows.json";
import type { MapDocument } from "../src/game/map-types.js";
import {
  cellsAlongSegment,
  gridCellKey,
  pathCellKeySet,
  pathCellKeySetUnion,
  pathCellVisualKind,
} from "../src/game/path-cells.js";

describe("pathCellKeySet", () => {
  it("includes spawn and corners for tutorial shallows path", () => {
    const doc = tutorialShallows as MapDocument;
    const waypoints = doc.paths[0]!.waypoints;
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

describe("pathCellVisualKind", () => {
  it("classifies ends, straight runs, and junctions on tutorial shallows path", () => {
    const doc = tutorialShallows as MapDocument;
    const set = pathCellKeySet(doc.paths[0]!.waypoints);
    expect(pathCellVisualKind(0, 0, set)).toBe("end");
    expect(pathCellVisualKind(7, 11, set)).toBe("end");
    expect(pathCellVisualKind(2, 0, set)).toBe("straight");
    expect(pathCellVisualKind(4, 0, set)).toBe("corner");
    expect(pathCellVisualKind(7, 4, set)).toBe("corner");
    expect(pathCellVisualKind(4, 4, set)).toBe("corner");
  });
});
