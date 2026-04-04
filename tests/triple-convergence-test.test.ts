import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MapController } from "../src/game/map-controller.js";
import type { MapDocument } from "../src/game/map-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("triple_convergence_test.json", () => {
  it("has isolated vertical tracks per defense slot and mono-type flood waves per path", () => {
    const raw = readFileSync(
      join(__dirname, "../data/maps/triple_convergence_test.json"),
      "utf8",
    );
    const doc = JSON.parse(raw) as MapDocument;
    const m = new MapController(doc);
    expect(m.id).toBe("triple_convergence_test");
    expect(m.getSpawnPoints()).toHaveLength(3);
    expect(doc.paths.map((p) => p.id).sort()).toEqual(["path_c", "path_l", "path_r"]);

    expect(m.getPathWaypoints("path_l")).toEqual([
      [2, 0],
      [2, 21],
    ]);
    expect(m.getPathWaypoints("path_c")).toEqual([
      [7, 0],
      [7, 21],
    ]);
    expect(m.getPathWaypoints("path_r")).toEqual([
      [12, 0],
      [12, 21],
    ]);

    expect(m.getBuildSlots()).toHaveLength(3);
    expect(m.getDefenses()).toHaveLength(3);

    for (const w of doc.waves) {
      const types = new Set(w.groups.map((g) => g.enemyType));
      expect(types.size, `wave ${w.wave} mixes enemy types`).toBe(1);
      expect(w.groups).toHaveLength(3);
      const paths = new Set(w.groups.map((g) => g.pathId));
      expect(paths).toEqual(new Set(["path_l", "path_c", "path_r"]));
      for (const g of w.groups) {
        expect(g.count).toBeGreaterThanOrEqual(8);
      }
    }
  });
});
