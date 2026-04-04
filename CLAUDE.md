# CLAUDE.md

## Project Overview

Deep Abyss TD is a tower defense game built with Three.js and TypeScript. 3D diorama environment with 2D pixel art billboard sprites. Deep sea theme — dark ocean floor, bioluminescent glow, coral paths.

## Current Phase: MVP

We are building the MVP as defined in `docs/prd-mvp.md`. The scope is deliberately minimal:
- 1 enemy (Stoneclaw), 1 tower (Arc Spine L1), 1 map, 3 waves
- Core loop: enemies walk path -> player places towers -> towers kill enemies -> shells drop -> player places more towers

## Tech Stack

- **Three.js** for 3D rendering
- **TypeScript** (strict mode)
- **Vite** for build/dev
- **JSON** for map data (`data/maps/`)

## Key Design Docs

Read these before making changes:

- `docs/prd-mvp.md` — MVP scope, all concrete numbers, acceptance criteria, implementation order
- `docs/combat.md` — Damage formula, targeting, chain mechanics, hit pipeline
- `docs/map-schema.md` — JSON schema for map files and save state
- `docs/style-bible.md` — Color palette, sprite specs, rendering rules

## Architecture Principles

- **Data-driven maps.** Maps are JSON files loaded at runtime. Never hardcode map layout, wave data, or slot positions. Parse from `data/maps/*.json`.
- **Sprites are billboards.** All pixel art (enemies, towers, shells, effects) are textured quads that always face the camera. Use Three.js `Sprite` or billboard quads.
- **Grid-based coordinates.** Positions use `[x, z]` grid coords. 1 tile = 1 unit. Origin `[0,0]` is front-left. `y` is height (0 = ocean floor).
- **Waypoint pathfinding.** Enemies follow ordered waypoint arrays from the map JSON. They interpolate linearly between waypoints. No A* or navmesh needed.
- **Fixed camera.** Perspective camera at ~45deg looking down. No camera controls in MVP.

## Concrete Numbers (MVP)

These are pinned. Do not change without updating `docs/prd-mvp.md`:

```
Stoneclaw:    12 HP, 2 armor, 1.5 tiles/s, 1 citadel damage, drops 8 shells
Arc Spine L1: 8 damage, chains 2, 0.8x falloff, 1.5s cooldown, 3-tile range, 2-tile chain range, costs 30 shells
Castle:       20 HP
Start shells: 50
Damage calc:  max(1, base_damage - armor)
  Primary hit vs Stoneclaw: max(1, 8-2) = 6
  Chain hit vs Stoneclaw:   max(1, 6-2) = 4
```

## Color Palette

```
Background:    #050d1a (near black-blue)
Ocean floor:   #0a1628 (dark navy)
Coral paths:   #1a3a2a (teal-green) + #ff6b6b (coral highlights)
Citadel:       #112f55 (deep blue-gray)
Glow:          #00d4ff (cyan), #7b2fff (violet), #39ff6e (green)
Stoneclaw:     #8b4513 (rust brown) + #c0a060 (sandy shell)
Chain effect:  #00ffcc (bright cyan-green)
UI text:       #00d4ff (cyan)
```

## Implementation Order

Follow this sequence. Each step should be testable independently:

1. **Scene & Map Loader** — Parse JSON, render grid/path/slots/castle/spawn, set up camera
2. **Enemy System** — Spawn Stoneclaw, follow waypoints, reach castle -> deal damage
3. **Tower Placement** — Click slot -> build panel -> place tower -> deduct shells
4. **Combat** — Targeting (closest), fire cycle (1.5s), chain lightning, damage calc
5. **Death & Economy** — Death anim, shell drop, auto-collect (1.5s delay), counter update
6. **Wave System** — Prep timer, "Send Wave" button, spawn per config, wave end detection
7. **Game States & UI** — Win/lose screens, HUD (shells, wave, castle HP)

## Code Style

- Keep game systems modular: separate files for enemies, towers, combat, waves, economy, map-loader
- Use a central game state object (not scattered globals)
- Entity types use the keys from map schema: `stoneclaw`, `arc_spine`, etc.
- Damage formula lives in one place, not duplicated per tower
- All timing values (cooldowns, intervals, delays) are in seconds

## File Conventions

- Source code in `src/`
- Map data in `data/maps/` (JSON, follows schema in `docs/map-schema.md`)
- Pixel art assets in `assets/`
- Game design docs in `docs/` (do not modify without discussion)

## What Not To Do

- Do not add towers, enemies, or mechanics beyond MVP scope
- Do not implement upgrades, selling, status effects, or combos yet
- Do not add audio in MVP
- Do not hardcode map layout — always load from JSON
- Do not add camera controls
- Do not over-engineer: no ECS, no physics engine, no complex state machines
