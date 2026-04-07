import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { MapDocument } from "../src/game/map-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("map-01-tutorial waves (docs/prd-mvp.md pins)", () => {
  it("matches PRD counts, intervals, prep times, and wave-3 HP/speed multipliers", () => {
    const raw = readFileSync(
      join(__dirname, "../data/maps/map-01-tutorial.json"),
      "utf8",
    );
    const doc = JSON.parse(raw) as MapDocument;
    const [w1, w2, w3] = doc.waves;

    expect(w1?.prepTime).toBe(20);
    expect(w1?.groups[0]?.count).toBe(5);
    expect(w1?.groups[0]?.interval).toBe(1.8);
    expect(w1?.groups[0]?.hpMultiplier).toBe(1);
    expect(w1?.groups[0]?.speedMultiplier).toBe(1);

    expect(w2?.prepTime).toBe(15);
    expect(w2?.groups[0]?.count).toBe(10);
    expect(w2?.groups[0]?.interval).toBe(1.2);

    expect(w3?.prepTime).toBe(15);
    expect(w3?.groups[0]?.count).toBe(8);
    expect(w3?.groups[0]?.interval).toBe(0.8);
    expect(w3?.groups[0]?.hpMultiplier).toBe(1.2);
    expect(w3?.groups[0]?.speedMultiplier).toBe(1.1);
    expect(w3?.groups[1]?.count).toBe(6);
    expect(w3?.groups[1]?.interval).toBe(0.6);
    expect(w3?.groups[1]?.delay).toBe(8);
    expect(w3?.groups[1]?.hpMultiplier).toBe(1.3);
    expect(w3?.groups[1]?.speedMultiplier).toBe(1.15);
  });
});
