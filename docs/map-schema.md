# Map State Schema

JSON format for saving and loading complete map states. Used for level design (pre-built maps) and mid-game save/load.

## File Location

```
data/maps/{map_id}.json
```

---

## Top-Level Structure

```jsonc
{
  "id": "string",           // unique map identifier
  "name": "string",         // display name
  "description": "string",  // optional; main-menu card blurb (non-empty when present)
  "difficulty": "string",   // "normal" | "hard" | "nightmare"
  "gridSize": [x, z],       // map dimensions in tiles
  "castle": { ... },        // citadel placement & state
  "spawnPoints": [ ... ],   // where enemies enter (Null Trench exits)
  "paths": [ ... ],         // coral path definitions (waypoint chains)
  "buildSlots": [ ... ],    // valid positions for placing towers
  "defenses": [ ... ],      // placed towers & their state
  "waves": [ ... ],         // wave definitions with enemy spawns
  "decorations": [ ... ]    // non-gameplay visual props
}
```

---

## Coordinate System

All positions use a **grid-based coordinate system** where each tile is 1 unit.

- `x` — horizontal axis (left to right)
- `z` — depth axis (front to back, toward the Citadel)
- `y` — vertical axis (height, 0 = ocean floor). Only used for decorations.

Origin `[0, 0]` is the **front-left** corner of the map.

### Tower placement vs paths, defenses, and decorations

A grid tile may hold a defense only if all of the following are true:

- The tile is **in bounds** (`gridSize`).
- The tile is **not occupied by the enemy path** (any cell a waypoint segment passes through; see path definitions).
- The tile does **not already have a defense**.
- The tile is **not occupied by a decoration** — each decoration reserves the horizontal tile at `(position[0], position[2])` (same `x` / `z` grid indices as towers; use integer coordinates in map data). Players cannot place defenses on top of decorations.

`buildSlots` list suggested or highlighted positions for UX; they must still respect the rules above (do not list tiles on paths or under decorations).

---

## Section Details

### `castle`

```jsonc
{
  "position": [x, z],      // grid position (center of the citadel)
  "hp": 20,                // max HP (20 normal, 15 hard, 10 nightmare)
  "size": [w, d]            // footprint in tiles (e.g. [3, 2])
}
```

### `spawnPoints`

Array of Null Trench exits where enemies emerge.

```jsonc
[
  {
    "id": "spawn_a",
    "position": [x, z],
    "pathIds": ["path_main"]  // which paths this spawn feeds into
  }
]
```

### `paths`

Each path is an ordered array of waypoints from spawn to castle. Enemies follow these sequentially. Paths can share waypoints (merging paths).

```jsonc
[
  {
    "id": "path_main",
    "waypoints": [
      [0, 1],               // first waypoint (near spawn)
      [2, 1],
      [2, 4],
      [5, 4],
      [5, 7],               // last waypoint (near castle hit zone)
    ]
  }
]
```

Enemies interpolate between waypoints in order. The segment between each pair of waypoints is a straight line — use more waypoints for curves.

### `buildSlots`

Suggested positions for tower placement (UI / map overview). **Buildability** is determined by the rules in [Tower placement vs paths, defenses, and decorations](#tower-placement-vs-paths-defenses-and-decorations) — notably, tiles that host a decoration are never buildable, even if listed here.

```jsonc
[
  {
    "position": [x, z],
    "type": "standard"       // "standard" | "reinforced" (future: bonus slots)
  }
]
```

### `defenses`

Towers currently placed on the map. Empty array for a fresh map. Populated during save.

```jsonc
[
  {
    "id": "def_001",
    "type": "string",        // tower type key (see Tower Types below)
    "position": [x, z],      // must match a buildSlot position
    "level": 1,              // 1 | 2 | 3
    "targetMode": "string"   // "first" | "last" | "strongest" | "weakest" | "closest"
  }
]
```

#### Tower Type Keys

| Key               | Tower           |
|-------------------|-----------------|
| `tideheart_laser` | Tideheart Laser |
| `bubble_shotgun`  | Bubble Shotgun  |
| `vibration_zone`  | Vibration Zone  |
| `current_cannon`  | Current Cannon  |
| `ink_veil`        | Ink Veil        |
| `arc_spine`       | Arc Spine       |

### `waves`

Array of wave definitions. Each wave contains groups of enemies that spawn with timing control.

```jsonc
[
  {
    "wave": 1,                // wave number
    "prepTime": 10,           // seconds before wave starts (build phase)
    "isBoss": false,
    "groups": [
      {
        "enemyType": "string",  // enemy type key (see Enemy Types below)
        "count": 8,
        "spawnId": "spawn_a",   // which spawn point to use
        "pathId": "path_main",  // which path enemies follow
        "interval": 1.2,        // seconds between each enemy in this group
        "delay": 0,             // seconds after wave start before this group begins
        "hpMultiplier": 1.0,    // scales base HP (for difficulty progression)
        "speedMultiplier": 1.0  // scales base speed
      }
    ]
  }
]
```

#### Enemy Type Keys

| Key                | Enemy            |
|--------------------|------------------|
| `stoneclaw`        | Stoneclaw        |
| `razoreel`         | Razoreel         |
| `abyssal_colossus` | Abyssal Colossus |

#### Multiple Groups Per Wave

A single wave can have multiple groups to create complex compositions:

```jsonc
{
  "wave": 8,
  "prepTime": 15,
  "isBoss": false,
  "groups": [
    { "enemyType": "stoneclaw", "count": 12, "spawnId": "spawn_a", "pathId": "path_main", "interval": 0.8, "delay": 0 },
    { "enemyType": "razoreel", "count": 3, "spawnId": "spawn_b", "pathId": "path_flank", "interval": 2.0, "delay": 5 }
  ]
}
```

This spawns 12 Stonecrabs immediately from spawn A, then 3 Razoreels from spawn B after a 5-second delay — forcing the player to handle both paths.

### `decorations`

Non-gameplay visual elements placed on the map. Used by the 3D renderer for ambiance. Each entry **blocks tower placement** on its `(x, z)` tile (`position[0]`, `position[2]`); keep decorations off cells where the player should be able to build.

```jsonc
[
  {
    "type": "string",         // decoration key (see Decoration Types)
    "position": [x, y, z],   // 3D position (y = height above floor)
    "rotation": 0,            // degrees, Y-axis rotation
    "scale": 1.0              // uniform scale multiplier
  }
]
```

#### Decoration Types

| Key              | Description                          |
|------------------|--------------------------------------|
| `coral_branch`   | Branching coral formation            |
| `coral_fan`      | Flat fan coral                       |
| `kelp_cluster`   | Swaying kelp group                   |
| `rock_small`     | Small ocean floor rock               |
| `rock_large`     | Large ocean floor rock               |
| `shell_pile`     | Scattered shells and bones           |
| `vent_bubble`    | Bubble-emitting sea vent             |
| `trench_edge`    | Null Trench rim piece                |
| `anemone`        | Glowing anemone                      |
| `skull`          | Ancient creature skull               |

---

## Runtime Save State

When saving mid-game, additional fields are added at the top level:

```jsonc
{
  // ... all fields above, plus:

  "saveState": {
    "currentWave": 7,           // wave the player is on (0-indexed into waves array)
    "wavePhase": "string",      // "prep" | "active" | "completed"
    "castleHp": 16,             // current citadel HP
    "shells": 245,              // player's current shell count
    "totalShellsEarned": 680,   // lifetime shells (for stats)
    "enemiesKilled": 94,        // total kills
    "wavesCleared": 6,          // waves fully completed
    "perfectWaves": 4,          // waves cleared without citadel damage
    "activeEnemies": [          // enemies currently alive on the map
      {
        "enemyType": "stoneclaw",
        "hp": 8,
        "maxHp": 12,
        "pathId": "path_main",
        "pathProgress": 0.45,   // 0.0 = spawn, 1.0 = citadel (normalized)
        "statusEffects": [
          { "type": "slow", "value": 0.4, "remaining": 1.2 }
        ]
      }
    ]
  }
}
```
