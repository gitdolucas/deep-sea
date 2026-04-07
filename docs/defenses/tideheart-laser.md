# Tideheart Laser

**Type:** Single Target / Precision
**Best Against:** Razoreel

## Description

Refined Tideheart Crystal energy fired in a tight beam. Shreds Razoreels mid-sprint. Maximum precision, single target focus.

## Upgrade Tiers

| Level | Visual                          | Range  | Behavior                                |
|-------|----------------------------------|--------|-----------------------------------------|
| L1    | Single dim beam, small crystal   | Short  | Single target, steady beam              |
| L2    | Dual beam, medium crystal        | Medium | Dual target capability                  |
| L3    | Triple rotating beam, large crystal | Long | Pierces through enemies, triple beam    |

## Sprite Specs

### Level 1
- Compact coral pedestal with a small dim crystal on top
- Faint teal glow (`#00d4ff` at low opacity)
- Static idle animation

### Level 2
- Wider base, crystal splits into two prisms
- Brighter cyan glow, visible radius ring on ground
- Slow pulse idle animation

### Level 3
- Imposing structure, three crystals orbiting a central core
- White-hot core with cyan aura, pulsing radius ring
- Full breathing glow cycle, rotating crystals

## Damage (per tick, before armor)

Authoritative tick cadence: `docs/combat.md` (Attack Speed). Values below are **50% of** the original 4 / 5 / 6 design (L2: 5×0.5 rounded to 3).

| Level | Damage / tick |
|-------|---------------|
| L1    | 2             |
| L2    | 3             |
| L3    | 3 (×3 beams + pierce) |

## Build Cost

| Action   | Cost (Shells) |
|----------|---------------|
| Build    | Base cost     |
| L1 -> L2 | 2x base cost |
| L2 -> L3 | 4x base cost |

## Strategic Notes

- Primary counter to Razoreels — precision damage on fast targets
- At L3, piercing beam can hit multiple enemies in a line
- Pairs well with Vibration Zone to slow targets into the beam path
