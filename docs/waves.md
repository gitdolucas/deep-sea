# Wave System

## Overview

Enemies emerge from the **Null Trench** — a lightless chasm at the edge of the map — and travel along **coral paths** toward the **Poseidon Citadel**. Waves escalate in difficulty, mixing enemy types and introducing new threats over time.

## The Threat — The Feral Surge

Something stirred in the Null Trench. A corrupting force called **The Murk** — a dark biological intelligence — seeped upward, rewiring the minds of sea creatures. It strips them of instinct and replaces it with a single drive: **destroy the Tideheart Crystal**.

The Feral Surge began without warning. Entire schools turned hostile overnight.

## Wave Structure

### Early Waves (1-5): The Scouts
- **Composition:** Stoneclaw only
- **Purpose:** Let the player learn mechanics, place first towers
- **Density:** Low, slow trickle
- **Shell income:** Low but sufficient for 2-3 L1 towers

### Mid Waves (6-12): The Pressure
- **Composition:** Stoneclaw swarms + Razoreel flankers
- **Purpose:** Force the player to diversify defenses
- **Density:** Medium, mixed pacing (slow crabs then fast eels)
- **Shell income:** Increasing, enough to start upgrading

### Late Waves (13-18): The Siege
- **Composition:** All three enemy types
- **Purpose:** Test full defense coverage, introduce the Abyssal Colossus
- **Density:** High, overlapping waves
- **Shell income:** High but costs are steep

### Boss Waves (every 5th or 10th wave)
- **Composition:** Abyssal Colossus + escort swarms
- **Purpose:** Climactic challenge requiring prepared defenses
- **Special:** Warning announcement before boss wave — deep rumble, screen darkens

## Wave Announcement

Before each wave:
1. **Wave counter** appears in the HUD (e.g., "TIDE 7")
2. **Enemy preview icons** show what's coming (small pixel art thumbnails)
3. Brief **preparation timer** — player can build/upgrade
4. **Murk energy** visibly rises from the Null Trench as enemies spawn

### Boss Wave Announcement
- Intense low-frequency rumble
- Screen subtly darkens
- The Null Trench glows with Murk energy
- Text: **"THE DEEP STIRS..."**
- Longer preparation timer

## Spawn Points

Enemies emerge from the **Null Trench** — visualized as a dark chasm at the map edge with swirling Murk particles. Different enemy types may spawn from different points along the trench to create multi-path pressure.

## Coral Paths

- Paths wind in natural **S-curves** or **branching layouts** from the Null Trench to the Citadel
- Paths are lined with **glowing coral** that faintly pulses, guiding the player's eye
- Branching paths create **chokepoints** — ideal tower placement spots
- The path material is teal-green coral (`#1a3a2a`) with red coral highlights (`#ff6b6b`)

## Wave Completion

When a wave is cleared:
1. All remaining shells auto-collect
2. **"TIDE SURVIVED"** text appears
3. **Tide Bonus** awarded if Citadel took no damage
4. Brief respite before next wave prep timer begins

## Difficulty Scaling

| Factor            | How it scales                                    |
|-------------------|--------------------------------------------------|
| Enemy count       | More enemies per wave                            |
| Enemy HP          | Gradual increase in base HP                      |
| Enemy speed       | Slight increase for Stonecrabs in later waves    |
| Mix complexity    | More enemy types per wave                        |
| Spawn rate        | Enemies spawn closer together                    |
| Multi-path        | Later waves spawn from multiple trench points    |
