import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GameSession } from "../src/game/game-session.js";
import { MapController } from "../src/game/map-controller.js";
import type { MapDocument } from "../src/game/map-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("tutorial_shallows.json", () => {
  it("loads tutorial map with gentle waves and combo-friendly shells", () => {
    const raw = readFileSync(
      join(__dirname, "../data/maps/tutorial_shallows.json"),
      "utf8",
    );
    const doc = JSON.parse(raw) as MapDocument;
    const m = new MapController(doc);
    expect(m.id).toBe("tutorial_shallows");
    expect(doc.startingShells).toBe(88);
    expect(m.gridSize).toEqual([9, 12]);
    expect(m.getWaves()).toHaveLength(4);
    expect(m.getSpawnPoint("spawn_a")).toBeDefined();
    expect(m.getPathWaypoints("path_main")?.length).toBeGreaterThan(2);
    expect(m.getBuildSlots().length).toBe(5);

    const session = new GameSession(doc);
    expect(session.economy.getShells()).toBe(88);
  });
});
