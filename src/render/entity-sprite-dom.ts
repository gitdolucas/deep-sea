import type { DefenseTypeKey } from "../game/types.js";
import {
  ENTITY_SPRITE_ATLAS_DESIGN_SIZE,
  ENTITY_SPRITE_ATLAS_PUBLIC_URL,
  ENTITY_SPRITE_RECTS_PX,
  type EntitySpriteRegionKey,
} from "./entity-sprite-atlas.js";
import { defenseFocusCardIconInnerHtml } from "./defense-focus-card-icons.js";

/** Matches `padding` on `.defense-card-icon-sprite-wrap` in index.html (4px × 2 sides). */
const DEFENSE_CARD_ICON_SPRITE_INSET_TOTAL = 8;

/** Same mapping as {@link getEntitySpriteTextureForDefense} (no Three.js). */
export function entitySpriteRegionKeyForDefense(
  type: DefenseTypeKey,
): EntitySpriteRegionKey | null {
  if (type === "vibration_zone") return "vibration_zone";
  if (type === "ink_veil") return "ink_veil";
  if (type === "arc_spine") return "arc_spine";
  return null;
}

export function defenseCardIconSpriteStyles(
  region: EntitySpriteRegionKey,
  boxWidth: number,
  boxHeight: number,
): { panel: Partial<CSSStyleDeclaration>; inner: Partial<CSSStyleDeclaration> } {
  const rect = ENTITY_SPRITE_RECTS_PX[region];
  const W = ENTITY_SPRITE_ATLAS_DESIGN_SIZE.width;
  const H = ENTITY_SPRITE_ATLAS_DESIGN_SIZE.height;
  const s = Math.min(boxWidth / rect.w, boxHeight / rect.h);
  const dispW = rect.w * s;
  const dispH = rect.h * s;
  const inner: Partial<CSSStyleDeclaration> = {
    width: `${dispW}px`,
    height: `${dispH}px`,
    maxWidth: "100%",
    maxHeight: "100%",
    backgroundImage: `url("${ENTITY_SPRITE_ATLAS_PUBLIC_URL}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${W * s}px ${H * s}px`,
    backgroundPosition: `${-rect.x * s}px ${-rect.y * s}px`,
    flexShrink: "0",
  };
  const panel: Partial<CSSStyleDeclaration> = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "0",
    minHeight: "0",
  };
  return { panel, inner };
}

/**
 * Fills `host` with either a cropped atlas sprite (when defined) or the SVG glyph from
 * {@link defenseFocusCardIconInnerHtml}.
 */
export function mountDefenseCardIcon(
  host: HTMLElement,
  type: DefenseTypeKey,
  boxWidth: number,
  boxHeight: number,
): void {
  host.replaceChildren();
  const region = entitySpriteRegionKeyForDefense(type);
  if (region) {
    const wrap = document.createElement("div");
    wrap.className = "defense-card-icon-sprite-wrap";
    const { panel, inner } = defenseCardIconSpriteStyles(
      region,
      Math.max(0, boxWidth - DEFENSE_CARD_ICON_SPRITE_INSET_TOTAL),
      Math.max(0, boxHeight - DEFENSE_CARD_ICON_SPRITE_INSET_TOTAL),
    );
    Object.assign(wrap.style, panel);
    const innerEl = document.createElement("div");
    innerEl.className = "defense-card-icon-sprite";
    Object.assign(innerEl.style, inner);
    wrap.appendChild(innerEl);
    host.appendChild(wrap);
  } else {
    host.innerHTML = defenseFocusCardIconInnerHtml(type);
  }
}
