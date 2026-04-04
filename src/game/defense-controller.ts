import type {
  DefenseLevel,
  DefenseSnapshot,
  DefenseTypeKey,
  GridPos,
} from "./types.js";

export interface ChainEnemyRef {
  id: string;
  position: GridPos;
  alive: boolean;
}

/** Euclidean tile radius for Arc Spine chain hops (L1 per docs/prd-mvp.md). */
export function arcSpineChainSearchRadius(level: DefenseLevel): number {
  switch (level) {
    case 1:
      return 2;
    case 2:
      return 3.25;
    case 3:
      return 4;
    default:
      return 0;
  }
}

/**
 * Placed tower: upgrade tiering and arc-spine chain resolution (docs/defenses/arc-spine.md).
 */
export class DefenseController {
  readonly id: string;
  readonly type: DefenseTypeKey;
  readonly position: GridPos;
  level: DefenseLevel;
  targetMode: DefenseSnapshot["targetMode"];

  constructor(snapshot: DefenseSnapshot) {
    this.id = snapshot.id;
    this.type = snapshot.type;
    this.position = snapshot.position;
    this.level = snapshot.level;
    this.targetMode = snapshot.targetMode;
  }

  /**
   * Greedy chain: from the primary hit, repeatedly jump to the nearest unused enemy
   * within search radius until chain count for this level is exhausted.
   */
  computeArcChainHits(
    primaryTargetId: string,
    enemies: ReadonlyArray<ChainEnemyRef>,
  ): string[] {
    if (this.type !== "arc_spine") return [];

    const jumps = this.maxArcJumps();
    if (jumps <= 0) return [];

    const radius = this.arcSearchRadius();
    const radiusSq = radius * radius;

    const byId = new Map(enemies.map((e) => [e.id, e] as const));
    const primary = byId.get(primaryTargetId);
    if (!primary?.alive) return [];

    const chain: string[] = [primaryTargetId];
    const used = new Set<string>(chain);

    let origin = primary.position;

    while (chain.length < jumps) {
      const nextId = this.pickNearestWithinRadius(
        origin,
        enemies,
        used,
        radiusSq,
      );
      if (nextId === null) break;
      chain.push(nextId);
      used.add(nextId);
      origin = byId.get(nextId)!.position;
    }

    return chain;
  }

  upgradeShellCost(baseBuildCost: number): number | null {
    if (this.level >= 3) return null;
    const mult = this.level === 1 ? 2 : 4;
    return baseBuildCost * mult;
  }

  private maxArcJumps(): number {
    if (this.type !== "arc_spine") return 0;
    switch (this.level) {
      case 1:
        return 2;
      case 2:
        return 4;
      case 3:
        return 6;
      default:
        return 0;
    }
  }

  private arcSearchRadius(): number {
    if (this.type !== "arc_spine") return 0;
    return arcSpineChainSearchRadius(this.level);
  }

  private pickNearestWithinRadius(
    origin: GridPos,
    enemies: ReadonlyArray<ChainEnemyRef>,
    used: ReadonlySet<string>,
    radiusSq: number,
  ): string | null {
    let bestId: string | null = null;
    let bestD = Infinity;

    for (const e of enemies) {
      if (!e.alive || used.has(e.id)) continue;
      const d = this.distanceSquared(origin, e.position);
      if (d > radiusSq) continue;
      if (d < bestD || (d === bestD && (bestId === null || e.id < bestId))) {
        bestD = d;
        bestId = e.id;
      }
    }

    return bestId;
  }

  private distanceSquared(a: GridPos, b: GridPos): number {
    const dx = a[0] - b[0];
    const dz = a[1] - b[1];
    return dx * dx + dz * dz;
  }
}
