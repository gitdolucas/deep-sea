import type { MapDocument } from "./map-types.js";

/**
 * Minimal valid map when no `data/maps/*.json` is bundled (menu fallback, map builder default, tests).
 */
export const MINIMAL_MAP_DOCUMENT: MapDocument = {
  id: "minimal_placeholder",
  name: "Placeholder",
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
