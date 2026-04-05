import type { DefenseTypeKey } from "../game/types.js";

/** Line-art tower glyphs (match hotbar SVGs in index.html). */
const MARKUP: Record<DefenseTypeKey, string> = {
  arc_spine: `<svg class="defense-focus-card__icon-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 38 L18 12 L22 28 L26 10 L30 26 L34 14"/><path d="M20 38 L24 22 L28 38" opacity="0.85"/></svg>`,
  bubble_shotgun: `<svg class="defense-focus-card__icon-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 30h12l4-14h8v14"/><path d="M16 30v4M22 30v4M28 30v4" opacity="0.8"/><path d="M34 18l6-3v14l-6-3"/></svg>`,
  vibration_zone: `<svg class="defense-focus-card__icon-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><ellipse cx="24" cy="34" rx="14" ry="4"/><circle cx="24" cy="34" r="7" opacity="0.9"/><path d="M18 10v8M21 8v10M24 6v12M27 8v10M30 10v8" opacity="0.85"/></svg>`,
  current_cannon: `<svg class="defense-focus-card__icon-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="14" cy="36" r="4"/><circle cx="32" cy="36" r="4"/><path d="M12 32h22"/><path d="M18 20h16l6 8H14z"/><path d="M34 24l6-2"/></svg>`,
  ink_veil: `<svg class="defense-focus-card__icon-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M24 12c-8 4-10 12-4 18s14 4 16-2-2-14-12-16z" opacity="0.9"/><path d="M30 14c4 6 2 14-6 16M18 20c-4 8 2 16 10 14" opacity="0.7"/></svg>`,
  tideheart_laser: `<svg class="defense-focus-card__icon-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 38h12v-4H18z"/><path d="M24 34V14"/><path d="M20 22l4-10 4 10"/><path d="M17 18h14" opacity="0.8"/></svg>`,
};

export function defenseFocusCardIconInnerHtml(type: DefenseTypeKey): string {
  return MARKUP[type];
}
