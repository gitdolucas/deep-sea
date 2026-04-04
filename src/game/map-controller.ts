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
import type { DefenseSnapshot, GridPos } from "./types.js";

function cloneDefense(d: DefenseSnapshot): DefenseSnapshot {
  return {
    ...d,
    position: [d.position[0], d.position[1]],
  };
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
  private readonly buildSlotKeySet: ReadonlySet<string>;
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
    this.buildSlotKeySet = new Set(
      doc.buildSlots.map((s) => this.posKeyFromGrid(s.position)),
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

  isBuildSlotPosition(pos: GridPos): boolean {
    return this.buildSlotKeySet.has(this.posKeyFromGrid(pos));
  }

  getDefenseAt(pos: GridPos): DefenseSnapshot | undefined {
    return this.defenses.find((d) => this.positionsEqual(d.position, pos));
  }

  /**
   * Places a tower if the tile is a build slot and not occupied.
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
