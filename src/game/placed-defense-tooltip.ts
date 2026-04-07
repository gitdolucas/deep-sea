import {
  CANNON_HIT_STUN_LIFT_SEC,
  CANNON_SPLASH_DAMAGE_FRAC,
  CANNON_SPLASH_RADIUS_TILES,
  DIRECT_DAMAGE,
  VIBRATION_SLOW,
  INK_CITADEL_DAMAGE_MULT,
  BUBBLE_SPLASH_L3,
  attackRangeTiles,
  auraRadiusTiles,
  FIRE_COOLDOWN_SEC,
} from "./combat-balance.js";
import { CHAIN_DAMAGE_FALLOFF } from "./damage-resolver.js";
import {
  arcSpineChainSearchRadius,
  arcSpineMaxEnemiesPerDischarge,
} from "./defense-controller.js";
import type {
  DefenseLevel,
  DefenseSnapshot,
  DefenseTypeKey,
} from "./types.js";

const DEFENSE_DISPLAY: Record<DefenseTypeKey, string> = {
  arc_spine: "Arc Spine",
  tideheart_laser: "Tideheart Laser",
  bubble_shotgun: "Bubble Shotgun",
  vibration_zone: "Vibration Zone",
  current_cannon: "Current Cannon",
  ink_veil: "Ink Veil",
};

export type TowerTooltipRow = {
  label: string;
  value: string;
  tone?: "default" | "accent" | "secondary";
};

export type PlacedDefenseTooltipSpec = {
  title: string;
  level: 1 | 2 | 3;
  defenseKey: DefenseTypeKey;
  core: TowerTooltipRow[];
  mechanics: string[];
  footer: { gx: number; gz: number; id: string };
};

/** Current vs next tier — HUD upgrade compare table (`GameApp` defense drawer). */
export type DefenseUpgradeCompareRow = {
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

/** Matches {@link spawnBubbleVolley} volley sizes by tier. */
const BUBBLE_VOLLEY_COUNT: Record<DefenseLevel, number> = {
  1: 3,
  2: 5,
  3: 7,
};

/** Beam count matches `GameSession.tickTideheartLasers`. */
function tideheartBeamCount(level: DefenseLevel): number {
  return level;
}

function compareRow(
  label: string,
  before: string,
  after: string,
): DefenseUpgradeCompareRow {
  return { label, before, after, changed: before !== after };
}

function damageCoreValue(spec: PlacedDefenseTooltipSpec): string {
  const row = spec.core.find(
    (r) => r.label === "Base damage" || r.label === "Direct damage",
  );
  return row?.value ?? "—";
}

function supplementalUpgradeRows(
  snap: DefenseSnapshot,
  nextSnap: DefenseSnapshot,
): DefenseUpgradeCompareRow[] {
  const L = snap.level;
  const Ln = nextSnap.level;
  const out: DefenseUpgradeCompareRow[] = [];
  switch (snap.type) {
    case "arc_spine": {
      const bN = arcSpineMaxEnemiesPerDischarge(L);
      const bR = arcSpineChainSearchRadius(L);
      const aN = arcSpineMaxEnemiesPerDischarge(Ln);
      const aR = arcSpineChainSearchRadius(Ln);
      const bVal = `up to ${bN} enemies · ${bR} tile hops`;
      const aVal = `up to ${aN} enemies · ${aR} tile hops`;
      out.push(compareRow("Chain", bVal, aVal));
      break;
    }
    case "tideheart_laser": {
      out.push(
        compareRow(
          "Beams",
          String(tideheartBeamCount(L)),
          String(tideheartBeamCount(Ln)),
        ),
      );
      break;
    }
    case "bubble_shotgun": {
      out.push(
        compareRow(
          "Bubbles / volley",
          String(BUBBLE_VOLLEY_COUNT[L]),
          String(BUBBLE_VOLLEY_COUNT[Ln]),
        ),
      );
      if (L === 2 && Ln === 3) {
        out.push(
          compareRow(
            "L3 splash",
            "—",
            `+${BUBBLE_SPLASH_L3} splash damage`,
          ),
        );
      }
      break;
    }
    case "vibration_zone": {
      out.push(
        compareRow(
          "Slow in aura",
          `${Math.round(VIBRATION_SLOW[L] * 100)}%`,
          `${Math.round(VIBRATION_SLOW[Ln] * 100)}%`,
        ),
      );
      break;
    }
    case "current_cannon": {
      const fmt = (r: number) =>
        Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, "");
      const bR = CANNON_SPLASH_RADIUS_TILES[L];
      const aR = CANNON_SPLASH_RADIUS_TILES[Ln];
      out.push(
        compareRow(
          `Splash radius (${Math.round(CANNON_SPLASH_DAMAGE_FRAC * 100)}% dmg)`,
          `${fmt(bR)} tiles`,
          `${fmt(aR)} tiles`,
        ),
      );
      break;
    }
    case "ink_veil": {
      const bM = INK_CITADEL_DAMAGE_MULT[L];
      const aM = INK_CITADEL_DAMAGE_MULT[Ln];
      const bPct = Math.round((1 - bM) * 100);
      const aPct = Math.round((1 - aM) * 100);
      out.push(
        compareRow(
          "Citadel leak reduction",
          `${bPct}% · ${bM}× taken`,
          `${aPct}% · ${aM}× taken`,
        ),
      );
      break;
    }
    default:
      break;
  }
  return out;
}

/**
 * Stat deltas for L→L+1 in the defense detail drawer. `null` when already max tier.
 */
export function buildDefenseUpgradeCompare(
  snap: DefenseSnapshot,
): DefenseUpgradeCompareRow[] | null {
  if (snap.level >= 3) return null;
  const nextLevel = (snap.level + 1) as DefenseLevel;
  const nextSnap: DefenseSnapshot = { ...snap, level: nextLevel };
  const cur = buildPlacedDefenseTooltipSpec(snap);
  const nxt = buildPlacedDefenseTooltipSpec(nextSnap);

  const pick = (label: string, spec: PlacedDefenseTooltipSpec) =>
    spec.core.find((r) => r.label === label)?.value ?? "—";

  const rows: DefenseUpgradeCompareRow[] = [
    compareRow("Range", pick("Range", cur), pick("Range", nxt)),
    compareRow("Interval", pick("Interval", cur), pick("Interval", nxt)),
    compareRow("Damage", damageCoreValue(cur), damageCoreValue(nxt)),
  ];
  rows.push(...supplementalUpgradeRows(snap, nextSnap));
  return rows;
}

function targetLabel(mode: DefenseSnapshot["targetMode"]): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function tooltipRangeTiles(snap: DefenseSnapshot): string {
  const n =
    snap.type === "vibration_zone" || snap.type === "ink_veil"
      ? auraRadiusTiles(snap.type, snap.level)
      : attackRangeTiles(snap.type, snap.level);
  const label = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${label} tiles`;
}

/**
 * Structured readout for HUD rendering — numbers from combat tables.
 */
export function buildPlacedDefenseTooltipSpec(
  snap: DefenseSnapshot,
): PlacedDefenseTooltipSpec {
  const title = DEFENSE_DISPLAY[snap.type];
  const L = snap.level;
  const cd = FIRE_COOLDOWN_SEC[snap.type][L];
  const raw = DIRECT_DAMAGE[snap.type][L];

  const core: TowerTooltipRow[] = [
    { label: "Targeting", value: targetLabel(snap.targetMode) },
    { label: "Range", value: tooltipRangeTiles(snap), tone: "accent" },
    { label: "Interval", value: `${cd}s` },
  ];

  if (raw > 0) {
    core.push({
      label: "Base damage",
      value: `${raw} (pre-armor)`,
      tone: "accent",
    });
  } else {
    core.push({
      label: "Direct damage",
      value: "0 · utility / aura",
      tone: "secondary",
    });
  }

  const mechanics: string[] = [];

  switch (snap.type) {
    case "arc_spine": {
      const chainN = arcSpineMaxEnemiesPerDischarge(L);
      const chainR = arcSpineChainSearchRadius(L);
      mechanics.push(
        `Chain: up to ${chainN} enemies, hop radius ${chainR} tiles`,
        `Chain falloff: ×${CHAIN_DAMAGE_FALLOFF} per hop (floored vs armor)`,
      );
      if (L === 3) {
        mechanics.push("L3: burn on primary hit (see combat doc)");
      }
      break;
    }
    case "tideheart_laser": {
      mechanics.push("Hitscan beam — continuous tick damage");
      break;
    }
    case "bubble_shotgun": {
      mechanics.push("Volley — contact projectiles");
      if (L === 3) mechanics.push(`L3 splash damage: +${BUBBLE_SPLASH_L3}`);
      break;
    }
    case "vibration_zone": {
      const slow = VIBRATION_SLOW[L];
      mechanics.push(
        `Slow: ${Math.round(slow * 100)}% in aura`,
        "DoT at L3 on pulse cadence",
      );
      break;
    }
    case "current_cannon": {
      mechanics.push(
        `Hit: ${CANNON_HIT_STUN_LIFT_SEC}s stun + lift (Colossus immune to CC)`,
        "Splash damage in radius — no CC on splash",
      );
      break;
    }
    case "ink_veil": {
      const mult = INK_CITADEL_DAMAGE_MULT[L];
      const pct = Math.round((1 - mult) * 100);
      mechanics.push(
        `Citadel leak reduction: ${pct}% (${mult}× damage taken)`,
        "Aura: blind / armor shred at L3",
      );
      break;
    }
    default:
      break;
  }

  return {
    title,
    level: L,
    defenseKey: snap.type,
    core,
    mechanics,
    footer: { gx: snap.position[0], gz: snap.position[1], id: snap.id },
  };
}

/** Plain lines for tests / accessibility text alternatives. */
function plainLinesFromSpec(spec: PlacedDefenseTooltipSpec): string[] {
  const tgt = spec.core.find((r) => r.label === "Targeting")!;
  const rng = spec.core.find((r) => r.label === "Range")!;
  const ivl = spec.core.find((r) => r.label === "Interval")!;
  const dmg = spec.core.find(
    (r) => r.label === "Base damage" || r.label === "Direct damage",
  )!;

  const lines: string[] = [
    `${spec.title} · L${spec.level}`,
    `Target: ${tgt.value}`,
    `Range: ${rng.value}`,
    `Interval: ${ivl.value}`,
  ];

  if (dmg.label === "Base damage") {
    const n = dmg.value.replace(/ \(pre-armor\)$/, "");
    lines.push(`Base damage: ${n} (before armor)`);
  } else {
    lines.push("Direct hit damage: 0 (utility / aura tick)");
  }

  lines.push(...spec.mechanics);
  lines.push(`Grid: [${spec.footer.gx}, ${spec.footer.gz}] · ${spec.footer.id}`);

  return lines;
}

/**
 * Multi-line technical readout for a placed tower (balance from combat tables).
 */
export function linesForPlacedDefense(snap: DefenseSnapshot): string[] {
  return plainLinesFromSpec(buildPlacedDefenseTooltipSpec(snap));
}
