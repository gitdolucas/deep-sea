# Shell Economy

**Currency:** Shells

## Overview

Shells are the in-game currency. They drop from every defeated enemy, floating up from their body with a gentle drift animation before being collected. Different enemies drop different shell types with varying values.

## Shell Types

| Enemy            | Shell Type        | Value   | Drop Behavior                              |
|------------------|-------------------|---------|--------------------------------------------|
| Stoneclaw        | Common Cowrie     | 5-10    | Drops 1-3 shells scattered nearby          |
| Razoreel         | Electric Nautilus | 20-35   | Single shell, crackles with blue electricity |
| Abyssal Colossus | Void Pearl        | 80-150  | Large glowing orb, pulses violet before collecting |

## Collection Mechanic

1. Enemy is killed
2. Shell drops from body with a gentle upward drift animation
3. Auto-collected after **1.5 second** delay
4. Shell floats upward and magnetically drifts toward the HUD counter
5. Shell counter in HUD increases

The collection animation should feel **satisfying and bubbly** — never instant.

## Spending

Shells are spent on:
- **Building new towers** — costs vary by tower type
- **Upgrading existing towers** — L1->L2 costs 2x base, L2->L3 costs 4x base
- **Downgrading** — one tier refunds exactly the shells spent on the removed tier’s upgrade (L3→2 refunds the L2→3 payment, L2→1 refunds the L1→2 payment)
- **Salvaging** — sell a tower back for 50% of total invested shells

## Economy Flow

```
Enemy killed -> Shell drops -> Auto-collect (1.5s delay)
     |
Shell counter in HUD increases
     |
Player places tower (costs shells) OR upgrades existing tower
     |
Stronger defense -> faster kills -> more shells per minute
```

## Bonus Economy

| Bonus             | Trigger                                         | Reward         |
|-------------------|-------------------------------------------------|----------------|
| Tide Bonus        | Complete a wave without the Citadel taking damage | Shell Chest (bonus shells) |
| Combo Multiplier  | Kill enemies in rapid succession                 | Briefly increases shell drop value |
| Salvage           | Sell a tower                                     | 50% of total invested shells returned |

## Visual Design

### Shell Sprites
- **Common Cowrie:** Small spiral shell, warm sandy tones, simple
- **Electric Nautilus:** Medium shell with blue electric sparks around it
- **Void Pearl:** Large glowing orb, deep violet pulse

### HUD Counter
- Dark frosted glass panel in the corner
- Shell icon + number in `#00d4ff` cyan text
- Pixel font
- Subtle bounce animation when shells are collected
