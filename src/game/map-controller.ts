import type {
  BuildSlotDefinition,
  CastleDefinition,
  DecorationDefinition,
  MapDifficulty,
  MapDocument,
  PathDefinition,
  SpawnPointDefinition,
  WaveDefinition,
} from "./map-types.js";
import { gridCellKey, pathCellKeySetUnion } from "./path-cells.js";
import type { DefenseLevel, DefenseSnapshot, GridPos } from "./types.js";

function cloneDefense(d: DefenseSnapshot): DefenseSnapshot {
  return {
    ...d,
    position: [d.position[0], d.position[1]],
  };
}

/** Horizontal tile indices for each decoration (`docs/map-schema.md`). */
function decorationOccupiedCellKeys(
  decorations: readonly DecorationDefinition[],
): Set<string> {
  const set = new Set<string>();
  for (const d of decorations) {
    const gx = Math.floor(d.position[0]);
    const gz = Math.floor(d.position[2]);
    set.add(gridCellKey(gx, gz));
  }
  return set;
}

/**
 * Level layout + wave data from map JSON. Defenses are mutable runtime state;
 * geometry, slots, paths, and waves are treated as fixed for the map.
 */
export class MapController {
  readonly id: string;
  readonly name: string;
  readonly difficulty: MapDifficulty;
  readonly gridSize: readonly [number, number];
  readonly castle: CastleDefinition;

  private readonly spawnPoints: readonly SpawnPointDefinition[];
  private readonly pathsById: ReadonlyMap<string, PathDefinition>;
  private readonly buildSlots: readonly BuildSlotDefinition[];
  /** Grid cells occupied by enemy paths; towers may not be built here. */
  private readonly pathOccupiedCellKeys: ReadonlySet<string>;
  /** Grid cells with a decoration; towers may not be built here. */
  private readonly decorationOccupiedCellKeys: ReadonlySet<string>;
  private defenses: DefenseSnapshot[];
  private readonly waves: readonly WaveDefinition[];
  private readonly decorations: readonly DecorationDefinition[];

  constructor(doc: MapDocument) {
    this.id = doc.id;
    this.name = doc.name;
    this.difficulty = doc.difficulty;
    this.gridSize = doc.gridSize;
    this.castle = doc.castle;
    this.spawnPoints = doc.spawnPoints;
    this.pathsById = new Map(doc.paths.map((p) => [p.id, p]));
    this.buildSlots = doc.buildSlots;
    this.pathOccupiedCellKeys = pathCellKeySetUnion(doc.paths);
    this.decorationOccupiedCellKeys = decorationOccupiedCellKeys(
      doc.decorations,
    );
    this.defenses = doc.defenses.map(cloneDefense);
    this.waves = doc.waves;
    this.decorations = doc.decorations;
  }

  getSpawnPoints(): readonly SpawnPointDefinition[] {
    return this.spawnPoints;
  }

  getSpawnPoint(id: string): SpawnPointDefinition | undefined {
    return this.spawnPoints.find((s) => s.id === id);
  }

  getPath(pathId: string): PathDefinition | undefined {
    return this.pathsById.get(pathId);
  }

  getPathWaypoints(pathId: string): readonly GridPos[] | undefined {
    return this.pathsById.get(pathId)?.waypoints;
  }

  getBuildSlots(): readonly BuildSlotDefinition[] {
    return this.buildSlots;
  }

  getDefenses(): readonly DefenseSnapshot[] {
    return this.defenses;
  }

  getWaves(): readonly WaveDefinition[] {
    return this.waves;
  }

  getWaveIndex(waveNumber: number): number {
    return this.waves.findIndex((w) => w.wave === waveNumber);
  }

  getDecorations(): readonly DecorationDefinition[] {
    return this.decorations;
  }

  positionInBounds(pos: GridPos): boolean {
    const [gw, gd] = this.gridSize;
    const x = pos[0];
    const z = pos[1];
    return x >= 0 && z >= 0 && x < gw && z < gd;
  }

  /**
   * True for any in-bounds cell not on an enemy path or decoration tile
   * (map `buildSlots` are hints only).
   */
  isBuildSlotPosition(pos: GridPos): boolean {
    if (!this.positionInBounds(pos)) return false;
    const key = this.posKeyFromGrid(pos);
    if (this.pathOccupiedCellKeys.has(key)) return false;
    if (this.decorationOccupiedCellKeys.has(key)) return false;
    return true;
  }

  getDefenseAt(pos: GridPos): DefenseSnapshot | undefined {
    return this.defenses.find((d) => this.positionsEqual(d.position, pos));
  }

  /**
   * Places a tower if the tile is off the path, not under a decoration, in bounds, and not occupied.
   */
  placeDefense(snapshot: DefenseSnapshot): boolean {
    if (!this.isBuildSlotPosition(snapshot.position)) return false;
    if (this.getDefenseAt(snapshot.position) !== undefined) return false;
    this.defenses.push(cloneDefense(snapshot));
    return true;
  }

  removeDefense(defenseId: string): boolean {
    const i = this.defenses.findIndex((d) => d.id === defenseId);
    if (i < 0) return false;
    this.defenses.splice(i, 1);
    return true;
  }

  /**
   * Increments defense tier (1→2→3) in place. Does nothing if missing or already L3.
   */
  tryIncrementDefenseLevel(defenseId: string): boolean {
    const d = this.defenses.find((x) => x.id === defenseId);
    if (!d || d.level >= 3) return false;
    const next = (d.level + 1) as DefenseLevel;
    d.level = next;
    return true;
  }

  /** Decrements defense tier (3→2→1) in place. Does nothing if missing or already L1. */
  tryDecrementDefenseLevel(defenseId: string): boolean {
    const d = this.defenses.find((x) => x.id === defenseId);
    if (!d || d.level <= 1) return false;
    d.level = ((d.level - 1) as DefenseLevel);
    return true;
  }

  /**
   * Moves an existing defense to another legal empty tile (off path, no decoration).
   * Does nothing if the cell is invalid, occupied, or unchanged.
   */
  tryMoveDefenseTo(defenseId: string, newPos: GridPos): boolean {
    const d = this.defenses.find((x) => x.id === defenseId);
    if (!d) return false;
    if (this.positionsEqual(d.position, newPos)) return false;
    if (!this.isBuildSlotPosition(newPos)) return false;
    if (this.getDefenseAt(newPos) !== undefined) return false;
    d.position = [newPos[0], newPos[1]];
    return true;
  }

  /** Serializable defenses list for save/export. */
  snapshotDefenses(): DefenseSnapshot[] {
    return this.defenses.map(cloneDefense);
  }

  private posKeyFromGrid(pos: GridPos): string {
    return `${pos[0]},${pos[1]}`;
  }

  private positionsEqual(a: GridPos, b: GridPos): boolean {
    return a[0] === b[0] && a[1] === b[1];
  }
}
