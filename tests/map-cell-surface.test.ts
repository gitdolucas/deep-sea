import { describe, expect, it } from "vitest";
import type { MapDocument } from "../src/game/map-types.js";
import {
  classifyMapCellSurface,
  createMapCellSurfaceContext,
  mapCellTopTextureKey,
} from "../src/game/map-cell-surface.js";

/** Tiny map: spawn+path at (0,0); path L through (1,0),(2,0),(2,1),(2,2); decoration on path at (1,0) and sand at (2,1)? Wait (2,1) is on path - use sand tile (4,4) for decoration only on sand */
const FIXTURE: MapDocument = {
  id: "cell_surface_test",
  name: "Cell surface test",
  difficulty: "normal",
  gridSize: [5, 5],
  castle: { position: [3, 3], hp: 20, size: [1, 1] },
  spawnPoints: [{ id: "s1", position: [0, 0], pathIds: ["p1"] }],
  paths: [
    {
      id: "p1",
      waypoints: [
        [0, 0],
        [2, 0],
        [2, 2],
      ],
    },
  ],
  defenses: [],
  waves: [
    {
      wave: 1,
      prepTime: 1,
      isBoss: false,
      groups: [],
    },
  ],
  decorations: [
    {
      type: "rock_small",
      position: [1, 0, 0],
      rotation: 0,
      scale: 1,
    },
    {
      type: "kelp_cluster",
      position: [4, 0, 4],
      rotation: 0,
      scale: 1,
    },
  ],
};

describe("createMapCellSurfaceContext + classifyMapCellSurface", () => {
  const ctx = createMapCellSurfaceContext(FIXTURE);

  it("classifies off-path tile as sand", () => {
    const s = classifyMapCellSurface(ctx, 4, 1);
    expect(s.surfaceKind).toBe("sand");
    expect(s.pathShape).toBeNull();
    expect(s.label).toBe("sand");
  });

  it("spawn wins over path on same tile", () => {
    const s = classifyMapCellSurface(ctx, 0, 0);
    expect(s.surfaceKind).toBe("spawn");
    expect(s.label).toBe("spawn");
  });

  it("decoration wins over path", () => {
    const s = classifyMapCellSurface(ctx, 1, 0);
    expect(s.surfaceKind).toBe("decoration");
    expect(s.label).toBe("decoration");
  });

  it("castle footprint is castle", () => {
    const s = classifyMapCellSurface(ctx, 3, 3);
    expect(s.surfaceKind).toBe("castle");
    expect(s.label).toBe("castle");
  });

  it("path segment gets neighbor-derived pathShape and oriented offsets", () => {
    const straight = classifyMapCellSurface(ctx, 2, 1);
    expect(straight.surfaceKind).toBe("path");
    expect(straight.label).toBe("path");
    expect(straight.pathShape).toBe("straight");
    expect(straight.pathNeighborOffsets).toEqual(
      expect.arrayContaining([
        [0, -1],
        [0, 1],
      ]),
    );
    expect(straight.pathNeighborOffsets).toHaveLength(2);

    const corner = classifyMapCellSurface(ctx, 2, 0);
    expect(corner.surfaceKind).toBe("path");
    expect(corner.pathShape).toBe("corner");
    expect(corner.pathNeighborOffsets).toEqual(
      expect.arrayContaining([
        [-1, 0],
        [0, 1],
      ]),
    );
    expect(corner.pathNeighborOffsets).toHaveLength(2);
  });

  it("decoration on sand only", () => {
    const s = classifyMapCellSurface(ctx, 4, 4);
    expect(s.surfaceKind).toBe("decoration");
    expect(s.label).toBe("decoration");
  });
});

describe("mapCellTopTextureKey", () => {
  it("includes path shape and sorted neighbor signature for path tiles", () => {
    expect(
      mapCellTopTextureKey({
        surfaceKind: "path",
        pathShape: "tee",
        pathNeighborOffsets: [
          [1, 0],
          [-1, 0],
          [0, 1],
        ],
        label: "path",
      }),
    ).toBe("path:tee:-1,0|0,1|1,0");
    expect(
      mapCellTopTextureKey({
        surfaceKind: "sand",
        pathShape: null,
        pathNeighborOffsets: null,
        label: "sand",
      }),
    ).toBe("sand");
  });
});
