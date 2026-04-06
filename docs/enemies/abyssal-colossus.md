# Abyssal Colossus

**Role:** Very Slow / Extreme Tank
**Class:** Boss / Tank

## Lore

The Murk found the deep-trench octopuses and grew them. The Abyssal Colossus stretches across three coral lanes, its tentacles absorbing damage meant for its body. It doesn't rush. It doesn't need to. It simply arrives, and when it does, everything in its path buckles. Killing one requires sustained coordinated fire — and it will drain your defenses dry before the next wave hits.

> "The trench gave it patience. The Murk gave it purpose."

## Stats

| Stat       | Value         |
|------------|---------------|
| HP         | Extreme       |
| Speed      | Very Slow     |
| Damage     | High          |
| Armor      | Heavy         |

## Shell Drop

| Shell Type  | Value   | Drop Behavior                                    |
|-------------|---------|--------------------------------------------------|
| Void Pearl  | 80-150  | Large glowing orb, pulses violet before collecting |

## Sprite Specs

- **Size:** 48x48 px (larger than standard units)
- **Perspective:** 3/4 top-down
- **Outline:** 1px dark border
- **Palette:** 4-6 colors max
  - Body: `#2a0a4a` (deep purple)
  - Murk veins: `#ff3366` (hot pink-red)

## Animation States

| State    | Description                                                   |
|----------|---------------------------------------------------------------|
| Idle     | Tentacles drift and sway, Murk veins pulse rhythmically      |
| Walk     | Slow, heavy drag forward, tentacles pulling along the ground  |
| Attack   | Tentacle slam, ground ripple effect                           |
| Damaged  | Murk veins flash brighter, ink burst from wound               |
| K.O.     | Collapses inward, tentacles go limp, void pearl rises slowly  |

## Behavior

- Moves extremely slowly but absorbs massive damage
- Tentacles can absorb hits meant for the main body
- Requires sustained, coordinated fire from multiple towers
- Immune to Current Cannon crowd control (stun/lift); still takes damage
- Drains tower ammo/cooldowns, leaving gaps for follow-up waves

## Counters

- **Strong against:** Current Cannon CC (immune to stun/lift), single low-DPS towers
- **Weak against:** Vibration Zone (slows it even further), Tideheart Laser L3 (piercing sustained DPS)
