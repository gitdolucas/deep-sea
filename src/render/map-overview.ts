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

  /** Square shell so the thumb stays 1:1 without stretching map cells (letterbox with blank tiles). */
  const size = Math.max(gw, gd);
  const ox = Math.floor((size - gw) / 2);
  const oz = Math.floor((size - gd) / 2);

  const root = document.createElement("div");
  root.className = "level-overview";
  root.style.setProperty("--map-gw", String(size));
  root.style.setProperty("--map-gd", String(size));
  root.setAttribute("aria-hidden", "true");

  const grid = document.createElement("div");
  grid.className = "level-overview__grid";

  for (let sz = 0; sz < size; sz++) {
    for (let sx = 0; sx < size; sx++) {
      const cell = document.createElement("div");
      const inMap = sx >= ox && sx < ox + gw && sz >= oz && sz < oz + gd;
      if (!inMap) {
        cell.className = "level-overview__cell level-overview__cell--blank";
        grid.appendChild(cell);
        continue;
      }
      const gx = sx - ox;
      const gz = sz - oz;
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
