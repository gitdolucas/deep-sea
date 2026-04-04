import type { PlacedDefenseTooltipSpec } from "../game/placed-defense-tooltip.js";

/**
 * Fills the tooltip host with a tactical HUD layout (pointer-events none on host).
 */
export function mountTowerHoverTip(
  host: HTMLElement,
  spec: PlacedDefenseTooltipSpec,
): void {
  host.replaceChildren();
  host.setAttribute("data-defense", spec.defenseKey);

  const root = document.createElement("div");
  root.className = "tower-hover";

  const scan = document.createElement("div");
  scan.className = "tower-hover__scan";
  scan.setAttribute("aria-hidden", "true");
  root.appendChild(scan);

  const head = document.createElement("header");
  head.className = "tower-hover__head";

  const eyebrow = document.createElement("span");
  eyebrow.className = "tower-hover__eyebrow";
  eyebrow.textContent = "Tactical readout · grid-linked";

  const titleRow = document.createElement("div");
  titleRow.className = "tower-hover__title-row";

  const h2 = document.createElement("h2");
  h2.className = "tower-hover__title";
  h2.id = "towerHoverTipTitle";
  h2.textContent = spec.title;

  const lvl = document.createElement("span");
  lvl.className = "tower-hover__level-chip";
  lvl.textContent = `L${spec.level}`;

  titleRow.append(h2, lvl);
  head.append(eyebrow, titleRow);
  root.appendChild(head);

  const dl = document.createElement("dl");
  dl.className = "tower-hover__stats";

  for (const row of spec.core) {
    const dt = document.createElement("dt");
    dt.className = "tower-hover__k";
    dt.textContent = row.label;

    const dd = document.createElement("dd");
    dd.className = "tower-hover__v";
    if (row.tone === "accent") dd.classList.add("tower-hover__v--accent");
    if (row.tone === "secondary") dd.classList.add("tower-hover__v--muted");
    dd.textContent = row.value;

    dl.append(dt, dd);
  }
  root.appendChild(dl);

  if (spec.mechanics.length > 0) {
    const mechLabel = document.createElement("p");
    mechLabel.className = "tower-hover__mech-label";
    mechLabel.textContent = "Mechanics";
    root.appendChild(mechLabel);

    const ul = document.createElement("ul");
    ul.className = "tower-hover__mech";
    for (const line of spec.mechanics) {
      const li = document.createElement("li");
      li.textContent = line;
      ul.appendChild(li);
    }
    root.appendChild(ul);
  }

  const foot = document.createElement("footer");
  foot.className = "tower-hover__foot";
  const coord = document.createElement("span");
  coord.className = "tower-hover__coord";
  coord.textContent = `Δ ${spec.footer.gx}, ${spec.footer.gz}`;
  const nid = document.createElement("span");
  nid.className = "tower-hover__id";
  nid.textContent = spec.footer.id;
  foot.append(coord, nid);
  root.appendChild(foot);

  host.appendChild(root);
  host.setAttribute("aria-labelledby", "towerHoverTipTitle");
}
