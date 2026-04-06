import {
  CANNON_HIT_STUN_LIFT_SEC,
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
import type { DefenseSnapshot, DefenseTypeKey } from "./types.js";

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
