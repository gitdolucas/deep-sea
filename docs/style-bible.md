# Deep Abyss TD — Art & Style Bible

## Visual Style

3D diorama world with 2D pixel art sprites. The environment is rendered in 3D — coral paths, the Poseidon Citadel, ocean floor terrain — but all characters, enemies, towers, and projectiles are **flat pixel art sprites** that always face the camera. Think Octopath Traveler meets Dungeon Defenders.

## Perspective

**2.5D isometric-leaning.** The camera sits at a fixed angle slightly above and in front of the battlefield, giving depth to the 3D environment while keeping sprites readable. Enemies travel along coral paths that wind toward the Citadel in a natural S or branching layout.

## Sprite Style

- **Size:** 32x32 to 48x48 px per character unit
- **Perspective:** 3/4 top-down
- **Outline:** 1px hard dark border around all sprites
- **Palette:** 4 to 6 colors max per unit — each instantly readable at small sizes
- **States per enemy:** idle, walk, attack, damaged, K.O.
- **Underwater feel:** Slight wobble animation on idle to sell the floating feel

## Color Palette

| Role                    | Color                                                    |
|-------------------------|----------------------------------------------------------|
| Background / void       | `#050d1a` near black-blue                                |
| Ocean floor / terrain   | `#0a1628` dark navy                                      |
| Coral paths             | `#1a3a2a` deep teal-green + `#ff6b6b` coral highlights   |
| Citadel stone           | `#112f55` deep blue-gray                                 |
| Bioluminescent glow     | `#00d4ff` cyan, `#7b2fff` violet, `#39ff6e` green        |
| Enemy: Razoreel         | `#1a6e8a` dark teal body + `#00ffcc` electric charge     |
| Enemy: Stoneclaw        | `#8b4513` rust brown + `#c0a060` sandy shell             |
| Enemy: Colossus         | `#2a0a4a` deep purple + `#ff3366` Murk veins             |
| UI / HUD                | Dark glass panels, `#00d4ff` text, minimal chrome        |

## Lighting & Atmosphere

- **No sunlight** — the world is pitch black except for bioluminescent sources
- Towers and the Citadel emit **soft colored glows** (cyan, violet, green)
- Coral paths **faintly pulse with light**, guiding the eye along enemy routes
- **Particles everywhere** — bubbles drifting upward, ink clouds, electric sparks, ripple rings from vibration towers
- **Caustic light patterns** projected onto the ocean floor (wavy light distortion typical of underwater scenes)

## Environment / 3D World

- **Ocean floor tiles** — dark sand, rock, scattered shells and bones
- **Coral formations** lining the path — branching, colorful, slightly glowing
- **Kelp forests** in the background swaying with a gentle animation
- **The Citadel** dominates the back of the map — tall spires, arched gates, glowing crystal at the top
- **Ambient particles** — bubbles, floating spores, drifting debris

## UI / HUD Style

- **Dark frosted glass panels** — semi-transparent dark blue overlays
- **Pixel font** for all in-game text (damage numbers, wave counters)
- **Cyan and violet** as primary UI accent colors
- Tower selection icons are **pixel art thumbnails** with glowing borders
- Wave incoming alerts use a **pulsing bioluminescent ring** animation

## Audio Mood

- Deep, resonant ambient drones
- Muffled, echoing sound design — everything sounds underwater
- Bioluminescent tones for UI interactions (soft chimes, bubble pops)
- Intense low-frequency rumble when the Abyssal Colossus appears
- Corrupted whale song as The Murk's leitmotif

## Overall Feel

**Hauntingly beautiful and dangerous.** The player should feel small against the vastness of the ocean, awed by the glowing world around them, and under constant pressure from the dark things emerging from the Null Trench.
