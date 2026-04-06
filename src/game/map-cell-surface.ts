import type { MapDocument } from "./map-types.js";
import {
  gridCellKey,
  pathCellKeySetUnion,
  pathCellNeighborOffsets,
  pathCellVisualKind,
  type PathCellVisualKind,
} from "./path-cells.js";
import type { GridPos } from "./types.js";

/** Derived terrain / feature label for one grid tile (docs/map-schema.md). */
export type MapCellSurfaceKind =
  | "sand"
  | "path"
  | "decoration"
  | "castle"
  | "spawn";

export interface MapCellSurfaceContext {
  readonly pathKeys: ReadonlySet<string>;
  readonly decorationKeys: ReadonlySet<string>;
  readonly spawnKeys: ReadonlySet<string>;
  readonly castleRect: (gx: number, gz: number) => boolean;
}

export interface MapCellSurface {
  readonly surfaceKind: MapCellSurfaceKind;
  /** Neighbor-derived path shape; non-null only when `surfaceKind === "path"`. */
  readonly pathShape: PathCellVisualKind | null;
  /**
   * Cardinal steps to adjacent path cells; empty or null when not on the path graph.
   * Used to orient straight / corner / junction cap art to the grid (+x / +z).
   */
  readonly pathNeighborOffsets: readonly GridPos[] | null;
  /** Short debug label (single token). */
  readonly label: string;
}

/** Precompute sets once per board build; then call {@link classifyMapCellSurface} per tile. */
export function createMapCellSurfaceContext(
  doc: MapDocument,
): MapCellSurfaceContext {
  const pathKeys =
    doc.paths.length > 0 ? pathCellKeySetUnion(doc.paths) : new Set<string>();
  const decorationKeys = new Set<string>();
  for (const d of doc.decorations) {
    const gx = Math.trunc(d.position[0]);
    const gz = Math.trunc(d.position[2]);
    decorationKeys.add(gridCellKey(gx, gz));
  }
  const spawnKeys = new Set(
    doc.spawnPoints.map((sp) =>
      gridCellKey(sp.position[0], sp.position[1]),
    ),
  );
  const [cx, cz] = doc.castle.position;
  const [cw, ch] = doc.castle.size;
  const castleRect = (gx: number, gz: number): boolean =>
    gx >= cx && gx < cx + cw && gz >= cz && gz < cz + ch;

  return {
    pathKeys,
    decorationKeys,
    spawnKeys,
    castleRect,
  };
}

/**
 * Priority: decoration &gt; castle &gt; spawn &gt; path &gt; sand (matches buildability intent).
 */
export function classifyMapCellSurface(
  ctx: MapCellSurfaceContext,
  gx: number,
  gz: number,
): MapCellSurface {
  const key = gridCellKey(gx, gz);
  if (ctx.decorationKeys.has(key)) {
    return {
      surfaceKind: "decoration",
      pathShape: null,
      pathNeighborOffsets: null,
      label: "decoration",
    };
  }
  if (ctx.castleRect(gx, gz)) {
    return {
      surfaceKind: "castle",
      pathShape: null,
      pathNeighborOffsets: null,
      label: "castle",
    };
  }
  if (ctx.spawnKeys.has(key)) {
    return {
      surfaceKind: "spawn",
      pathShape: null,
      pathNeighborOffsets: null,
      label: "spawn",
    };
  }
  if (ctx.pathKeys.has(key)) {
    const pathNeighborOffsets = pathCellNeighborOffsets(gx, gz, ctx.pathKeys);
    const pathShape = pathCellVisualKind(gx, gz, ctx.pathKeys);
    if (!pathShape) {
      return {
        surfaceKind: "sand",
        pathShape: null,
        pathNeighborOffsets: null,
        label: "sand",
      };
    }
    return {
      surfaceKind: "path",
      pathShape,
      pathNeighborOffsets,
      label: "path",
    };
  }
  return {
    surfaceKind: "sand",
    pathShape: null,
    pathNeighborOffsets: null,
    label: "sand",
  };
}

/** Sorted signature for texture/material dedupe (canonical neighbor set). */
export function pathNeighborOffsetsTextureKey(
  offsets: readonly GridPos[],
): string {
  if (offsets.length === 0) return "";
  return [...offsets]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(([dx, dz]) => `${dx},${dz}`)
    .join("|");
}

/** Stable key for sharing one canvas texture across many tiles. */
export function mapCellTopTextureKey(surface: MapCellSurface): string {
  if (
    surface.surfaceKind === "path" &&
    surface.pathShape &&
    surface.pathNeighborOffsets &&
    surface.pathNeighborOffsets.length > 0
  ) {
    return `path:${surface.pathShape}:${pathNeighborOffsetsTextureKey(surface.pathNeighborOffsets)}`;
  }
  if (surface.surfaceKind === "path" && surface.pathShape) {
    return `path:${surface.pathShape}`;
  }
  return surface.surfaceKind;
}
