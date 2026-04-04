import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MapController } from "../src/game/map-controller.js";
import { pathCellKeySetUnion } from "../src/game/path-cells.js";
import type { MapDocument } from "../src/game/map-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("hydra_convergence.json", () => {
  it("loads quad-spawn map with merged paths, many slots, and layered waves", () => {
    const raw = readFileSync(
      join(__dirname, "../data/maps/hydra_convergence.json"),
      "utf8",
    );
    const doc = JSON.parse(raw) as MapDocument;
    const m = new MapController(doc);
    expect(m.id).toBe("hydra_convergence");
    expect(m.gridSize).toEqual([22, 18]);
    expect(m.getWaves()).toHaveLength(14);
    expect(m.getSpawnPoints()).toHaveLength(4);
    expect(m.getPathWaypoints("path_alpha")?.[0]).toEqual([0, 0]);
    expect(m.getBuildSlots().length).toBe(54);

    const pathCells = pathCellKeySetUnion(doc.paths);
    for (const slot of doc.buildSlots) {
      const [x, z] = slot.position;
      expect(pathCells.has(`${x},${z}`)).toBe(false);
    }
  });
});
