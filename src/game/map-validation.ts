import { gridCellKey, pathCellKeySetUnion } from "./path-cells.js";
import type {
  BuildSlotType,
  MapDifficulty,
  MapDocument,
} from "./map-types.js";
import type {
  DefenseTypeKey,
  EnemyTypeKey,
  TargetMode,
} from "./types.js";

/** Structured issue for builder UI and tests (`docs/map-schema.md`). */
export interface MapValidationIssue {
  /** Stable code e.g. `grid.bounds`, `refs.path`. */
  code: string;
  /** JSON-pointer-style path e.g. `paths[0].waypoints[2]`. */
  path: string;
  message: string;
}

const DIFFICULTIES = new Set<MapDifficulty>(["normal", "hard", "nightmare"]);

const DEFENSE_TYPES = new Set<DefenseTypeKey>([
  "tideheart_laser",
  "bubble_shotgun",
  "vibration_zone",
  "current_cannon",
  "ink_veil",
  "arc_spine",
]);

const ENEMY_TYPES = new Set<EnemyTypeKey>([
  "stoneclaw",
  "razoreel",
  "abyssal_colossus",
]);

const TARGET_MODES = new Set<TargetMode>([
  "first",
  "last",
  "strongest",
  "weakest",
  "closest",
]);

const BUILD_SLOT_TYPES = new Set<BuildSlotType>(["standard", "reinforced"]);

const DECORATION_KEYS = new Set<string>([
  "coral_branch",
  "coral_fan",
  "kelp_cluster",
  "rock_small",
  "rock_large",
  "shell_pile",
  "vent_bubble",
  "trench_edge",
  "anemone",
  "skull",
]);

function isObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function isIntGridCoord(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Math.floor(n) === n;
}

function push(
  issues: MapValidationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function decorationCellKeys(
  decorations: readonly {
    position: readonly [number, number, number];
  }[],
): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < decorations.length; i++) {
    const p = decorations[i]!.position;
    const gx = Math.floor(p[0]!);
    const gz = Math.floor(p[2]!);
    set.add(gridCellKey(gx, gz));
  }
  return set;
}

/**
 * Validates unknown JSON against `docs/map-schema.md` / `MapDocument`.
 * Empty list means the value is structurally valid for runtime load.
 */
export function validateMapDocument(input: unknown): MapValidationIssue[] {
  const issues: MapValidationIssue[] = [];

  if (!isObject(input)) {
    push(
      issues,
      "shape.root",
      "$",
      "Map root must be a JSON object (see docs/map-schema.md).",
    );
    return issues;
  }

  const doc = input as Record<string, unknown>;
  const id = doc.id;
  if (typeof id !== "string" || id.length === 0) {
    push(issues, "shape.id", "id", "Non-empty string `id` is required.");
  }

  if (typeof doc.name !== "string") {
    push(issues, "shape.name", "name", "String `name` is required.");
  }

  if (doc.description !== undefined) {
    if (typeof doc.description !== "string") {
      push(
        issues,
        "shape.description",
        "description",
        "`description` must be a string when present.",
      );
    } else if (doc.description.length === 0) {
      push(
        issues,
        "shape.description",
        "description",
        "`description` must be non-empty when present.",
      );
    }
  }

  const difficulty = doc.difficulty;
  if (
    typeof difficulty !== "string" ||
    !DIFFICULTIES.has(difficulty as MapDifficulty)
  ) {
    push(
      issues,
      "shape.difficulty",
      "difficulty",
      "`difficulty` must be \"normal\" | \"hard\" | \"nightmare\".",
    );
  }

  if (doc.startingShells !== undefined) {
    const s = doc.startingShells;
    if (typeof s !== "number" || !Number.isFinite(s) || s < 0) {
      push(
        issues,
        "shape.startingShells",
        "startingShells",
        "`startingShells` must be a non-negative number when present.",
      );
    }
  }

  const gridSize = doc.gridSize;
  if (
    !Array.isArray(gridSize) ||
    gridSize.length !== 2 ||
    !isIntGridCoord(gridSize[0]) ||
    !isIntGridCoord(gridSize[1]) ||
    gridSize[0]! < 1 ||
    gridSize[1]! < 1
  ) {
    push(
      issues,
      "grid.size",
      "gridSize",
      "`gridSize` must be [gw, gd] with positive integer dimensions.",
    );
    return issues;
  }

  const [gw, gd] = gridSize as [number, number];

  const inGrid = (x: number, z: number): boolean =>
    x >= 0 && z >= 0 && x < gw && z < gd;

  const castle = doc.castle;
  if (!isObject(castle)) {
    push(issues, "shape.castle", "castle", "`castle` object is required.");
  } else {
    const cpos = castle.position;
    const chp = castle.hp;
    const csize = castle.size;
    if (
      !Array.isArray(cpos) ||
      cpos.length !== 2 ||
      !isIntGridCoord(cpos[0]) ||
      !isIntGridCoord(cpos[1])
    ) {
      push(
        issues,
        "castle.position",
        "castle.position",
        "`castle.position` must be [x, z] integers.",
      );
    } else if (!inGrid(cpos[0]!, cpos[1]!)) {
      push(
        issues,
        "grid.bounds",
        "castle.position",
        "Castle position out of grid bounds.",
      );
    }
    if (typeof chp !== "number" || !Number.isFinite(chp) || chp <= 0) {
      push(
        issues,
        "castle.hp",
        "castle.hp",
        "`castle.hp` must be a positive number.",
      );
    }
    if (
      !Array.isArray(csize) ||
      csize.length !== 2 ||
      !isIntGridCoord(csize[0]) ||
      !isIntGridCoord(csize[1]) ||
      csize[0]! < 1 ||
      csize[1]! < 1
    ) {
      push(
        issues,
        "castle.size",
        "castle.size",
        "`castle.size` must be [w, d] positive integers.",
      );
    } else if (Array.isArray(cpos) && cpos.length === 2) {
      const cx = cpos[0]!;
      const cz = cpos[1]!;
      const cw = csize[0]!;
      const ch = csize[1]!;
      if (
        cx < 0 ||
        cz < 0 ||
        cx + cw > gw ||
        cz + ch > gd ||
        !Number.isInteger(cx) ||
        !Number.isInteger(cz)
      ) {
        push(
          issues,
          "grid.bounds",
          "castle",
          "Castle footprint extends outside `gridSize`.",
        );
      }
    }
  }

  if (!Array.isArray(doc.paths)) {
    push(issues, "shape.paths", "paths", "`paths` must be an array.");
    return issues;
  }

  const paths = doc.paths as unknown[];
  const pathIds = new Set<string>();
  for (let pi = 0; pi < paths.length; pi++) {
    const p = paths[pi];
    const pPath = `paths[${pi}]`;
    if (!isObject(p)) {
      push(issues, "shape.path", pPath, "Each path must be an object.");
      continue;
    }
    const pid = p.id;
    if (typeof pid !== "string" || pid.length === 0) {
      push(issues, "path.id", `${pPath}.id`, "Path `id` must be a non-empty string.");
    } else if (pathIds.has(pid)) {
      push(issues, "path.id.unique", `${pPath}.id`, `Duplicate path id "${pid}".`);
    } else {
      pathIds.add(pid);
    }
    const wps = p.waypoints;
    if (!Array.isArray(wps)) {
      push(
        issues,
        "path.waypoints",
        `${pPath}.waypoints`,
        "`waypoints` must be an array (see docs/map-schema.md § paths).",
      );
    } else if (wps.length < 2) {
      push(
        issues,
        "path.waypoints.length",
        `${pPath}.waypoints`,
        "Each path needs at least 2 waypoints for enemy movement (spawnEnemyFromWaveGroup).",
      );
    } else {
      for (let wi = 0; wi < wps.length; wi++) {
        const w = wps[wi];
        const wPath = `${pPath}.waypoints[${wi}]`;
        if (
          !Array.isArray(w) ||
          w.length !== 2 ||
          !isIntGridCoord(w[0]) ||
          !isIntGridCoord(w[1])
        ) {
          push(
            issues,
            "path.waypoint.shape",
            wPath,
            "Waypoint must be [x, z] integers (grid coords).",
          );
        } else if (!inGrid(w[0]!, w[1]!)) {
          push(issues, "grid.bounds", wPath, "Waypoint out of grid bounds.");
        }
      }
    }
  }

  const pathObjs = paths.filter(isObject);
  const pathKeysUnion =
    pathObjs.length > 0
      ? pathCellKeySetUnion(
          pathObjs.map((p) => ({
            waypoints: Array.isArray(p.waypoints)
              ? (p.waypoints as readonly [number, number][])
              : [],
          })),
        )
      : new Set<string>();

  if (!Array.isArray(doc.spawnPoints)) {
    push(
      issues,
      "shape.spawnPoints",
      "spawnPoints",
      "`spawnPoints` must be an array.",
    );
  } else {
    const spawns = doc.spawnPoints as unknown[];
    const spawnIds = new Set<string>();
    for (let si = 0; si < spawns.length; si++) {
      const s = spawns[si];
      const sPath = `spawnPoints[${si}]`;
      if (!isObject(s)) {
        push(issues, "shape.spawn", sPath, "Each spawn point must be an object.");
        continue;
      }
      const sid = s.id;
      if (typeof sid !== "string" || sid.length === 0) {
        push(issues, "spawn.id", `${sPath}.id`, "Spawn `id` must be a non-empty string.");
      } else if (spawnIds.has(sid)) {
        push(
          issues,
          "spawn.id.unique",
          `${sPath}.id`,
          `Duplicate spawn id "${sid}".`,
        );
      } else {
        spawnIds.add(sid);
      }
      const spos = s.position;
      if (
        !Array.isArray(spos) ||
        spos.length !== 2 ||
        !isIntGridCoord(spos[0]) ||
        !isIntGridCoord(spos[1])
      ) {
        push(
          issues,
          "spawn.position",
          `${sPath}.position`,
          "`position` must be [x, z] integers.",
        );
      } else if (!inGrid(spos[0]!, spos[1]!)) {
        push(
          issues,
          "grid.bounds",
          `${sPath}.position`,
          "Spawn position out of grid bounds.",
        );
      }
      const pids = s.pathIds;
      if (!Array.isArray(pids) || pids.length === 0) {
        push(
          issues,
          "spawn.pathIds",
          `${sPath}.pathIds`,
          "`pathIds` must be a non-empty array of path id strings.",
        );
      } else {
        for (let pi = 0; pi < pids.length; pi++) {
          const ref = pids[pi];
          if (typeof ref !== "string" || !pathIds.has(ref)) {
            push(
              issues,
              "refs.path",
              `${sPath}.pathIds[${pi}]`,
              `Unknown path id "${String(ref)}" (must match a path \`id\`).`,
            );
          }
        }
      }
    }
  }

  if (!Array.isArray(doc.buildSlots)) {
    push(
      issues,
      "shape.buildSlots",
      "buildSlots",
      "`buildSlots` must be an array.",
    );
  } else {
    const slots = doc.buildSlots as unknown[];
    const slotKeys = new Set<string>();
    for (let bi = 0; bi < slots.length; bi++) {
      const b = slots[bi];
      const bPath = `buildSlots[${bi}]`;
      if (!isObject(b)) {
        push(issues, "shape.buildSlot", bPath, "Each build slot must be an object.");
        continue;
      }
      const t = b.type;
      if (
        typeof t !== "string" ||
        !BUILD_SLOT_TYPES.has(t as BuildSlotType)
      ) {
        push(
          issues,
          "buildSlot.type",
          `${bPath}.type`,
          "`type` must be \"standard\" | \"reinforced\".",
        );
      }
      const bpos = b.position;
      if (
        !Array.isArray(bpos) ||
        bpos.length !== 2 ||
        !isIntGridCoord(bpos[0]) ||
        !isIntGridCoord(bpos[1])
      ) {
        push(
          issues,
          "buildSlot.position",
          `${bPath}.position`,
          "`position` must be [x, z] integers.",
        );
        continue;
      }
      const key = gridCellKey(bpos[0]!, bpos[1]!);
      if (slotKeys.has(key)) {
        push(
          issues,
          "buildSlot.dup",
          `${bPath}.position`,
          "Duplicate build slot position.",
        );
      }
      slotKeys.add(key);
      if (!inGrid(bpos[0]!, bpos[1]!)) {
        push(
          issues,
          "grid.bounds",
          `${bPath}.position`,
          "Build slot out of grid bounds.",
        );
        continue;
      }
      if (pathKeysUnion.has(key)) {
        push(
          issues,
          "buildSlot.path",
          `${bPath}.position`,
          "Build slot cannot sit on an enemy path cell (docs/map-schema.md).",
        );
      }
    }
  }

  if (!Array.isArray(doc.decorations)) {
    push(
      issues,
      "shape.decorations",
      "decorations",
      "`decorations` must be an array.",
    );
  } else {
    const decs = doc.decorations as unknown[];
    for (let di = 0; di < decs.length; di++) {
      const d = decs[di];
      const dPath = `decorations[${di}]`;
      if (!isObject(d)) {
        push(issues, "shape.decoration", dPath, "Each decoration must be an object.");
        continue;
      }
      const dt = d.type;
      if (typeof dt !== "string" || !DECORATION_KEYS.has(dt)) {
        push(
          issues,
          "decoration.type",
          `${dPath}.type`,
          "Unknown decoration `type` (see docs/map-schema.md § Decoration Types).",
        );
      }
      const pos = d.position;
      if (
        !Array.isArray(pos) ||
        pos.length !== 3 ||
        typeof pos[0] !== "number" ||
        typeof pos[1] !== "number" ||
        typeof pos[2] !== "number" ||
        !Number.isFinite(pos[0]) ||
        !Number.isFinite(pos[1]) ||
        !Number.isFinite(pos[2])
      ) {
        push(
          issues,
          "decoration.position",
          `${dPath}.position`,
          "`position` must be [x, y, z] numbers.",
        );
      } else {
        const gx = Math.floor(pos[0]!);
        const gz = Math.floor(pos[2]!);
        if (!inGrid(gx, gz)) {
          push(
            issues,
            "grid.bounds",
            `${dPath}.position`,
            "Decoration floor tile (floor(x), floor(z)) out of grid bounds.",
          );
        }
      }
      if (typeof d.rotation !== "number" || !Number.isFinite(d.rotation)) {
        push(
          issues,
          "decoration.rotation",
          `${dPath}.rotation`,
          "`rotation` must be a number (degrees).",
        );
      }
      if (
        typeof d.scale !== "number" ||
        !Number.isFinite(d.scale) ||
        d.scale <= 0
      ) {
        push(
          issues,
          "decoration.scale",
          `${dPath}.scale`,
          "`scale` must be a positive finite number.",
        );
      }
    }
  }

  const decKeysForSlots =
    Array.isArray(doc.decorations) &&
    doc.decorations.every((x) => isObject(x) && Array.isArray((x as { position?: unknown }).position))
      ? decorationCellKeys(
          (doc.decorations as { position: readonly [number, number, number] }[])
            .filter((d) => d.position?.length === 3),
        )
      : new Set<string>();

  if (Array.isArray(doc.buildSlots)) {
    for (let bi = 0; bi < doc.buildSlots.length; bi++) {
      const b = doc.buildSlots[bi] as { position?: unknown };
      if (
        Array.isArray(b.position) &&
        b.position.length === 2 &&
        isIntGridCoord(b.position[0]) &&
        isIntGridCoord(b.position[1])
      ) {
        const key = gridCellKey(b.position[0]!, b.position[1]!);
        if (decKeysForSlots.has(key)) {
          push(
            issues,
            "buildSlot.decoration",
            `buildSlots[${bi}].position`,
            "Build slot cannot sit on a decoration tile (docs/map-schema.md).",
          );
        }
      }
    }
  }

  if (!Array.isArray(doc.defenses)) {
    push(issues, "shape.defenses", "defenses", "`defenses` must be an array.");
  } else {
    const defs = doc.defenses as unknown[];
    const defensePosKeys = new Set<string>();
    const slotKeySet = Array.isArray(doc.buildSlots)
      ? new Set(
          (doc.buildSlots as { position?: unknown }[])
            .filter(
              (s) =>
                Array.isArray(s.position) &&
                s.position.length === 2 &&
                isIntGridCoord(s.position[0]) &&
                isIntGridCoord(s.position[1]),
            )
            .map((s) =>
              gridCellKey(
                (s.position as [number, number])[0]!,
                (s.position as [number, number])[1]!,
              ),
            ),
        )
      : new Set<string>();
    for (let di = 0; di < defs.length; di++) {
      const d = defs[di];
      const dPath = `defenses[${di}]`;
      if (!isObject(d)) {
        push(issues, "shape.defense", dPath, "Each defense must be an object.");
        continue;
      }
      if (typeof d.id !== "string" || d.id.length === 0) {
        push(issues, "defense.id", `${dPath}.id`, "Defense `id` must be a non-empty string.");
      }
      const dtype = d.type;
      if (
        typeof dtype !== "string" ||
        !DEFENSE_TYPES.has(dtype as DefenseTypeKey)
      ) {
        push(
          issues,
          "defense.type",
          `${dPath}.type`,
          "Unknown tower `type` (see docs/map-schema.md § Tower Type Keys).",
        );
      }
      const dpos = d.position;
      if (
        !Array.isArray(dpos) ||
        dpos.length !== 2 ||
        !isIntGridCoord(dpos[0]) ||
        !isIntGridCoord(dpos[1])
      ) {
        push(
          issues,
          "defense.position",
          `${dPath}.position`,
          "`position` must be [x, z] integers.",
        );
        continue;
      }
      const dk = gridCellKey(dpos[0]!, dpos[1]!);
      if (defensePosKeys.has(dk)) {
        push(
          issues,
          "defense.dup",
          `${dPath}.position`,
          "Two defenses cannot share the same tile.",
        );
      }
      defensePosKeys.add(dk);
      if (!slotKeySet.has(dk)) {
        push(
          issues,
          "defense.slot",
          `${dPath}.position`,
          "Defense position must match a `buildSlots` entry (docs/map-schema.md § defenses).",
        );
      }
      const lvl = d.level;
      if (lvl !== 1 && lvl !== 2 && lvl !== 3) {
        push(
          issues,
          "defense.level",
          `${dPath}.level`,
          "`level` must be 1, 2, or 3.",
        );
      }
      const tm = d.targetMode;
      if (typeof tm !== "string" || !TARGET_MODES.has(tm as TargetMode)) {
        push(
          issues,
          "defense.targetMode",
          `${dPath}.targetMode`,
          "Invalid `targetMode` (see docs/map-schema.md § defenses).",
        );
      }
      if (!inGrid(dpos[0]!, dpos[1]!)) {
        push(
          issues,
          "grid.bounds",
          `${dPath}.position`,
          "Defense position out of grid bounds.",
        );
      }
    }
  }

  if (!Array.isArray(doc.waves)) {
    push(issues, "shape.waves", "waves", "`waves` must be an array.");
  } else if (doc.waves.length === 0) {
    push(
      issues,
      "waves.empty",
      "waves",
      "`waves` must contain at least one wave for a playable map.",
    );
  } else {
    const waves = doc.waves as unknown[];
    const spawnIdSet = Array.isArray(doc.spawnPoints)
      ? new Set(
          (doc.spawnPoints as { id?: unknown }[])
            .filter((s) => typeof s.id === "string")
            .map((s) => s.id as string),
        )
      : new Set<string>();
    for (let wi = 0; wi < waves.length; wi++) {
      const w = waves[wi];
      const wPath = `waves[${wi}]`;
      if (!isObject(w)) {
        push(issues, "shape.wave", wPath, "Each wave must be an object.");
        continue;
      }
      if (typeof w.wave !== "number" || !Number.isInteger(w.wave) || w.wave < 1) {
        push(
          issues,
          "wave.number",
          `${wPath}.wave`,
          "`wave` must be a positive integer.",
        );
      }
      if (
        typeof w.prepTime !== "number" ||
        !Number.isFinite(w.prepTime) ||
        w.prepTime < 0
      ) {
        push(
          issues,
          "wave.prepTime",
          `${wPath}.prepTime`,
          "`prepTime` must be a non-negative number.",
        );
      }
      if (typeof w.isBoss !== "boolean") {
        push(
          issues,
          "wave.isBoss",
          `${wPath}.isBoss`,
          "`isBoss` must be boolean.",
        );
      }
      if (!Array.isArray(w.groups) || w.groups.length === 0) {
        push(
          issues,
          "wave.groups",
          `${wPath}.groups`,
          "Each wave must have a non-empty `groups` array.",
        );
        continue;
      }
      const groups = w.groups as unknown[];
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const gPath = `${wPath}.groups[${gi}]`;
        if (!isObject(g)) {
          push(issues, "shape.group", gPath, "Each group must be an object.");
          continue;
        }
        const et = g.enemyType;
        if (
          typeof et !== "string" ||
          !ENEMY_TYPES.has(et as EnemyTypeKey)
        ) {
          push(
            issues,
            "group.enemyType",
            `${gPath}.enemyType`,
            "Unknown `enemyType` (see docs/map-schema.md § Enemy Type Keys).",
          );
        }
        if (
          typeof g.count !== "number" ||
          !Number.isInteger(g.count) ||
          g.count < 1
        ) {
          push(
            issues,
            "group.count",
            `${gPath}.count`,
            "`count` must be a positive integer.",
          );
        }
        const spawnId = g.spawnId;
        if (typeof spawnId !== "string" || !spawnIdSet.has(spawnId)) {
          push(
            issues,
            "refs.spawn",
            `${gPath}.spawnId`,
            `Unknown spawn id "${String(spawnId)}".`,
          );
        }
        const pathId = g.pathId;
        if (typeof pathId !== "string" || !pathIds.has(pathId)) {
          push(
            issues,
            "refs.path",
            `${gPath}.pathId`,
            `Unknown path id "${String(pathId)}".`,
          );
        }
        for (const [key, code, label] of [
          ["interval", "group.interval", "interval"],
          ["delay", "group.delay", "delay"],
          ["hpMultiplier", "group.hpMultiplier", "hpMultiplier"],
          ["speedMultiplier", "group.speedMultiplier", "speedMultiplier"],
        ] as const) {
          const v = g[key];
          if (typeof v !== "number" || !Number.isFinite(v)) {
            push(
              issues,
              code,
              `${gPath}.${label}`,
              `\`${label}\` must be a finite number.`,
            );
          } else if (
            (key === "interval" || key === "delay") &&
            v < 0
          ) {
            push(
              issues,
              code,
              `${gPath}.${label}`,
              `\`${label}\` must be non-negative.`,
            );
          } else if (
            (key === "hpMultiplier" || key === "speedMultiplier") &&
            v <= 0
          ) {
            push(
              issues,
              code,
              `${gPath}.${label}`,
              `\`${label}\` must be positive.`,
            );
          }
        }
      }
    }
  }

  return issues;
}

/** True when `validateMapDocument` returns no issues. */
export function isValidMapDocument(input: unknown): input is MapDocument {
  return validateMapDocument(input).length === 0;
}
