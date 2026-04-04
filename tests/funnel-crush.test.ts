import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MapController } from "../src/game/map-controller.js";
import { pathCellKeySetUnion } from "../src/game/path-cells.js";
import type { MapDocument } from "../src/game/map-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("funnel_crush.json", () => {
  it("20×12 tri-spawn map converges to one lane with dense nightmare waves", () => {
    const raw = readFileSync(
      join(__dirname, "../data/maps/funnel_crush.json"),
      "utf8",
    );
    const doc = JSON.parse(raw) as MapDocument;
    const m = new MapController(doc);
    expect(m.id).toBe("funnel_crush");
    expect(m.gridSize).toEqual([20, 12]);
    expect(m.getWaves()).toHaveLength(6);
    expect(m.getSpawnPoints()).toHaveLength(3);
    expect(doc.difficulty).toBe("nightmare");

    const merge = [10, 7] as const;
    expect(m.getPathWaypoints("path_l")?.some((w) => w[0] === merge[0] && w[1] === merge[1])).toBe(
      true,
    );
    expect(m.getPathWaypoints("path_r")?.some((w) => w[0] === merge[0] && w[1] === merge[1])).toBe(
      true,
    );
    expect(m.getPathWaypoints("path_c")?.some((w) => w[0] === merge[0] && w[1] === merge[1])).toBe(
      true,
    );

    const pathCells = pathCellKeySetUnion(doc.paths);
    for (const slot of doc.buildSlots) {
      const [x, z] = slot.position;
      expect(pathCells.has(`${x},${z}`)).toBe(false);
    }
  });
});
