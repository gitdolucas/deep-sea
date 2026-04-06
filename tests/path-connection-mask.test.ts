import { describe, expect, it } from "vitest";
import {
  PATH_CONNECTION_ORDER,
  gridCellKey,
  pathCellKeySet,
  pathCellNeighborOffsets,
  pathCellVisualKind,
  pathConnectionMask,
  pathNeighborOffsetsFromMask,
} from "../src/game/path-cells.js";
import type { GridPos } from "../src/game/types.js";

describe("pathNeighborOffsetsFromMask", () => {
  it("round-trips bit order with PATH_CONNECTION_ORDER (+x, −x, +z, −z)", () => {
    expect(pathNeighborOffsetsFromMask(0)).toEqual([]);
    expect(pathNeighborOffsetsFromMask(0b1111)).toEqual([...PATH_CONNECTION_ORDER]);
    expect(pathNeighborOffsetsFromMask(0b1010)).toEqual([
      [-1, 0],
      [0, -1],
    ]);
  });
});

describe("pathConnectionMask", () => {
  it("matches pathCellNeighborOffsets for every cell on a sample path", () => {
    const waypoints = [
      [0, 0],
      [4, 0],
      [4, 4],
      [7, 4],
      [7, 11],
    ] as const;
    const set = pathCellKeySet(waypoints);
    for (const k of set) {
      const [gx, gz] = k.split(",").map(Number) as [number, number];
      const mask = pathConnectionMask(gx, gz, set);
      const fromMask = pathNeighborOffsetsFromMask(mask);
      expect(pathCellNeighborOffsets(gx, gz, set)).toEqual(fromMask);
    }
  });

  it("sets one bit per cardinal arm (golden cases)", () => {
    const onlyEast = new Set([gridCellKey(5, 3), gridCellKey(6, 3)]);
    expect(pathConnectionMask(5, 3, onlyEast)).toBe(0b0001);

    const onlyWest = new Set([gridCellKey(5, 3), gridCellKey(4, 3)]);
    expect(pathConnectionMask(5, 3, onlyWest)).toBe(0b0010);

    const onlySouthZ = new Set([gridCellKey(5, 3), gridCellKey(5, 4)]);
    expect(pathConnectionMask(5, 3, onlySouthZ)).toBe(0b0100);

    const onlyNorthZ = new Set([gridCellKey(5, 3), gridCellKey(5, 2)]);
    expect(pathConnectionMask(5, 3, onlyNorthZ)).toBe(0b1000);
  });
});

describe("orthogonal topology table (union footprint)", () => {
  const cases: Array<{
    name: string;
    cells: GridPos[];
    hub: GridPos;
    kind: "end" | "straight" | "corner" | "tee" | "cross";
    mask: number;
  }> = [
    {
      name: "end stub +x",
      cells: [
        [5, 3],
        [6, 3],
      ],
      hub: [5, 3],
      kind: "end",
      mask: 0b0001,
    },
    {
      name: "straight E–W",
      cells: [
        [4, 3],
        [5, 3],
        [6, 3],
      ],
      hub: [5, 3],
      kind: "straight",
      mask: 0b0011,
    },
    {
      name: "straight N–S (+z/−z)",
      cells: [
        [5, 2],
        [5, 3],
        [5, 4],
      ],
      hub: [5, 3],
      kind: "straight",
      mask: 0b1100,
    },
    {
      name: "corner L",
      cells: [
        [5, 3],
        [6, 3],
        [5, 4],
      ],
      hub: [5, 3],
      kind: "corner",
      mask: 0b0101,
    },
    {
      name: "tee",
      cells: [
        [3, 3],
        [2, 3],
        [4, 3],
        [3, 2],
      ],
      hub: [3, 3],
      kind: "tee",
      mask: 0b1011,
    },
    {
      name: "cross",
      cells: [
        [3, 3],
        [2, 3],
        [4, 3],
        [3, 2],
        [3, 4],
      ],
      hub: [3, 3],
      kind: "cross",
      mask: 0b1111,
    },
  ];

  for (const row of cases) {
    it(`classifies ${row.name} (${row.kind}, mask ${row.mask})`, () => {
      const set = new Set(row.cells.map(([x, z]) => gridCellKey(x, z)));
      const [gx, gz] = row.hub;
      expect(pathConnectionMask(gx, gz, set)).toBe(row.mask);
      expect(pathCellVisualKind(gx, gz, set)).toBe(row.kind);
    });
  }
});
