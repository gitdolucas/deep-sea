---
name: deep-sea-map-strategy
description: >-
  Strategizes Deep Abyss TD map JSON in data/maps — paths, spawn points,
  waves, and starting economy — for fair pacing and defense variety.
  Covers wave choreography: full spawn coverage, multi-group combos
  (delay/interval), path-length travel-time estimates, swarm timing to
  disrupt single-choke builds, and tank-first (meat-ahead) leading for
  Colossus vs fast lanes. Towers go on any open sand (off path, citadel
  footprint, and decorations). Enforces union-footprint tiling rules so
  parallel paths do not sit on adjacent tiles unless you want a merged
  corridor. Weighs enemy strengths / weaknesses vs tower roles, chokepoints,
  multi-path pressure, and prepTime vs player shell budget. Expect non-empty
  decorations spread across off-path sand (never leave `decorations: []` on
  a shipped map). Use when designing or rebalancing maps, authoring waves,
  tuning startingShells, or asking how layout affects Stoneclaw, Razoreel,
  or Abyssal Colossus.
---

# Deep Sea — map & wave strategy

## Authority order

1. **`docs/map-schema.md`** — valid JSON shape, placement rules (path / citadel / decorations block builds; all other tiles are buildable).
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

3. **After moving waypoints** — Re-run validation: any **`defenses`** entry whose `position` lands on a path cell, citadel tile, or decoration tile is **invalid** (`validateMapDocument`).

**Remediation pattern** — If two paths were routed as parallel lines on `x` and `x+1` (or `z` / `z+1`), reroute one leg to **`x−2`** (or farther) so a non-path strip separates the columns, **or** offset the parallel leg so the “touching” segment is eliminated. Example: **`data/maps/map-05-null-depths.json`** had `path_right` on **`x = 10`** beside `path_center` on **`x = 11`**; moving the vertical leg to **`x = 8`** restored **double-I** vertical tiling and any pre-placed tower on the old corridor tile had to move off the new union cells.

When authoring or reviewing maps, **always** ask: for a proposed pair of path polylines, does the **union** on paper match the **intended** connectivity (isolated lanes vs merged hub)?

## Workflow (agent)

1. **Read the target map** (or proposed `gridSize`, castle, spawns, paths) and list: path merge/split points, approximate “long straight” vs “tight corners”, distance from first engagement tile to citadel. **Scan for adjacent parallel path strips** (same `z` run with `Δx = 1`, or same `x` with `Δz = 1`) across **different** `pathId`s unless a real merge is intended; flag violations per **Path footprint & union tiling** above.
2. **Open sand & choke reasoning** — Every tile that is **not** path, **not** inside `castle`’s `position`+`size` rectangle, and **not** under a `decorations` footprint is buildable. Reason about how much open sand exists vs pressure (no separate slot list in JSON).
3. **Decorations coverage** — **`decorations` must be populated across the map**, not an empty array. Scatter ambiance on **sand only** — each tile must be **off** all path union cells, **off** castle footprint, and **off** spawn tiles for the scatter script (`docs/map-schema.md`). Vary `type`, `rotation`, and `scale`; keep integer occupancy consistent with `trunc(position[0])`, `trunc(position[2])`. After layout edits, regenerate with **`node scripts/scatter-map-decorations.mjs`** (or hand-place with the same rules) so art and build blocking stay aligned.
4. **Economy budget** — From `startingShells`, estimate affordable **first purchases** (compare to tower costs in docs / `src/game` tuning). Check whether **wave 1 prepTime** (`waves[0].prepTime` when present) allows a **meaningful** first placement before pressure.
5. **Wave composition** — Follow **Wave strategy playbook** below. Tabulate groups and **spawn coverage**; use travel-time heuristics when tuning `delay` / `interval` / multi-path overlap.
6. **Mob matchup matrix** (qualitative, doc-grounded) — For each enemy in the wave list, note: HP/armor/speed/leak profile, “bunching” vs “spacing” (chain/AoE value), boss or high-HP outliers. Map to **which defense archetypes** answer it (single-target, chain, slow, short-range choke, etc.) without assuming towers that are out of map/product scope unless the user scope includes them. Cross-check playbook **Combos** and **Swarms** so the matrix matches deliberate pressure.
7. **Pacing & fairness** — Early waves should allow **2–3** foundational towers per `docs/waves.md` intent; mid waves should **force coverage or target priority** across paths; late/boss waves should respect **prepTime** and **multi-spawn** pressure. Validate **tank-first** and **swarm** choices against `startingShells` and prep (playbook). Call out degenerate cases (unblockable short path, single choke with no alternate stalls, etc.).
8. **Outputs** — Give structured recommendations: path edits, spawn/path assignments, `prepTime`/`interval`/`delay` tweaks, `startingShells` nudge, `defenses` pre-placement fixes, optional **Wave planning table** (playbook template), and **wave-by-wave risk notes**.

## Wave strategy playbook

Use this when authoring or reviewing `waves` for any map. Field semantics and keys: **`docs/map-schema.md`**. Pacing bands: **`docs/waves.md`**. Enemy roles and stats labels: **`docs/enemies/*.md`**. Live tuning may include **`src/game/enemy-stats.ts`** (e.g. `ENEMY_GLOBAL_STRENGTH_MULT` scales HP; do not assume doc tables match code without checking).

### Spawn coverage contract

- **Map-local expectation:** Across the **entire** `waves` array for that map, every `spawnPoints[*].id` SHOULD appear in at least one `groups[*].spawnId`, unless the design **explicitly** keeps a dormant trench (document why in recommendations or map `description`).
- **Agent output:** Provide a short **coverage table**: `spawn id` → wave index(es) and `pathId`(s) used. Surfaces neglected lanes and one-path-only habits on multi-trench layouts.
- **Intent:** Matches **`docs/waves.md`** multi-path pressure — different trench mouths should matter over a full run, not only in a single climax wave.

### Combos: groups, delay, and density

- **`delay`** — seconds after **wave start** before that group begins spawning.
- **`interval`** — seconds between consecutive spawns **within** the same group (mob index `k = 0 … count−1`).
- **Multiple groups** in one wave = **parallel timelines**: they interleave in real time; overlap is controlled by `delay`, `count`, and `interval` on each group.

**Patterns to name in reviews**

- **Staggered** — same or similar composition but offset `delay` so pressure rises in phases.
- **Stacked** — same `delay`, different `spawnId` / `pathId`: simultaneous multi-lane pressure.
- **Escalation** — light groups first (longer `interval` / lower count), heavier or faster mix later in the wave window.

**Balance context** — Cross-check qualitative roles against docs; HP/leak baselines also depend on code (`enemy-stats.ts`). When quoting “how tanky” a wave feels, note doc vs code if they diverge (project rule: converge implementation to spec when you touch behavior).

### Travel time and arrival reasoning (path length)

Enemies move along waypoint polylines with progress normalized by **total path length in tile units**, where each segment uses **Euclidean length** (`hypot(Δx, Δz)`), not Manhattan “grid steps.” See **`src/game/enemy-controller.ts`** (`totalPathLength`, `segmentLength`).

**Definitions**

- **`L(pathId)`** — Sum of segment lengths for that path’s `waypoints` chain (diagonal legs count longer than axis-only legs).
- **Base speed `v`** (tiles/s, before aura slow / stun): `stoneclaw` **1.5**, `razoreel` **1.1**, `abyssal_colossus` **0.35** (same module as movement).
- **`speedMultiplier`** — Group field; multiplies `v`.

**Nominal travel time** (ignoring stun, ink, vibration slow, etc.):

`T ≈ L / (v * speedMultiplier)`

Treat as **first-order tuning**; real fights add a fudge factor.

**Spawn times** for the `k`th mob in a group (`k` zero-based):

`t_spawn(k) = delay + k * interval`

**Rough time-to-citadel** for that mob:

`t_arrive_citadel(k) ≈ t_spawn(k) + T`

Use this to **intentionally align or separate** arrivals on different `pathId`s (e.g. two groups should pile up at a shared hub vs stay separated).

**Authoring note** — Changing waypoints changes **`L`**; re-estimate after path edits. Prefer axis-aligned polylines when you want predictable “one tile ≈ one unit” mental math; diagonals increase `L` unexpectedly.

### Swarms and strategy disruption

**Goal:** Reduce degenerate dominance of **one choke + one target mode** (e.g. everything files into a single closest-first stack forever).

**Knobs**

- **High `count` + short `interval`** on **two or more paths** with **overlapping active windows** (`delay` so groups breathe at once).
- **Speed mix** — `razoreel` on a long flank vs `stoneclaw` on a short lane forces different tower cadences and ranges.
- **Path-length skew** — Same `delay`, different `L`, yields natural staggering without micro-managing every second.

**Fairness** — Swarms must still respect **`prepTime`** and **`startingShells`** (workflow step 4). Disruption without runway is indistinguishable from bad difficulty.

### Tank-first / “meat ahead” doctrine

**Meaning:** Slow, high-HP threats (`abyssal_colossus`) should **meaningfully lead** the pressure timeline so they **absorb tower attention** (and spatial presence on the path) before fast leaks or dense swarms **peak**. “Lead” is about **effective position on the route over time**, not only spawn order on the clock.

**Tactics in JSON**

- **Similar path length:** give Colossus groups a **lower `delay`** than trailing `razoreel` / dense `stoneclaw` groups so the tank is already under fire when swarms spawn.
- **Geometry-led lead:** longer `pathId` for Colossus with the **same** `delay` already puts the meat ahead; pair with shorter flanks for fast enemies if you want simultaneous trench activity with staggered arrivals.

**Caution:** Colossus is **slow**. If it spawns **late** on a **short** path, it never achieves “ahead of the pack”; use `T ≈ L/v` to sanity-check. Boss or escort patterns ( **`docs/waves.md`** ) should still read as climax, not afterthought.

### Wave planning table (agent template)

When proposing or auditing waves, fill (or attach) a table like:

| Wave | Group | `enemyType` | `count` | `interval` | `delay` | `spawnId` | `pathId` | `L` (approx) | `T` (approx) | Overlap intent |
|------|-------|-------------|---------|------------|---------|-----------|----------|--------------|--------------|----------------|
| 1 | A | … | … | … | … | … | … | … | … | e.g. choke pile-up / split lanes / citadel rush |

`Overlap intent` examples: `none`, `choke_convergence`, `citadel_rush`, `flank_sync`.

### Anti-patterns to flag (wave-specific)

- **Unused spawns** — Map defines many `spawnPoints` but some never appear across **all** waves (unless explicitly dormant).
- **Single-path waves** on maps designed for many trench mouths — wastes layout tension.
- **Symmetric paths, forever asymmetric waves** — fine if intentional; otherwise players never learn secondary lanes.
- **Colossus only after** fast swarms already peaked — undermines meat-ahead pressure (unless deliberate “cleanup” wave).
- **Maximum density** with **no** prep or economy runway — reads as unfair, not strategic.

## Anti-patterns to flag

- **Adjacent parallel path columns/rows (no sand gap)** — union tiling draws **false tees/cross-links** between independent `pathId` lanes; breaks the intended “double straight” read. Separate legs by at least one **non-path** column/row along that run.
- **`decorations: []` or props only in one corner** — floors look flat; always scatter props across **valid** sand per step 3.
- **Decorations eating the only good choke sand** — blocks tower placement where the layout intended pressure.
- **Pre-placed `defenses` on path, citadel, or decoration cells** — invalid per schema.
- **Waves that only punish one defense type** with no time to diversify — unless intentional “puzzle” difficulty.
- **startingShells** that cannot buy **any** reasonable opener before wave 1 ends.
- **Quoting balance numbers only from code** — cross-check **`docs/`** first; cite mismatch if implementation differs.

## Quick reference (project-specific)

- Map files: `data/maps/{id}.json` — top-level **`startingShells`**, `waves`, `paths`, `spawnPoints`, **`defenses`**, **`decorations`** (decorations must be non-empty and distributed on shipped maps; regen: `scripts/scatter-map-decorations.mjs`).
- Enemy keys in waves: `stoneclaw`, `razoreel`, `abyssal_colossus` (see `docs/map-schema.md`).
- Gameplay lives in **`src/game/`**; do not duplicate wave/combat rules in ad-hoc scripts — recommend changes via map JSON and documented tunables.
