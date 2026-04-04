/**
 * Short tactical hints for the mission HUD (see docs/combat.md, enemy pages).
 * Shown in rotation at the bottom of the play screen.
 */
export const GAMEPLAY_TIPS: readonly string[] = [
  "Armor reduces each hit: damage is max(1, base − armor), so chip damage always lands.",
  "Arc Spine: chain lightning jumps to nearby foes—bunch enemies inside the chain ring for extra hops.",
  "Arc Spine chain damage falls off each hop, but every hit still respects the same armor rule.",
  "Tideheart Laser: steady beam damage—strong when a target stays in the beam on long path segments.",
  "Bubble Shotgun: spread shots reward dense packs; watch for L3 splash on contact.",
  "Vibration Zone: aura slow keeps targets in range longer—great setup for chains and beams.",
  "Current Cannon: knockback shuffles the line; Abyssal Colossus ignores knockback entirely.",
  "Current Cannon L1 knockback only shoves Stoneclaw—upgrade for broader knockback on lighter foes.",
  "Ink Veil: shrinks how much leak damage the citadel takes while enemies stand in the cloud.",
  "Ink Veil at high tier adds armor shred—pair with direct-hit towers for faster clears.",
  "Stoneclaw: light armor and slow pace—efficient feeds are chain hits and sustained chip.",
  "Razoreel: faster than Stoneclaw—layer slows or early damage so they do not stack on the citadel.",
  "Abyssal Colossus soaks punishment and ignores cannon knock—focus burst and leak control.",
  "Kills drop shells; spend in prep so defenses are in place before the next wave.",
  "Send wave only during prep—use the downtime to preview range rings and place carefully.",
  "Hover a placed tower for full stats: range, cadence, armor math, and signature mechanics.",
];
