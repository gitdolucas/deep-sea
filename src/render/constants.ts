/** Scene colors (docs/prd-mvp.md). */
export const COLORS = {
  background: 0x050d1a,
  floor: 0x0a1628,
  /** Off-path grid cell tile. */
  cellEmpty: 0x0c1a2e,
  /** Path segment (two opposite neighbors on path). */
  pathCellStraight: 0x1a3a2a,
  /** Path turn (two perpendicular neighbors). */
  pathCellCorner: 0x2a6a4a,
  /** Path endpoint on the graph (spawn leg, castle approach, or stub). */
  pathCellEnd: 0x1e3048,
  /** Three or four path neighbors (rare). */
  pathCellJunction: 0x348c62,
  path: 0x1a3a2a,
  pathEdge: 0xff6b6b,
  slot: 0x00d4ff,
  slotSelected: 0x66eeff,
  spawn: 0x0a0a14,
  castle: 0x112f55,
  crystal: 0x00d4ff,
  /** docs/style-bible.md — Stoneclaw */
  stoneclaw: 0x8b4513,
  stoneclawShell: 0xc0a060,
  /** docs/style-bible.md — Razoreel */
  razoreelBody: 0x1a6e8a,
  razoreelAccent: 0x00ffcc,
  /** docs/style-bible.md — Abyssal Colossus */
  abyssalColossusBody: 0x2a0a4a,
  abyssalColossusVein: 0xff3366,
  tower: 0xaa66ff,
  /** Arc Spine — main strike (electric blue). */
  chainLightningPrimary: 0x3399ff,
  /** Chain hops — slightly lighter / desaturated blue-violet. */
  chainLightningBounce: 0x7aa8ff,
  chain: 0x3399ff,
  gridMajor: 0x2a4a6c,
  gridMinor: 0x132535,
  /** Primary attack range ring (placement preview). */
  rangePreviewPrimary: 0x00d4ff,
  /** Arc Spine chain hop radius ring (placement preview). */
  rangePreviewChain: 0xffaa66,
  /** World-space enemy HP bar (fill). */
  enemyHpBarFill: 0x39ff6e,
  enemyHpBarBg: 0x1a2030,
  /** World-space tower cooldown bar (fill drains toward ready). */
  cooldownBarFill: 0x00d4ff,
  cooldownBarBg: 0x132535,
} as const;

export const CHAIN_FX_DURATION = 0.15;
/** Slightly longer than fastest Tideheart tick (0.08s) so beams overlap — steady beam read. */
export const TIDEHEART_BEAM_FX_DURATION = 0.14;
export const DAMAGE_POP_DURATION_SEC = 0.9;
