# Deep Abyss TD

A tower defense game set at the bottom of the ocean. Defend the Poseidon Citadel from waves of corrupted sea creatures by building crystal-powered defenses along coral paths.

3D diorama world. 2D pixel art sprites. Hauntingly beautiful. Relentlessly dangerous.

## The Premise

The Tideheart Crystal controls the ocean's currents and life. A dark force called The Murk rises from the Null Trench, corrupting sea creatures and driving them toward the Citadel. If the crystal falls, the ocean dies.

## Tech Stack

| Layer     | Tech       |
|-----------|------------|
| Engine    | Three.js   |
| Sprites   | Pixel art billboards (always face camera) |
| Data      | JSON map files |
| Language  | TypeScript |
| Build     | Vite       |

## Project Structure

```
deep-sea/
  data/
    maps/               # JSON map definitions
      first_trench.json   # MVP map — S-shaped single path
      trench_gate.json    # Full game dual-path map
  docs/
    prd-mvp.md          # MVP scope, numbers, acceptance criteria
    lore.md             # World, factions, story
    style-bible.md      # Art direction, palette, rendering rules
    combat.md           # Full attack pipeline, damage calc, combos
    castle.md           # Poseidon Citadel design
    economy.md          # Shell currency system
    upgrades.md         # 3-tier tower upgrade system
    waves.md            # Wave structure & difficulty scaling
    map-schema.md       # JSON schema for map files
    enemies/
      razoreel.md       # Fast / High Damage
      stoneclaw.md      # Slow / Weak swarm
      abyssal-colossus.md  # Very Slow / Extreme Tank
    defenses/
      tideheart-laser.md   # Single target precision beam
      bubble-shotgun.md    # AOE spread cone
      vibration-zone.md    # Slow radius utility
      current-cannon.md    # Knockback control
      ink-veil.md          # Debuff / blind cloud
      arc-spine.md         # Chain lightning
  assets/
    splash/             # Splash art and prompts
    defenses/           # Tower sprite assets
  src/                  # Game source (TypeScript)
```

## MVP Scope

The first playable build proves the core loop with minimal surface area:

- **1 enemy:** Stoneclaw (12 HP, 2 armor, slow swarm)
- **1 tower:** Arc Spine L1 (8 damage, chains to 2 targets, 1.5s cooldown)
- **1 map:** S-shaped single path, 6 build slots
- **3 waves:** Escalating Stoneclaw count with HP/speed scaling
- **Economy:** Kill enemies, collect shells, place more towers
- **Win/Lose:** Survive 3 waves or castle HP hits 0

Full details in [`docs/prd-mvp.md`](docs/prd-mvp.md).

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Game Design Docs

| Doc | What It Covers |
|-----|----------------|
| [PRD MVP](docs/prd-mvp.md) | Concrete scope, numbers, implementation order, acceptance criteria |
| [Combat](docs/combat.md) | Targeting, damage formula, armor, chain falloff, status effects, combos |
| [Map Schema](docs/map-schema.md) | JSON format for maps, save states, coordinate system |
| [Style Bible](docs/style-bible.md) | Visual direction, color palette, sprite specs, atmosphere |
| [Lore](docs/lore.md) | World building, factions, locations |
| [Economy](docs/economy.md) | Shell drops, costs, bonus mechanics |
| [Upgrades](docs/upgrades.md) | 3-tier system, cost curve, visual progression |
| [Waves](docs/waves.md) | Wave structure, spawn behavior, difficulty scaling |
| [Castle](docs/castle.md) | Citadel HP, damage states, game over |

## Full Game Vision

Beyond the MVP, the complete game includes:

**6 Towers:** Tideheart Laser, Bubble Shotgun, Vibration Zone, Current Cannon, Ink Veil, Arc Spine — each with 3 upgrade tiers.

**3 Enemies:** Stoneclaw (swarm), Razoreel (fast assassin), Abyssal Colossus (boss tank with tentacle hitboxes).

**6 Tower Combos:** "The Trap" (slow + laser), "Exposed" (armor shred + DPS), "The Loop" (knockback + slow), "Double Burn" (stacked DoTs), "Dark Tide" (blind + stun), "Chain Pop" (splash + chain).

**18 waves** across multi-path maps with branching coral paths, boss encounters, and scaling difficulty.
