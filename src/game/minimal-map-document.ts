import type { MapDocument } from "./map-types.js";

/**
 * Minimal valid map when no `data/maps/*.json` is bundled (menu fallback, map builder default, tests).
 */
export const MINIMAL_MAP_DOCUMENT: MapDocument = {
  id: "minimal_placeholder",
  name: "Placeholder",
  difficulty: "normal",
  gridSize: [9, 9],
  /** Single citadel tile at grid center (9×9 → tile [4,4]). */
  castle: { position: [4, 4], hp: 20, size: [1, 1] },
  spawnPoints: [],
  paths: [],
  defenses: [],
  waves: [],
  decorations: [],
};
