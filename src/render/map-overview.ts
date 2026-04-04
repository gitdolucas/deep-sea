import type { MapDocument } from "../game/map-types.js";
import { gridCellKey, pathCellKeySetUnion } from "../game/path-cells.js";

/** Decorative 2D top-down grid preview for map JSON (CSS-only “mini map”). */
export function createMapOverviewElement(doc: MapDocument): HTMLElement {
  const [gw, gd] = doc.gridSize;
  const pathKeys = pathCellKeySetUnion(doc.paths);
  const buildKeys = new Set(
    doc.buildSlots.map((s) => gridCellKey(s.position[0], s.position[1])),
  );
  const spawnKeys = new Set(
    doc.spawnPoints.map((sp) => gridCellKey(sp.position[0], sp.position[1])),
  );

  const [cx, cz] = doc.castle.position;
  const [cw, ch] = doc.castle.size;
  const castleRect = (gx: number, gz: number): boolean =>
    gx >= cx && gx < cx + cw && gz >= cz && gz < cz + ch;

  const root = document.createElement("div");
  root.className = "level-overview";
  root.style.setProperty("--map-gw", String(gw));
  root.style.setProperty("--map-gd", String(gd));
  root.setAttribute("aria-hidden", "true");

  const grid = document.createElement("div");
  grid.className = "level-overview__grid";

  for (let gz = 0; gz < gd; gz++) {
    for (let gx = 0; gx < gw; gx++) {
      const cell = document.createElement("div");
      cell.className = "level-overview__cell";
      const key = gridCellKey(gx, gz);
      if (castleRect(gx, gz)) cell.classList.add("level-overview__cell--castle");
      else if (spawnKeys.has(key))
        cell.classList.add("level-overview__cell--spawn");
      if (pathKeys.has(key)) cell.classList.add("level-overview__cell--path");
      if (buildKeys.has(key)) cell.classList.add("level-overview__cell--build");
      grid.appendChild(cell);
    }
  }

  root.appendChild(grid);
  return root;
}
