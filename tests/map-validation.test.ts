import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeMapStrategyHints } from "../src/game/map-strategy-hints.js";
import {
  isValidMapDocument,
  validateMapDocument,
} from "../src/game/map-validation.js";
import type { MapDocument } from "../src/game/map-types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mapsDir = join(__dirname, "../data/maps");

function minimalValidMap(): MapDocument {
  return {
    id: "test",
    name: "Test",
    difficulty: "normal",
    gridSize: [4, 4],
    castle: { position: [2, 3], hp: 20, size: [1, 1] },
    spawnPoints: [{ id: "s1", position: [0, 0], pathIds: ["p1"] }],
    paths: [
      {
        id: "p1",
        waypoints: [
          [0, 0],
          [2, 0],
          [2, 3],
        ],
      },
    ],
    defenses: [],
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
    decorations: [],
  };
}

describe("validateMapDocument", () => {
  it("accepts a minimal valid map", () => {
    const doc = minimalValidMap();
    expect(validateMapDocument(doc)).toEqual([]);
    expect(isValidMapDocument(doc)).toBe(true);
  });

  it("accepts castle-only draft (empty paths, spawns, waves)", () => {
    const doc: MapDocument = {
      id: "draft",
      name: "Draft",
      difficulty: "normal",
      gridSize: [9, 9],
      castle: { position: [4, 4], hp: 20, size: [1, 1] },
      spawnPoints: [],
      paths: [],
      defenses: [],
      waves: [],
      decorations: [],
    };
    expect(validateMapDocument(doc)).toEqual([]);
  });

  it("rejects non-object root", () => {
    expect(validateMapDocument(null).length).toBeGreaterThan(0);
    expect(validateMapDocument("x")[0]?.code).toBe("shape.root");
  });

  it("accepts map with non-empty description", () => {
    const doc = { ...minimalValidMap(), description: "Dock briefing text." };
    expect(validateMapDocument(doc)).toEqual([]);
  });

  it("rejects description when not a string", () => {
    const doc = { ...minimalValidMap(), description: 1 } as unknown as MapDocument;
    const issues = validateMapDocument(doc);
    expect(issues.some((i) => i.code === "shape.description")).toBe(true);
  });

  it("rejects description when empty string", () => {
    const doc = { ...minimalValidMap(), description: "" };
    const issues = validateMapDocument(doc);
    expect(issues.some((i) => i.code === "shape.description")).toBe(true);
  });

  it("rejects defense on path cell", () => {
    const doc = minimalValidMap();
    const bad: MapDocument = {
      ...doc,
      defenses: [
        {
          id: "d1",
          type: "arc_spine",
          position: [0, 0],
          level: 1,
          targetMode: "first",
        },
      ],
    };
    const issues = validateMapDocument(bad);
    expect(issues.some((i) => i.code === "defense.path")).toBe(true);
  });

  it("rejects defense on decoration tile", () => {
    const doc = minimalValidMap();
    const bad: MapDocument = {
      ...doc,
      decorations: [
        {
          type: "rock_small",
          position: [1, 0, 1],
          rotation: 0,
          scale: 1,
        },
      ],
      defenses: [
        {
          id: "d1",
          type: "arc_spine",
          position: [1, 1],
          level: 1,
          targetMode: "first",
        },
      ],
    };
    const issues = validateMapDocument(bad);
    expect(issues.some((i) => i.code === "defense.decoration")).toBe(true);
  });

  it("rejects defense on citadel footprint", () => {
    const doc = minimalValidMap();
    const bad: MapDocument = {
      ...doc,
      defenses: [
        {
          id: "d1",
          type: "arc_spine",
          position: [2, 3],
          level: 1,
          targetMode: "first",
        },
      ],
    };
    const issues = validateMapDocument(bad);
    expect(issues.some((i) => i.code === "defense.castle")).toBe(true);
  });

  it("rejects wave group with unknown pathId", () => {
    const doc = minimalValidMap();
    const bad = {
      ...doc,
      waves: [
        {
          ...doc.waves[0]!,
          groups: [
            {
              ...doc.waves[0]!.groups[0]!,
              pathId: "missing_path",
            },
          ],
        },
      ],
    };
    expect(validateMapDocument(bad).some((i) => i.code === "refs.path")).toBe(
      true,
    );
  });

  it("rejects path with fewer than 2 waypoints", () => {
    const doc = minimalValidMap();
    const bad = {
      ...doc,
      paths: [{ id: "p1", waypoints: [[0, 0]] }],
    };
    expect(
      validateMapDocument(bad).some((i) => i.code === "path.waypoints.length"),
    ).toBe(true);
  });

  it("every data/maps JSON file validates when present", () => {
    let files: string[];
    try {
      files = readdirSync(mapsDir).filter((f) => f.endsWith(".json"));
    } catch {
      files = [];
    }
    for (const f of files) {
      const raw = readFileSync(join(mapsDir, f), "utf8");
      const json = JSON.parse(raw) as unknown;
      const issues = validateMapDocument(json);
      expect(issues, `${f}: ${JSON.stringify(issues)}`).toEqual([]);
    }
  });

  it("every data/maps JSON uses each spawn in at least one wave (strategy hint)", () => {
    let files: string[];
    try {
      files = readdirSync(mapsDir).filter((f) => f.endsWith(".json"));
    } catch {
      files = [];
    }
    for (const f of files) {
      const raw = readFileSync(join(mapsDir, f), "utf8");
      const doc = JSON.parse(raw) as MapDocument;
      const hints = analyzeMapStrategyHints(doc);
      const unused = hints.filter((h) => h.code === "waves.unused_spawn");
      expect(unused, `${f}: ${JSON.stringify(unused)}`).toEqual([]);
    }
  });
});
