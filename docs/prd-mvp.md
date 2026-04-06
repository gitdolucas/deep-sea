# PRD: Deep Abyss TD — MVP

## Goal

A playable vertical slice that proves the core loop: enemies walk a path, the player places towers, towers kill enemies, enemies drop currency, player places more towers. Three waves, one enemy type, one tower, one map. If this is fun, everything else scales.

---

## Scope

### In Scope

| Feature         | Detail                                      |
|-----------------|---------------------------------------------|
| Enemy           | Stoneclaw L1 only                           |
| Tower           | Arc Spine L1 only (chains 2 targets)        |
| Map             | Single S-shaped path, 1 spawn, 1 castle     |
| Waves           | 3 waves, Stoneclaw only, escalating count    |
| Economy         | Shells drop on kill, spend to place towers   |
| Combat          | Targeting, damage, armor, chain, hit/death   |
| Castle          | HP bar, takes damage when enemies reach end  |
| Win/Lose        | Survive 3 waves = win. Castle HP 0 = lose.  |

### Out of Scope (future)

- Tower upgrades (L2, L3)
- Other towers (Laser, Shotgun, Vibration, Cannon, Ink)
- Other enemies (Razoreel, Colossus)
- Status effects (slow, burn, blind, stun)
- Combo system
- Salvage / sell towers
- Tide Bonus / combo multiplier
- Decorations and ambient particles
- Audio
- Save/Load mid-game
- Multiple maps
- Difficulty modes

---

## Tech Stack

| Layer      | Tech                                |
|------------|-------------------------------------|
| Engine     | Three.js (3D scene, camera, render) |
| Sprites    | Pixel art billboards (always face camera) |
| Data       | JSON map files                      |
| Language   | TypeScript                          |
| Build      | Vite                                |

---

## Map: The First Trench

Single-path S-curve on a 10x12 grid. One spawn point (top-left), one castle (bottom-right). The S-shape forces enemies to pass near multiple build slots, giving the Arc Spine good chain opportunities.

### Layout

```
    0   1   2   3   4   5   6   7   8   9
  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
0 │ S │ · │ · │ · │ · │ · │   │   │   │   │  S = Spawn
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
1 │   │   │   │   │   │ · │   │   │   │   │  · = Path
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
2 │   │   │   │   │   │ · │   │   │   │   │  ○ = Build slot
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
3 │   │   │ ○ │   │   │ · │ · │ · │ · │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
4 │   │   │   │   │   │   │   │   │ · │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
5 │   │   │   │   │ ○ │   │ ○ │   │ · │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
6 │   │ · │ · │ · │ · │ · │   │   │ · │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
7 │   │ · │   │   │   │   │   │   │ · │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
8 │   │ · │   │ ○ │   │ ○ │   │   │ · │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
9 │   │ · │ · │ · │ · │ · │ · │ · │ · │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
10│   │   │   │   │   │   │   │   │   │ ○ │
  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
11│   │   │   │   │   │   │   │   │   │ C │  C = Castle
  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

### Map JSON

```json
{
  "id": "first_trench",
  "name": "The First Trench",
  "difficulty": "normal",
  "gridSize": [10, 12],

  "castle": {
    "position": [9, 11],
    "hp": 20,
    "size": [1, 1]
  },

  "spawnPoints": [
    {
      "id": "spawn_a",
      "position": [0, 0],
      "pathIds": ["path_main"]
    }
  ],

  "paths": [
    {
      "id": "path_main",
      "waypoints": [
        [0, 0],
        [5, 0],
        [5, 3],
        [8, 3],
        [8, 6],
        [1, 6],
        [1, 9],
        [9, 9],
        [9, 11]
      ]
    }
  ],

  "buildSlots": [
    { "position": [2, 3], "type": "standard" },
    { "position": [4, 5], "type": "standard" },
    { "position": [6, 5], "type": "standard" },
    { "position": [3, 8], "type": "standard" },
    { "position": [5, 8], "type": "standard" },
    { "position": [9, 10], "type": "standard" }
  ],

  "defenses": [],

  "waves": [
    {
      "wave": 1,
      "prepTime": 20,
      "isBoss": false,
      "groups": [
        {
          "enemyType": "stoneclaw",
          "count": 5,
          "spawnId": "spawn_a",
          "pathId": "path_main",
          "interval": 1.8,
          "delay": 0,
          "hpMultiplier": 1.0,
          "speedMultiplier": 1.0
        }
      ]
    },
    {
      "wave": 2,
      "prepTime": 15,
      "isBoss": false,
      "groups": [
        {
          "enemyType": "stoneclaw",
          "count": 10,
          "spawnId": "spawn_a",
          "pathId": "path_main",
          "interval": 1.2,
          "delay": 0,
          "hpMultiplier": 1.0,
          "speedMultiplier": 1.0
        }
      ]
    },
    {
      "wave": 3,
      "prepTime": 15,
      "isBoss": false,
      "groups": [
        {
          "enemyType": "stoneclaw",
          "count": 8,
          "spawnId": "spawn_a",
          "pathId": "path_main",
          "interval": 0.8,
          "delay": 0,
          "hpMultiplier": 1.2,
          "speedMultiplier": 1.1
        },
        {
          "enemyType": "stoneclaw",
          "count": 6,
          "spawnId": "spawn_a",
          "pathId": "path_main",
          "interval": 0.6,
          "delay": 8,
          "hpMultiplier": 1.3,
          "speedMultiplier": 1.15
        }
      ]
    }
  ],

  "decorations": []
}
```

**Placement:** Towers may only go on in-bounds tiles that are off the enemy path, not already holding a tower, and **not sharing the `(x,z)` tile of a decoration** (see `docs/map-schema.md`).

---

## Concrete Numbers

All values pinned for MVP. No ranges — single deterministic numbers so behavior is testable.

### Stoneclaw

| Stat       | Value   |
|------------|---------|
| HP         | 12      |
| Speed      | 1.5 tiles/s |
| Armor      | 2       |
| Citadel Damage | 1   |
| Shell Drop | 8 (fixed, Common Cowrie) |

### Arc Spine L1

| Stat            | Value          |
|-----------------|----------------|
| Damage          | 8 (primary)    |
| Chain targets   | 2              |
| Chain falloff   | 0.8x per jump (primary 8, chain 6) |
| Attack speed    | 1.5s cooldown  |
| Range           | 3 tiles radius |
| Chain range     | 2 tiles (from previous target) |
| Targeting       | Closest        |
| Build cost      | 30 shells      |

### Damage vs Stoneclaw

```
Primary hit:  max(1, 8 - 2) = 6 damage
Chain hit:    max(1, 6 - 2) = 4 damage
```

A single Arc Spine L1 fires every 1.5s, killing a Stoneclaw (12 HP) in 2 shots if it's the primary target (6 + 6 = 12). Chain targets take 4 per hit, dying in 3 shots.

### Castle

| Stat   | Value |
|--------|-------|
| Max HP | 20    |

### Starting Shells

| Value | Rationale                         |
|-------|-----------------------------------|
| 50    | Enough to place 1 tower (30) + save 20 toward a second. Forces a choice on first placement. |

### Economy Check

| Wave | Enemies | Shells Earned | Cumulative | Towers Affordable (30 each) |
|------|---------|---------------|------------|------------------------------|
| Pre  | —       | 50 (start)    | 50         | 1                            |
| 1    | 5       | 40            | 90         | 3                            |
| 2    | 10      | 80            | ~140*      | 4                            |
| 3    | 14      | 112           | ~222*      | 7                            |

*After spending on towers. The player should be placing towers between waves, so actual bank fluctuates. With 6 build slots and 30 cost each, the player can fill the map by mid-wave-3 if efficient.

---

## Game States

```
[LOADING] → [PREP] → [WAVE] → [WAVE_END] → [PREP] → ... → [WIN] or [LOSE]
```

| State      | What Happens                                                    |
|------------|-----------------------------------------------------------------|
| LOADING    | Parse map JSON, build 3D scene, place path/castle/slots         |
| PREP       | Player can place towers on build slots. Timer counts down. "TIDE {n}" displayed. Click "Start Wave" or wait for timer. |
| WAVE       | Enemies spawn per wave config. Towers fire automatically. Shells drop on kills. |
| WAVE_END   | Last enemy killed or reaches castle. Brief pause. If waves remain → PREP. If wave 3 done → WIN. |
| WIN        | "THE DEEP ENDURES" message. Show stats (kills, shells earned, castle HP remaining). |
| LOSE       | Castle HP reaches 0 at any point. Crystal shatter. "THE DEEP FALLS" message. |

---

## Player Interactions

Only 3 actions in the MVP:

| Action          | Input              | Result                                  |
|-----------------|--------------------|-----------------------------------------|
| Select build slot | Click empty slot  | Opens placement UI (just Arc Spine + cost). Slot highlights. |
| Place tower     | Click Arc Spine icon | If enough shells: tower appears, shells deducted. If not: flash red, nothing happens. |
| Start wave      | Click "Send Wave" button | Skip remaining prep timer, start spawning. |

No tower selling. No targeting mode switch. No upgrade. Minimal UI surface.

---

## UI Elements

### HUD (always visible during PREP and WAVE)

```
┌──────────────────────────────────────────┐
│  🐚 50          TIDE 1         ♥ 20/20  │
│  (shells)       (wave)     (castle HP)   │
└──────────────────────────────────────────┘
```

- **Shell counter** — top-left, shell icon + number, bounces on collect
- **Wave indicator** — top-center, "TIDE {n}" in pixel font
- **Castle HP** — top-right, heart icon + current/max

### Build Panel (on slot click)

```
┌─────────────────┐
│  ⚡ Arc Spine    │
│  Cost: 30 🐚    │
│  [  BUILD  ]    │
└─────────────────┘
```

Small panel near the selected slot. One button. Grayed out if not enough shells.

### Wave Start Button (during PREP)

```
┌──────────────┐
│  SEND WAVE ▶ │
│   0:15       │
└──────────────┘
```

Bottom-center. Shows remaining prep time. Clicking starts the wave early.

### Damage Numbers

White pixel numbers float up from hit enemies. Gray if armor-reduced to minimum (1 damage).

### HP Bars

Thin bar above enemy sprites. Green → yellow → red. Only visible after first hit.

---

## Rendering

### Scene Setup

- **Camera:** Fixed perspective, angled ~45deg looking down at the ocean floor
- **Background:** Solid `#050d1a` (near black-blue)
- **Ocean floor:** Flat plane, `#0a1628` (dark navy)
- **Path tiles:** Raised slightly, `#1a3a2a` teal-green with `#ff6b6b` coral edge highlights
- **Build slots:** Subtle glowing outlines on valid tiles (dim cyan), brighter on hover
- **Castle:** Simple 3D block/structure at path end, `#112f55`, with a glowing cyan crystal on top (`#00d4ff`)
- **Spawn point:** Dark hole/vent at path start, faint particle emission

### Sprites (Billboards)

All pixel art rendered as textured quads that always face the camera.

- **Stoneclaw:** 32x32, walk animation (4 frames), hit flash, death animation
- **Arc Spine L1:** 32x32, idle (with occasional spark), fire animation (bright flash)
- **Common Cowrie:** 16x16, simple shell, floats up on drop

### Effects

- **Chain lightning:** Line renderer between Arc Spine and targets, bright `#00ffcc`, flashes for 0.15s per attack
- **Hit flash:** Enemy sprite goes white for 0.1s
- **Death:** Enemy sprite fades out over 0.3s, shell floats up
- **Shell collect:** Shell drifts toward HUD counter over 0.8s, counter bumps

---

## Implementation Order

Build these systems in this order. Each step is testable before moving to the next.

### 1. Scene & Map Loader
- Parse `first_trench.json`
- Render grid floor, path tiles, build slots, castle, spawn point
- Set up camera

### 2. Enemy System
- Spawn a Stoneclaw at spawn point
- Follow waypoints along the path at configured speed
- Reach castle → deal damage → remove enemy
- HP bar rendering

### 3. Tower Placement
- Click build slot → show build panel
- Place Arc Spine → deduct shells → tower appears on grid
- Shell counter in HUD

### 4. Combat
- Arc Spine acquires target (closest in range)
- Fires every 1.5s — primary hit + chain to 1 nearest neighbor
- Damage calculation: `max(1, damage - armor)`
- Chain lightning visual
- Hit flash + floating damage numbers

### 5. Death & Economy
- Enemy death animation + shell drop
- Shell auto-collect after 1.5s delay
- Shell counter updates

### 6. Wave System
- Prep phase with timer + "Send Wave" button
- Spawn enemies per wave config (count, interval, delay)
- Wave end detection (all enemies dead or reached castle)
- Advance to next wave or trigger win/lose

### 7. Game States & UI
- Win screen after wave 3
- Lose screen on castle HP 0
- Castle HP bar in HUD
- Wave indicator

---

## Acceptance Criteria

The MVP is done when:

- [ ] Map loads from JSON and renders correctly (path, slots, castle, spawn)
- [ ] Stonecrabs spawn and walk the S-path at correct speed
- [ ] Stonecrabs reaching the castle deal 1 damage and are removed (no shell drop)
- [ ] Player can click a build slot and place an Arc Spine for 30 shells
- [ ] Arc Spine targets closest enemy, fires every 1.5s, chain hits 1 additional target
- [ ] Damage numbers appear: 6 (primary), 4 (chain)
- [ ] Enemies flash white on hit, show HP bar
- [ ] Enemies die at 0 HP, play death animation, drop 8 shells
- [ ] Shells auto-collect after 1.5s, counter updates
- [ ] 3 waves play in sequence with prep phases between them
- [ ] Wave 3 has HP/speed scaling (crabs are tougher and faster)
- [ ] Castle HP reaching 0 triggers lose state
- [ ] Surviving all 3 waves triggers win state
- [ ] Player starts with 50 shells, can place 1 tower before wave 1
- [ ] The game is fun — placing towers in the right spots matters
