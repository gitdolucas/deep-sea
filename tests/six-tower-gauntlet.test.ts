import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MapController } from "../src/game/map-controller.js";
import type { MapDocument } from "../src/game/map-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("six_tower_gauntlet.json", () => {
  it("six lanes merge at a choke before the citadel; player places all towers", () => {
    const raw = readFileSync(
      join(__dirname, "../data/maps/six_tower_gauntlet.json"),
      "utf8",
    );
    const doc = JSON.parse(raw) as MapDocument;
    const m = new MapController(doc);

    expect(doc.gridSize).toEqual([24, 18]);
    expect(doc.startingShells).toBe(268);
    expect(m.getSpawnPoints()).toHaveLength(6);
    expect(doc.paths).toHaveLength(6);
    expect(m.getBuildSlots().length).toBeGreaterThanOrEqual(8);
    expect(m.getDefenses()).toHaveLength(0);

    const end: readonly [number, number] = [11, 17];
    const merge: readonly [number, number] = [11, 9];
    for (const p of doc.paths) {
      const wp = p.waypoints;
      const last = wp[wp.length - 1]!;
      expect(last[0]).toBe(end[0]);
      expect(last[1]).toBe(end[1]);
      expect(wp.some(([x, z]) => x === merge[0] && z === merge[1])).toBe(true);
    }

    expect(doc.waves).toHaveLength(5);
    for (const w of doc.waves) {
      const pathIds = new Set(w.groups.map((g) => g.pathId));
      expect(pathIds.size).toBeGreaterThanOrEqual(2);
    }
  });
});
