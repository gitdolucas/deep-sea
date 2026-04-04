import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MapController } from "../src/game/map-controller.js";
import type { MapDocument } from "../src/game/map-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("first_trench.json", () => {
  it("loads PRD MVP map with 3 waves and S-path", () => {
    const raw = readFileSync(
      join(__dirname, "../data/maps/first_trench.json"),
      "utf8",
    );
    const doc = JSON.parse(raw) as MapDocument;
    const m = new MapController(doc);
    expect(m.id).toBe("first_trench");
    expect(m.gridSize).toEqual([10, 12]);
    expect(m.getWaves()).toHaveLength(3);
    expect(m.getSpawnPoint("spawn_a")).toBeDefined();
    expect(m.getPathWaypoints("path_main")?.length).toBeGreaterThan(2);
    expect(m.getBuildSlots().length).toBe(6);
  });
});
