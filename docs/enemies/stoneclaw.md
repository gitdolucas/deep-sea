# Stoneclaw

**Role:** Slow / Weak
**Class:** Swarm

## Lore

Bottom-dwellers, barely a threat alone. Their shells absorb the Murk's energy and calcify into crude armor. They march in vast numbers, mindlessly, relentlessly. Easy to kill — but they come in waves so thick they clog the coral paths, blocking your line of sight and slowing your defenses' targeting. They are not a weapon. They are a flood.

> "A thousand pebbles can still bury a citadel."

## Stats

| Stat       | Value       |
|------------|-------------|
| HP         | Low         |
| Speed      | Slow        |
| Damage     | Low         |
| Armor      | Light       |

## Shell Drop

| Shell Type    | Value | Drop Behavior                        |
|---------------|-------|--------------------------------------|
| Common Cowrie | 5-10  | Drops 1-3 shells scattered nearby    |

## Sprite Specs

- **Size:** 32x32 px
- **Perspective:** 3/4 top-down
- **Outline:** 1px dark border
- **Palette:** 4-6 colors max
  - Body: `#8b4513` (rust brown)
  - Shell: `#c0a060` (sandy shell)

## Animation States

| State    | Description                                        |
|----------|----------------------------------------------------|
| Idle     | Slight side-to-side wobble, claws twitch           |
| Walk     | Slow shuffling crawl, shell bobs                   |
| Attack   | Claws snap forward                                 |
| Damaged  | Shell cracks visibly, staggers                     |
| K.O.     | Flips over, shell crumbles, cowrie shells float up |

## Behavior

- Spawns in massive numbers
- Clogs coral paths with sheer volume
- Individually weak but overwhelming as a group
- Can block line of sight for towers targeting enemies behind them

## Counters

- **Strong against:** Single-target weapons (wastes their shots)
- **Weak against:** Bubble Shotgun (AOE spread), Arc Spine (chain damage)
