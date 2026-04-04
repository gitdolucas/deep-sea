# Combat System

The complete attack pipeline — from tower targeting to enemy death.

---

## 1. Targeting

### Priority Modes

Each tower uses a default targeting mode. The player can cycle through modes by clicking an active tower.

| Mode          | Behavior                                      | Default For         |
|---------------|-----------------------------------------------|---------------------|
| First         | Target the enemy closest to the Citadel       | Tideheart Laser     |
| Last          | Target the enemy farthest from the Citadel    | Current Cannon      |
| Strongest     | Target the enemy with the highest current HP  | —                   |
| Weakest       | Target the enemy with the lowest current HP   | —                   |
| Closest       | Target the nearest enemy to the tower itself  | Bubble Shotgun, Arc Spine |

### Targeting Rules by Tower

| Tower           | Targeting        | Notes                                           |
|-----------------|------------------|-------------------------------------------------|
| Tideheart Laser | Single lock-on   | Locks onto one target, beam persists until target dies or exits range. L2 locks two. L3 locks three + pierce. |
| Bubble Shotgun  | Cone direction   | Fires toward the densest cluster in its cone. Does not lock on — aims at a position. |
| Vibration Zone  | Aura (no target) | Affects all enemies within radius. No targeting needed. |
| Current Cannon  | Single lock-on   | Fires at one target, projectile pushes on hit.  |
| Ink Veil        | Aura (no target) | Deploys cloud in radius. No targeting needed.    |
| Arc Spine       | Single + chain   | Targets one enemy, then chains to nearest neighbors. |

---

## 2. Attack Cycle

Every tower follows this loop:

```
[Idle] → [Acquire Target] → [Wind-up] → [Fire] → [Cooldown] → [Idle]
```

| Phase          | Duration     | Description                                        |
|----------------|--------------|----------------------------------------------------|
| Acquire Target | Instant      | Scan for valid target in range using priority mode  |
| Wind-up        | 0.1–0.3s     | Brief animation before firing (glow charge, barrel aim) |
| Fire           | Instant/Tick | Projectile spawns or beam activates                |
| Cooldown       | Per tower    | Time before next attack cycle begins               |

### Attack Speed (cooldown between shots)

| Tower           | L1     | L2     | L3     |
|-----------------|--------|--------|--------|
| Tideheart Laser | 0.1s (continuous beam, DPS tick rate) | 0.1s | 0.08s |
| Bubble Shotgun  | 1.5s   | 1.1s   | 0.75s  |
| Vibration Zone  | 0.5s (tick rate for slow reapply) | 0.5s | 0.3s (tick rate for slow + DoT) |
| Current Cannon  | 2.5s   | 2.0s   | 1.5s   |
| Ink Veil        | 3.0s (cloud redeploy) | 3.0s | Persistent (no cooldown) |
| Arc Spine       | 1.5s   | 1.2s   | 1.0s   |

---

## 3. Projectile & Delivery Types

Each tower delivers damage differently. This affects how hits are resolved.

| Tower           | Delivery       | Description                                              |
|-----------------|----------------|----------------------------------------------------------|
| Tideheart Laser | **Hitscan**    | Instant beam — no travel time. Damage applies immediately per tick. |
| Bubble Shotgun  | **Projectile** | Bubbles travel in a cone spread. Each bubble is an independent projectile with travel time. |
| Vibration Zone  | **Aura**       | Continuous field — damage/slow applies every tick to all enemies in radius. |
| Current Cannon  | **Projectile** | Single water blast travels to target. Applies knockback on hit. |
| Ink Veil        | **Aura**       | Cloud field — debuff applies to all enemies in radius while they're inside. |
| Arc Spine       | **Chain**      | First hit is hitscan on primary target. Chain then jumps to nearest enemy within chain range, one jump per frame (fast visual cascade). |

### Projectile Properties

| Property         | Bubble Shotgun                     | Current Cannon                   |
|------------------|------------------------------------|----------------------------------|
| Speed            | Medium                             | Fast                             |
| Can miss?        | Yes — if target moves out of path  | No — tracks target (homing)      |
| Collision        | Per-bubble, hits first enemy in path | Single target                   |
| AOE on impact    | L3 only — splash radius on pop     | None                             |

---

## 4. Damage Calculation

### Base Formula

```
Final Damage = Base Damage × Armor Modifier × Debuff Multiplier
```

### Armor System

Armor is a **flat damage reduction** (not percentage). Armor cannot reduce damage below 1.

```
Effective Damage = max(1, Base Damage - Armor)
```

| Enemy            | Armor Value |
|------------------|-------------|
| Razoreel         | 0           |
| Stoneclaw        | 2           |
| Abyssal Colossus | 8           |

### Armor Shred (Ink Veil L3)

Ink Veil L3 applies an armor reduction debuff:

```
Effective Armor = max(0, Base Armor - Ink Veil Shred)
```

| Ink Veil Level | Armor Shred |
|----------------|-------------|
| L1             | 0           |
| L2             | 0           |
| L3             | 5           |

This means a Colossus inside an L3 Ink Veil drops from 8 armor to 3 — every tower suddenly hits harder.

### Damage Per Hit by Tower

| Tower           | L1  | L2  | L3  |
|-----------------|-----|-----|-----|
| Tideheart Laser | 4/tick | 5/tick | 6/tick (×3 beams) |
| Bubble Shotgun  | 25/bubble | 30/bubble | 35/bubble + 15 splash |
| Vibration Zone  | 0 | 0 | 2/tick (DoT) |
| Current Cannon  | 6 | 10 | 14 + stun |
| Ink Veil        | 0 | 0 | 0 (utility only) |
| Arc Spine       | 8 (primary) | 10 (primary) | 12 (primary) + 2/tick burn |

### Arc Spine Chain Damage Falloff

Chain damage reduces per jump to prevent one tower from clearing entire waves:

```
Chain Damage = Primary Damage × (0.8 ^ jump_number)
```

| Jump | L1 (8 base) | L2 (10 base) | L3 (12 base) |
|------|-------------|--------------|--------------|
| 0 (primary) | 8 | 10 | 12 |
| 1 | 6 | 8 | 9 |
| 2 | — | 6 | 7 |
| 3 | — | 5 | 6 |
| 4 | — | — | 5 |
| 5 | — | — | 4 |

---

## 5. Status Effects

Towers can apply effects beyond raw damage. Effects have a **source** and a **duration**.

| Effect       | Source                    | Duration  | Behavior                                     |
|--------------|---------------------------|-----------|----------------------------------------------|
| **Slow**     | Vibration Zone (all levels) | While in radius | Reduces move speed by a percentage         |
| **DoT (Vibration)** | Vibration Zone L3  | While in radius + 1s after leaving | Damage per tick while inside    |
| **Burn**     | Arc Spine L3              | 3s after hit | Damage per tick, does not stack — refreshes duration |
| **Blind**    | Ink Veil (all levels)     | While in cloud + 0.5s after leaving | Reduces enemy damage to Citadel |
| **Armor Shred** | Ink Veil L3           | While in cloud | Flat armor reduction                         |
| **Knockback** | Current Cannon (L1+)    | Instant    | Pushes enemy backward along path             |
| **Stun**     | Current Cannon L3         | 0.8s       | Enemy stops moving and attacking completely   |

### Slow Values

| Vibration Zone Level | Slow Amount |
|----------------------|-------------|
| L1                   | 30%         |
| L2                   | 50%         |
| L3                   | 70%         |

Slow does **not** stack from multiple Vibration Zones — only the strongest applies.

### Blind Values

| Ink Veil Level | Citadel Damage Reduction |
|----------------|--------------------------|
| L1             | 30%                      |
| L2             | 50%                      |
| L3             | 70%                      |

### Knockback Distance

| Current Cannon Level | Pushback Distance    | Affects                |
|----------------------|----------------------|------------------------|
| L1                   | 1 tile               | Stoneclaw only         |
| L2                   | 2 tiles              | All except Colossus    |
| L3                   | 3 tiles + 0.8s stun  | All except Colossus    |

---

## 6. Tower Combos

When towers overlap in coverage, their effects combine. These are the designed synergies.

### Combo: Vibration Zone + Tideheart Laser — "The Trap"

Vibration Zone slows enemies, keeping them inside the Laser's beam longer. More time in beam = more ticks = more total damage.

```
Extra ticks = (slow_percentage / 100) × base_ticks_in_range
```

A Razoreel that normally crosses a Laser's range in 5 ticks at full speed will take **10 ticks** inside a L2 Vibration Zone (50% slow). That's 100% more damage dealt.

**Best against:** Razoreels (negates their speed advantage)

---

### Combo: Ink Veil L3 + Any DPS Tower — "Exposed"

Ink Veil L3 shreds 5 armor. Every other tower's damage against armored targets increases.

| Target (Colossus, 8 armor) | Without Ink Veil | With Ink Veil L3 (3 armor) |
|-----------------------------|------------------|-----------------------------|
| Tideheart Laser L1 (4/tick) | max(1, 4-8) = 1 | max(1, 4-3) = 1            |
| Tideheart Laser L3 (6/tick) | max(1, 6-8) = 1 | max(1, 6-3) = 3            |
| Arc Spine L3 (12)           | max(1, 12-8) = 4 | max(1, 12-3) = 9           |
| Bubble Shotgun L3 (35/bubble) | max(1, 35-8) = 27 | max(1, 35-3) = 32        |

**Best against:** Abyssal Colossus (turns armor from near-immunity into vulnerability)

---

### Combo: Current Cannon + Vibration Zone — "The Loop"

Current Cannon knocks enemies back into (or through) a Vibration Zone, forcing them to re-traverse the slow field. Combined with the knockback, enemies effectively crawl.

**Best against:** Razoreels (knocked back + slowed = neutralized)

---

### Combo: Arc Spine L3 + Vibration Zone L3 — "Double Burn"

Both apply DoT. They stack because they are different effect types (Burn vs. Vibration DoT).

```
Combined DoT = Vibration DoT (2/tick) + Burn DoT (2/tick) = 4/tick
```

Over a 3-second window against a Stoneclaw group: each crab takes chain hit + 9 damage from stacked DoTs. Clears swarms without needing direct hits on every target.

**Best against:** Stoneclaw swarms in chokepoints

---

### Combo: Ink Veil + Current Cannon L3 — "Dark Tide"

Blinded enemies get knocked back and stunned. While stunned inside the ink cloud, they take no action and receive full armor shred, setting them up for the next DPS tower volley.

**Best against:** Mixed waves (control + debuff layering)

---

### Combo: Bubble Shotgun L3 + Arc Spine — "Chain Pop"

Bubble Shotgun L3 splash groups enemies closer together (via knockback micro-push from bubble pops). Arc Spine then chains more efficiently across the tighter cluster.

**Best against:** Dense Stoneclaw waves

---

## 7. Damage Reception (Enemy Side)

### Hit Resolution Pipeline

When damage reaches an enemy, it flows through this pipeline:

```
Incoming Hit
  │
  ├─ 1. Check immunity (Colossus immune to knockback)
  │
  ├─ 2. Apply armor: effective_dmg = max(1, damage - current_armor)
  │
  ├─ 3. Subtract HP: current_hp -= effective_dmg
  │
  ├─ 4. Apply status effects (slow, burn, blind, stun, knockback)
  │
  ├─ 5. Trigger hit reaction animation (flash white, shake)
  │
  ├─ 6. Check death: if current_hp <= 0 → enter death sequence
  │
  └─ 7. Update HP bar
```

### Hit Reaction by Enemy

| Enemy            | Hit Flash Color | Shake Intensity | Sound                    |
|------------------|-----------------|-----------------|--------------------------|
| Razoreel         | White           | Light           | Electric crackle         |
| Stoneclaw        | White           | Heavy (shell thud) | Stone crack           |
| Abyssal Colossus | Murk-pink       | Minimal (too massive) | Deep rumble, ink burst |

### Damage Numbers

Floating pixel-art numbers rise from the enemy on each hit:

| Number Color   | Meaning                          |
|----------------|----------------------------------|
| White          | Normal damage                    |
| Gray (`#666`)  | Armor-reduced (minimum 1 damage) |
| Cyan (`#00d4ff`) | Critical / combo-boosted       |
| Orange         | DoT tick (burn or vibration)     |

Numbers drift upward and fade over 0.8s. Multiple hits stack numbers vertically so they stay readable.

### HP Bar

- Appears above the enemy sprite when first damaged
- Thin pixel bar: green → yellow → red as HP decreases
- Fades out 2s after last hit if enemy is still alive
- Colossus has a larger, segmented HP bar (boss-style)

---

## 8. Death Sequence

When an enemy's HP reaches 0:

| Phase     | Duration | What Happens                                              |
|-----------|----------|-----------------------------------------------------------|
| Hit stop  | 0.05s    | Game micro-freezes (1-2 frames) for impact feel           |
| Flash     | 0.15s    | Sprite flashes bright white                               |
| K.O. anim | 0.4s     | Enemy plays death animation (dissolve, crumble, collapse) |
| Shell drop | 0.2s    | Shell spawns at death position, floats upward             |
| Cleanup   | Instant  | Enemy removed from targeting lists and path               |

### Death Animation per Enemy

| Enemy            | Death Animation                                              |
|------------------|--------------------------------------------------------------|
| Razoreel         | Dissolves into electric particles, sparks scatter outward    |
| Stoneclaw        | Flips over, shell crumbles into pieces, sinks               |
| Abyssal Colossus | Tentacles go limp one by one, body deflates, ink cloud bursts outward, slow collapse |

### Overkill

Damage beyond 0 HP is **wasted** — it does not carry over to nearby enemies. This is intentional to make targeting decisions meaningful (don't overkill weak enemies with your best tower).

**Exception:** Tideheart Laser L3 pierce — the beam continues through a dead enemy to the next target in line. Overkill damage is still lost, but the beam itself persists.

---

## 9. Enemy Damage to Citadel

When an enemy reaches the end of the coral path:

```
1. Enemy enters Citadel hit zone (final path tile)
2. Enemy plays attack animation
3. Citadel takes damage equal to enemy's attack value
4. Enemy is consumed (removed from play — not killed, no shell drop)
5. Citadel damage state updates
6. Screen shake + Citadel flash red
```

### Enemy Attack Values

| Enemy            | Citadel Damage | Notes                               |
|------------------|----------------|--------------------------------------|
| Razoreel         | 3              | Fast arrival, punishing leak penalty |
| Stoneclaw        | 1              | Low individual, lethal in volume     |
| Abyssal Colossus | 10             | Devastating if it reaches the gate   |

### Citadel HP

| Difficulty | Citadel Max HP |
|------------|----------------|
| Normal     | 20             |
| Hard       | 15             |
| Nightmare  | 10             |

Leaking even 2 Razoreels costs 6 HP — nearly a third of your health on Normal.

---

## 10. Colossus Special Mechanics

The Abyssal Colossus has unique combat rules due to its size and role.

### Tentacle Shield

The Colossus has a **main body** and **2 tentacle hitboxes** that extend to adjacent lanes.

```
Tentacle HP = 25% of total Colossus HP (each)
Main Body HP = 50% of total Colossus HP
```

- Towers targeting the Colossus may hit tentacles instead of the body (based on tower position and angle)
- Destroying a tentacle removes it visually and opens a clear path to the body
- Tentacles regenerate slowly if not destroyed within 10s of taking damage

### Knockback Immunity

The Colossus is **immune** to Current Cannon at all levels. The projectile visually splashes against it with no effect. This is communicated with a "RESIST" text popup in gray.

### Boss HP Scaling

| Wave  | Colossus HP  |
|-------|-------------|
| 10    | 200         |
| 15    | 350         |
| 20    | 500         |

---

## Quick Reference: Tower vs Enemy Effectiveness

|                  | Razoreel (Fast/No Armor) | Stoneclaw (Swarm/Light Armor) | Colossus (Tank/Heavy Armor) |
|------------------|--------------------------|-------------------------------|-----------------------------|
| Tideheart Laser  | ★★★ Precision killer     | ★☆☆ Wastes single target     | ★★☆ Sustained DPS, L3 pierce |
| Bubble Shotgun   | ★☆☆ Too fast, dodges     | ★★★ AOE clears groups        | ★☆☆ Armor blocks most damage |
| Vibration Zone   | ★☆☆ L1 too slow, L2+ ok  | ★★☆ Slows + L3 DoT          | ★★★ Slows the unstoppable   |
| Current Cannon   | ★★★ Resets their progress | ★★☆ Pushes back              | ☆☆☆ Immune                  |
| Ink Veil         | ★★☆ Reduces leak damage  | ★★☆ Reduces leak damage      | ★★★ L3 armor shred is essential |
| Arc Spine        | ★☆☆ No chain targets     | ★★★ Chain devastates swarms  | ★☆☆ Only single hit         |
