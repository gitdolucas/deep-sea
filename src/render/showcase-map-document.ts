import type { MapDocument } from "../game/map-types.js";
import { ARMORY_DEFENSE_ORDER } from "../game/defense-build-costs.js";
import type { DefenseSnapshot } from "../game/types.js";

/**
 * Map JSON for the visual showcase (no gameplay): valid schema, path along z=0,
 * six defenses on build slots for the six tower types.
 */
export const SHOWCASE_MAP_DOCUMENT: MapDocument = (() => {
  const gw = 28;
  const gd = 20;
  const defensePositions: [number, number][] = [
    [2, 3],
    [5, 3],
    [8, 3],
    [11, 3],
    [14, 3],
    [17, 3],
  ];
  const defenses: DefenseSnapshot[] = ARMORY_DEFENSE_ORDER.map((type, i) => {
    const pos = defensePositions[i]!;
    return {
      id: `showcase_${type}`,
      type,
      position: pos,
      level: 1,
      targetMode: "closest",
    };
  });
  const buildSlots = defensePositions.map((position) => ({
    position: position as [number, number],
    type: "standard" as const,
  }));

  return {
    id: "visual_showcase",
    name: "Visual showcase",
    description: "Internal grid reference for art and VFX.",
    difficulty: "normal",
    startingShells: 999,
    gridSize: [gw, gd],
    castle: { position: [27, 0], hp: 20, size: [1, 1] },
    spawnPoints: [{ id: "s1", position: [0, 0], pathIds: ["p1"] }],
    paths: [
      {
        id: "p1",
        waypoints: [
          [0, 0],
          [27, 0],
        ],
      },
    ],
    buildSlots,
    defenses,
    waves: [
      {
        wave: 1,
        prepTime: 999,
        isBoss: false,
        groups: [
          {
            enemyType: "stoneclaw",
            count: 1,
            spawnId: "s1",
            pathId: "p1",
            interval: 99,
            delay: 0,
            hpMultiplier: 1,
            speedMultiplier: 1,
          },
        ],
      },
    ],
    decorations: [],
  };
})();
