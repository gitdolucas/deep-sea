import { describe, expect, it } from "vitest";
import { analyzeMapStrategyHints } from "../src/game/map-strategy-hints.js";
import type { MapDocument } from "../src/game/map-types.js";

function baseDoc(override: Partial<MapDocument>): MapDocument {
  return {
    id: "t",
    name: "t",
    difficulty: "normal",
    gridSize: [8, 8],
    castle: { position: [5, 5], hp: 20, size: [1, 1] },
    spawnPoints: [{ id: "s1", position: [0, 0], pathIds: ["p1"] }],
    paths: [],
    defenses: [],
    waves: [],
    decorations: [],
    ...override,
  };
}

describe("analyzeMapStrategyHints", () => {
  it("flags empty decorations", () => {
    const doc = baseDoc({
      paths: [
        {
          id: "p1",
          waypoints: [
            [0, 0],
            [1, 0],
          ],
        },
      ],
      decorations: [],
    });
    const hints = analyzeMapStrategyHints(doc);
    expect(hints.some((h) => h.code === "decorations.empty")).toBe(true);
  });

  it("does not flag decorations when non-empty", () => {
    const doc = baseDoc({
      paths: [
        {
          id: "p1",
          waypoints: [
            [0, 0],
            [1, 0],
          ],
        },
      ],
      decorations: [
        {
          type: "rock_small",
          position: [3, 0, 3],
          rotation: 0,
          scale: 1,
        },
      ],
    });
    const hints = analyzeMapStrategyHints(doc);
    expect(hints.some((h) => h.code === "decorations.empty")).toBe(false);
  });

  it("flags adjacent parallel path strips on different path ids", () => {
    const doc = baseDoc({
      paths: [
        {
          id: "p_left",
          waypoints: [
            [0, 0],
            [0, 1],
            [0, 2],
          ],
        },
        {
          id: "p_right",
          waypoints: [
            [1, 0],
            [1, 1],
            [1, 2],
          ],
        },
      ],
    });
    const hints = analyzeMapStrategyHints(doc);
    expect(
      hints.some((h) => h.code === "layout.parallel_path_adjacency"),
    ).toBe(true);
  });

  it("no parallel-strip hint when paths separated by a non-path column", () => {
    const doc = baseDoc({
      paths: [
        {
          id: "p_left",
          waypoints: [
            [0, 0],
            [0, 1],
            [0, 2],
          ],
        },
        {
          id: "p_right",
          waypoints: [
            [2, 0],
            [2, 1],
            [2, 2],
          ],
        },
      ],
    });
    const hints = analyzeMapStrategyHints(doc);
    expect(
      hints.some((h) => h.code === "layout.parallel_path_adjacency"),
    ).toBe(false);
  });

  it("no parallel-strip hint when paths share cells (intentional merge)", () => {
    const doc = baseDoc({
      paths: [
        {
          id: "p_a",
          waypoints: [
            [0, 0],
            [1, 0],
            [2, 0],
          ],
        },
        {
          id: "p_b",
          waypoints: [
            [2, 0],
            [2, 1],
            [2, 2],
          ],
        },
      ],
    });
    const hints = analyzeMapStrategyHints(doc);
    expect(
      hints.some((h) => h.code === "layout.parallel_path_adjacency"),
    ).toBe(false);
  });

  it("skips path-pair analysis with a single path", () => {
    const doc = baseDoc({
      paths: [{ id: "p1", waypoints: [[0, 0], [1, 0]] }],
      decorations: [{ type: "skull", position: [4, 0, 4], rotation: 0, scale: 1 }],
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
    });
    const hints = analyzeMapStrategyHints(doc);
    expect(hints.length).toBe(0);
  });
});
