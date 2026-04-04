import { describe, expect, it } from "vitest";
import type { EnemyTypeKey } from "../src/game/types.js";
import { createEnemyVisual } from "../src/render/enemy-visuals.js";

const ALL_ENEMY_TYPES: EnemyTypeKey[] = [
  "stoneclaw",
  "razoreel",
  "abyssal_colossus",
];

describe("createEnemyVisual", () => {
  it.each(ALL_ENEMY_TYPES)("builds a non-empty group for %s", (enemyType) => {
    const { root, hpBarY } = createEnemyVisual(enemyType);
    expect(root.children.length).toBeGreaterThan(0);
    expect(hpBarY).toBeGreaterThan(0);
  });
});
