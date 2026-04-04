import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MapController } from "../src/game/map-controller.js";
import type { MapDocument } from "../src/game/map-types.js";
import type { DefenseTypeKey, EnemyTypeKey } from "../src/game/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TOWER_ORDER: readonly DefenseTypeKey[] = [
  "arc_spine",
  "bubble_shotgun",
  "current_cannon",
  "ink_veil",
  "tideheart_laser",
  "vibration_zone",
];

describe("six_tower_gauntlet.json", () => {
  it("wide layout: six lanes, one tower type each, merge to bottom center; three mono-enemy waves", () => {
    const raw = readFileSync(
      join(__dirname, "../data/maps/six_tower_gauntlet.json"),
      "utf8",
    );
    const doc = JSON.parse(raw) as MapDocument;
    const m = new MapController(doc);

    expect(doc.gridSize[0]).toBeGreaterThanOrEqual(32);
    expect(m.getSpawnPoints()).toHaveLength(6);
    expect(doc.paths).toHaveLength(6);
    expect(m.getBuildSlots()).toHaveLength(6);
    expect(m.getDefenses()).toHaveLength(6);

    for (let i = 0; i < 6; i++) {
      expect(m.getDefenses()[i]!.type).toBe(TOWER_ORDER[i]);
    }

    const end: readonly [number, number] = [17, 25];
    const merge: readonly [number, number] = [17, 20];
    for (const p of doc.paths) {
      const wp = p.waypoints;
      const last = wp[wp.length - 1]!;
      expect(last[0]).toBe(end[0]);
      expect(last[1]).toBe(end[1]);
      expect(wp.some(([x, z]) => x === merge[0] && z === merge[1])).toBe(true);
    }

    const waveEnemies: EnemyTypeKey[] = ["stoneclaw", "razoreel", "abyssal_colossus"];
    expect(doc.waves).toHaveLength(3);
    for (let w = 0; w < 3; w++) {
      const wave = doc.waves[w]!;
      const types = new Set(wave.groups.map((g) => g.enemyType));
      expect(types.size).toBe(1);
      expect([...types][0]).toBe(waveEnemies[w]);
      expect(wave.groups).toHaveLength(6);
      const pathIds = new Set(wave.groups.map((g) => g.pathId));
      expect(pathIds.size).toBe(6);
    }
  });
});
