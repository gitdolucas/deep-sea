---
name: deep-sea-map-strategy
description: >-
  Strategizes Deep Abyss TD map JSON in data/maps — paths, spawn points,
  build slots, waves, and starting economy — for fair pacing and defense
  variety. Enforces union-footprint tiling rules so parallel paths do not
  sit on adjacent tiles unless you want a merged corridor. Weighs enemy
  strengths/weaknesses vs tower roles, chokepoints, multi-path pressure,
  and prepTime vs player shell budget. Use when designing or rebalancing
  maps, authoring waves, planning buildSlots, tuning startingShells, or
  asking how layout affects Stoneclaw, Razoreel, or Abyssal Colossus.
---

# Deep Sea — map & wave strategy

## Authority order

1. **`docs/map-schema.md`** — valid JSON shape, placement rules (paths, decorations block builds, `buildSlots` vs real buildability).
2. **`docs/combat.md`** — damage, armor, ranges, targeting, special enemy rules (verify numbers; code may lag spec).
3. **`docs/waves.md`** — narrative pacing bands (early/mid/late/boss intent).
4. **`docs/economy.md`** — shell flow, drops, spending; map-level **`startingShells`** (per-map override; see existing `data/maps/*.json`).
5. **`docs/enemies/*.md`** — per-mob role, stats labels, behaviors.
6. **`docs/defenses/*.md`** — tower roles, ranges, costs (for “what can player afford” reasoning).

When docs conflict on **MVP-pinned** numbers, prefer **`docs/prd-mvp.md`** for that slice and note the inconsistency.

## Path footprint & union tiling (floor art)

The renderer classifies each **path** tile using the **union** of every cell touched by **any** `paths[*].waypoints` polyline (see **`docs/map-schema.md` — Path footprint and tiling (union)**). A cardinal “arm” is drawn toward a neighbor **iff** that neighbor is also on the union — **not** per individual `pathId`.

**Constraints for correct-looking corridors**

1. **Independent parallel straights** — If two routes should read as **separate vertical (or horizontal) lanes** with **no** sideways link between them, their path cells **must not be edge-adjacent** along the length of the parallel run. Leave **at least one whole grid column or row** (no path segment from any path on those tiles) between the two polylines in that region. Otherwise the union sees left/right (or north/south) neighbors on every row and draws **false tees** or crosses (“ladder” of Ts) even though mobs never change `pathId`.

2. **Intentional merges** — **T**, **corner**, and **+** shapes are correct when **both** (or all) paths **actually include** those hub cells in their waypoint chains (shared segment / real merge). Do not rely on “almost touching” adjacent columns to imply separation — the engine treats adjacent path tiles as **physically connected** in the union.

3. **After moving waypoints** — Re-run a **buildability check**: any `buildSlots` position that lands on a new union cell is **invalid** (`validateMapDocument` / schema).

**Remediation pattern** — If two paths were routed as parallel lines on `x` and `x+1` (or `z` / `z+1`), reroute one leg to **`x−2`** (or farther) so a non-path strip separates the columns, **or** offset the parallel leg so the “touching” segment is eliminated. Example: **`data/maps/map-05-null-depths.json`** had `path_right` on **`x = 10`** beside `path_center` on **`x = 11`**; moving the vertical leg to **`x = 8`** restored **double-I** vertical tiling and required moving a `buildSlot` off **`[8, 11]`**.

When authoring or reviewing maps, **always** ask: for a proposed pair of path polylines, does the **union** on paper match the **intended** connectivity (isolated lanes vs merged hub)?

## Workflow (agent)

1. **Read the target map** (or proposed `gridSize`, castle, spawns, paths) and list: path merge/split points, approximate “long straight” vs “tight corners”, distance from first engagement tile to citadel. **Scan for adjacent parallel path strips** (same `z` run with `Δx = 1`, or same `x` with `Δz = 1`) across **different** `pathId`s unless a real merge is intended; flag violations per **Path footprint & union tiling** above.
2. **Buildability audit** — Ensure `buildSlots` only sit on tiles that are not path segments, not under `decorations` footprint (decorations reserve `(position[0], position[2])`). Flag any slot that cannot actually be built per schema rules.
3. **Economy budget** — From `startingShells`, estimate affordable **first purchases** (compare to tower costs in docs / `src/game` tuning). Check whether **wave 1 prepTime** (`waves[0].prepTime` when present) allows a **meaningful** first placement before pressure.
4. **Wave composition** — For each wave, tabulate groups: `enemyType`, `count`, `interval`, `delay`, `spawnId`, `pathId`, multipliers. Reason about **overlapping threats** (different delays/paths) vs **single-file** lanes.
5. **Mob matchup matrix** (qualitative, doc-grounded) — For each enemy in the wave list, note: HP/armor/speed/leak profile, “bunching” vs “spacing” (chain/AoE value), boss or high-HP outliers. Map to **which defense archetypes** answer it (single-target, chain, slow, short-range choke, etc.) without assuming towers that are out of map/product scope unless the user scope includes them.
6. **Pacing & fairness** — Early waves should allow **2–3** foundational towers per `docs/waves.md` intent; mid waves should **force coverage or target priority** across paths; late/boss waves should respect **prepTime** and **multi-spawn** pressure. Call out degenerate cases (unblockable short path, single choke with no alternate stalls, etc.).
7. **Outputs** — Give structured recommendations: path edits, spawn/path assignments, `prepTime`/`interval`/`delay` tweaks, `startingShells` nudge, `buildSlots` additions/removals (with buildability rationale), and optional **wave-by-wave risk notes**.

## Anti-patterns to flag

- **Adjacent parallel path columns/rows (no sand gap)** — union tiling draws **false tees/cross-links** between independent `pathId` lanes; breaks the intended “double straight” read. Separate legs by at least one **non-path** column/row along that run.
- **Decorations on build-critical tiles** — blocks placement unexpectedly.
- **buildSlots on path cells** — invalid per schema; confuses players.
- **Waves that only punish one defense type** with no time to diversify — unless intentional “puzzle” difficulty.
- **startingShells** that cannot buy **any** reasonable opener before wave 1 ends.
- **Quoting balance numbers only from code** — cross-check **`docs/`** first; cite mismatch if implementation differs.

## Quick reference (project-specific)

- Map files: `data/maps/{id}.json` — top-level **`startingShells`**, `waves`, `paths`, `spawnPoints`, `buildSlots`, `decorations`.
- Enemy keys in waves: `stoneclaw`, `razoreel`, `abyssal_colossus` (see `docs/map-schema.md`).
- Gameplay lives in **`src/game/`**; do not duplicate wave/combat rules in ad-hoc scripts — recommend changes via map JSON and documented tunables.
