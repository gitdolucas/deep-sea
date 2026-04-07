import { MINIMAL_MAP_DOCUMENT } from "../game/minimal-map-document.js";
import { gridCellKey, pathCellKeySetUnion } from "../game/path-cells.js";
import type {
  DecorationDefinition,
  DecorationTypeKey,
  MapDifficulty,
  MapDocument,
  PathDefinition,
  SpawnPointDefinition,
  WaveDefinition,
} from "../game/map-types.js";
import { analyzeMapStrategyHints } from "../game/map-strategy-hints.js";
import { validateMapDocument } from "../game/map-validation.js";

const PLAYTEST_SESSION_KEY = "deepSeaPlaytestMap";
const MAP_BUILDER_DRAFT_KEY = "deepSeaMapBuilderDraft";

const DECORATION_OPTIONS: DecorationTypeKey[] = [
  "coral_branch",
  "coral_fan",
  "kelp_cluster",
  "rock_small",
  "rock_large",
  "shell_pile",
  "vent_bubble",
  "trench_edge",
  "anemone",
  "skull",
];

type CursorMode = "paint" | "erase";

type MapResource = "spawn" | "path" | "castle" | "decoration";

const RESOURCE_LABELS: Record<MapResource, string> = {
  spawn: "Spawn",
  path: "Path",
  castle: "Citadel",
  decoration: "Decoration",
};

function cloneDoc(base: MapDocument): MapDocument {
  return structuredClone(base) as MapDocument;
}

let state: MapDocument = cloneDoc(MINIMAL_MAP_DOCUMENT);
let cursorMode: CursorMode = "paint";
let activeResource: MapResource = "path";
let selectedPathId: string = state.paths[0]?.id ?? "";
let selectedSpawnId: string = state.spawnPoints[0]?.id ?? "";
let decoType: DecorationTypeKey = "rock_small";
let decoY = 0;
let decoRot = 0;
let decoScale = 1;

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

const sidebar = document.createElement("aside");
sidebar.className = "map-builder__sidebar";

const main = document.createElement("main");
main.className = "map-builder__main";

const canvasInner = document.createElement("div");
canvasInner.className = "map-builder__canvas-inner";

function section(title: string, children: HTMLElement[]): HTMLElement {
  const sec = document.createElement("section");
  sec.className = "map-builder__section";
  const h = document.createElement("h2");
  h.className = "map-builder__section-title";
  h.textContent = title;
  sec.append(h, ...children);
  return sec;
}

function elField(
  label: string,
  child: HTMLElement,
  className = "map-builder__field",
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = className;
  const lab = document.createElement("label");
  lab.textContent = label;
  wrap.append(lab, child);
  return wrap;
}

const inputId = document.createElement("input");
inputId.type = "text";

const inputName = document.createElement("input");
inputName.type = "text";

const selectDifficulty = document.createElement("select");
for (const d of ["normal", "hard", "nightmare"] as const) {
  const o = document.createElement("option");
  o.value = d;
  o.textContent = d;
  selectDifficulty.append(o);
}

const inputShells = document.createElement("input");
inputShells.type = "number";
inputShells.min = "0";
inputShells.step = "1";

const inputGw = document.createElement("input");
inputGw.type = "number";
inputGw.min = "1";
inputGw.step = "1";
const inputGd = document.createElement("input");
inputGd.type = "number";
inputGd.min = "1";
inputGd.step = "1";

const btnApplyGrid = document.createElement("button");
btnApplyGrid.type = "button";
btnApplyGrid.textContent = "Apply grid size";
btnApplyGrid.className = "map-builder__mini";

const btnCleanup = document.createElement("button");
btnCleanup.type = "button";
btnCleanup.textContent = "Clean up map";
btnCleanup.className = "map-builder__mini";
btnCleanup.title =
  "Strip consecutive duplicate waypoints; remove defenses on path, decoration, or citadel tiles.";

const inputCastleW = document.createElement("input");
inputCastleW.type = "number";
inputCastleW.min = "1";
inputCastleW.step = "1";
const inputCastleD = document.createElement("input");
inputCastleD.type = "number";
inputCastleD.min = "1";
inputCastleD.step = "1";

const selectPath = document.createElement("select");
const btnNewPath = document.createElement("button");
btnNewPath.type = "button";
btnNewPath.textContent = "New path";
btnNewPath.className = "map-builder__mini";
const btnPopWp = document.createElement("button");
btnPopWp.type = "button";
btnPopWp.textContent = "Pop last waypoint";
btnPopWp.className = "map-builder__mini";
btnPopWp.title = "Remove the last waypoint from the active path (min 2 remain).";

const selectSpawn = document.createElement("select");
const btnNewSpawn = document.createElement("button");
btnNewSpawn.type = "button";
btnNewSpawn.textContent = "New spawn";
btnNewSpawn.className = "map-builder__mini";

const selectDecoType = document.createElement("select");
for (const k of DECORATION_OPTIONS) {
  const o = document.createElement("option");
  o.value = k;
  o.textContent = k;
  selectDecoType.append(o);
}

const inputDecoY = document.createElement("input");
inputDecoY.type = "number";
inputDecoY.step = "any";
const inputDecoRot = document.createElement("input");
inputDecoRot.type = "number";
inputDecoRot.step = "any";
const inputDecoScale = document.createElement("input");
inputDecoScale.type = "number";
inputDecoScale.min = "0.01";
inputDecoScale.step = "any";

const errorsEl = document.createElement("div");
errorsEl.className = "map-builder__errors";
errorsEl.setAttribute("role", "status");
errorsEl.setAttribute("aria-live", "polite");

const hintsEl = document.createElement("div");
hintsEl.className = "map-builder__hints";
hintsEl.setAttribute("role", "status");
hintsEl.setAttribute("aria-live", "polite");

const bottomToolbar = document.createElement("div");
bottomToolbar.className = "map-builder__toolbar map-builder__toolbar--rail";
bottomToolbar.setAttribute("role", "toolbar");
bottomToolbar.setAttribute("aria-label", "Map paint tools");

const toolbarRowModes = document.createElement("div");
toolbarRowModes.className =
  "map-builder__toolbar-row map-builder__tool-rail-block map-builder__tool-rail-block--modes";
const modesLabel = document.createElement("span");
modesLabel.className = "map-builder__toolbar-label";
modesLabel.textContent = "Cursor";
toolbarRowModes.append(modesLabel);

function modeButton(label: string, mode: CursorMode): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "map-builder__mode-btn";
  b.textContent = label;
  b.dataset.cursorMode = mode;
  b.title = mode === "paint" ? "Click tiles to place or extend" : "Click tiles to remove";
  return b;
}
toolbarRowModes.append(modeButton("Paint", "paint"), modeButton("Erase", "erase"));

const toolbarRowResources = document.createElement("div");
toolbarRowResources.className =
  "map-builder__toolbar-row map-builder__tool-rail-block map-builder__tool-rail-block--resources";
const resLabel = document.createElement("span");
resLabel.className = "map-builder__toolbar-label";
resLabel.textContent = "Resource";
toolbarRowResources.append(resLabel);

const resourceGroup = document.createElement("div");
resourceGroup.className = "map-builder__resource-group";

function resourceButton(
  label: string,
  resource: MapResource,
  cssMod: string,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `map-builder__resource-btn map-builder__resource-btn--${cssMod}`;
  b.dataset.resource = resource;
  b.title = `${label} (${resource})`;
  b.setAttribute("aria-label", label);
  const sw = document.createElement("span");
  sw.className = "map-builder__resource-swatch";
  sw.setAttribute("aria-hidden", "true");
  const lab = document.createElement("span");
  lab.className = "map-builder__resource-label";
  lab.textContent = label;
  b.append(sw, lab);
  return b;
}

resourceGroup.append(
  resourceButton("Spawn", "spawn", "spawn"),
  resourceButton("Path", "path", "path"),
  resourceButton("Citadel", "castle", "castle"),
  resourceButton("Decoration", "decoration", "decoration"),
);
toolbarRowResources.append(resourceGroup);

bottomToolbar.append(toolbarRowModes, toolbarRowResources);

const toolRail = document.createElement("aside");
toolRail.className = "map-builder__tool-rail";
toolRail.append(bottomToolbar);

for (const b of toolRail.querySelectorAll("[data-cursor-mode]")) {
  b.addEventListener("click", () => {
    const m = (b as HTMLButtonElement).dataset.cursorMode as CursorMode;
    if (m) {
      cursorMode = m;
      refreshBottomToolbar();
      updateToolLegend();
    }
  });
}
for (const b of toolRail.querySelectorAll("[data-resource]")) {
  b.addEventListener("click", () => {
    const r = (b as HTMLButtonElement).dataset.resource as MapResource;
    if (r) {
      activeResource = r;
      refreshBottomToolbar();
      updateToolLegend();
    }
  });
}

const btnDownload = document.createElement("button");
btnDownload.type = "button";
btnDownload.className = "primary";
btnDownload.textContent = "Download JSON";

const btnPlaytest = document.createElement("button");
btnPlaytest.type = "button";
btnPlaytest.className = "secondary";
btnPlaytest.textContent = "Playtest";

const btnLoadTutorial = document.createElement("button");
btnLoadTutorial.type = "button";
btnLoadTutorial.className = "secondary";
btnLoadTutorial.textContent = "Load tutorial map";

const legend = document.createElement("div");
legend.className = "map-builder__legend";

const axesNote = document.createElement("div");
axesNote.className = "map-builder__axes";

function buildKeyRow(): HTMLElement {
  const row = document.createElement("div");
  row.className = "map-builder__key";
  const items: [string, string, string][] = [
    ["Path", "map-builder__swatch--path", "Enemy route"],
    ["Spawn", "map-builder__swatch--spawn", "Lane entry"],
    ["Citadel", "map-builder__swatch--castle", "Castle footprint"],
    ["Buildable", "map-builder__swatch--buildable", "Open sand (tower OK)"],
    ["Decoration", "map-builder__swatch--deco", "Blocks build"],
  ];
  for (const [label, swatch, title] of items) {
    const item = document.createElement("span");
    item.className = "map-builder__key-item";
    item.title = title;
    const sw = document.createElement("span");
    sw.className = `map-builder__swatch ${swatch}`;
    item.append(sw, document.createTextNode(label));
    row.append(item);
  }
  return row;
}

const keyRow = buildKeyRow();

const gridWrap = document.createElement("div");
gridWrap.className = "map-builder__gridWrap";

const sidebarHead = document.createElement("header");
sidebarHead.className = "map-builder__sidebar-head";

const backLink = document.createElement("a");
backLink.className = "map-builder__back";
backLink.href = "/index.html";
backLink.textContent = "← Return to game";

const titleRow = document.createElement("div");
titleRow.className = "map-builder__title-row";

const titleBlock = document.createElement("div");
const h1 = document.createElement("h1");
h1.textContent = "Map builder";
const subtitle = document.createElement("p");
subtitle.className = "map-builder__subtitle";
subtitle.textContent =
  "Author maps for Deep Abyss TD. Output must match docs/map-schema.md.";
titleBlock.append(h1, subtitle);

const statusChip = document.createElement("div");
statusChip.className = "map-builder__status";
statusChip.textContent = "…";
statusChip.dataset.state = "";

titleRow.append(titleBlock, statusChip);
sidebarHead.append(backLink, titleRow);

const sidebarBody = document.createElement("div");
sidebarBody.className = "map-builder__sidebar-body";

const hintP = document.createElement("p");
hintP.className = "map-builder__hint";
hintP.innerHTML =
  "<strong>Workflow:</strong> edit the grid → fix schema errors → optional layout hints → download JSON to <code>data/maps/</code>. <strong>Playtest</strong> opens the game; use <strong>Map builder</strong> on the end screen to resume editing.";

const secMeta = section("Map metadata", [
  elField("Map id", inputId),
  elField("Display name", inputName),
  elField("Difficulty", selectDifficulty),
  elField("Starting shells", inputShells),
]);

const gridFieldInner = document.createElement("div");
const gridRow = document.createElement("div");
gridRow.className = "map-builder__row2";
gridRow.append(inputGw, inputGd);
const gridBtnRow = document.createElement("div");
gridBtnRow.className = "map-builder__btn-row";
gridBtnRow.append(btnApplyGrid, btnCleanup);
gridFieldInner.append(gridRow, gridBtnRow);

const castleRow = document.createElement("div");
castleRow.className = "map-builder__row2";
castleRow.append(inputCastleW, inputCastleD);

const secGrid = section("Grid & citadel", [
  elField("Grid size (W × D tiles)", gridFieldInner),
  elField("Castle footprint (W × D)", castleRow),
]);

const pathActions = document.createElement("div");
pathActions.className = "map-builder__btn-row";
pathActions.append(btnNewPath, btnPopWp);

const secTools = section("Tools & lanes", [
  elField("Active path", selectPath),
  elField("Path actions", pathActions),
  elField("Active spawn", selectSpawn),
  elField("Spawn", btnNewSpawn),
]);

const decoGrid = document.createElement("div");
decoGrid.style.display = "grid";
decoGrid.style.gridTemplateColumns = "1fr 1fr";
decoGrid.style.gap = "10px";
decoGrid.append(selectDecoType, inputDecoY);
const decoRow2 = document.createElement("div");
decoRow2.className = "map-builder__row2";
decoRow2.append(inputDecoRot, inputDecoScale);
const decoWrap = document.createElement("div");
decoWrap.append(decoGrid, decoRow2);

const secDeco = section("Decorations", [elField("Type, Y, rotation°, scale", decoWrap)]);

const wavesNote = document.createElement("p");
wavesNote.className = "map-builder__waves-note";
wavesNote.textContent =
  "Wave data starts empty. Playtest injects a single Stoneclaw wave (first path + spawn) when you have no waves; export stays as authored. Full wave JSON lives in shipped maps and a future editor.";

sidebarBody.append(
  hintP,
  secMeta,
  secGrid,
  secTools,
  secDeco,
  section("Waves", [wavesNote]),
  section("Validation", [
    elField("Schema (blocking for download / playtest)", errorsEl),
    elField("Layout hints (deep-sea-map-strategy)", hintsEl),
  ]),
  (() => {
    const a = document.createElement("div");
    a.className = "map-builder__actions";
    const row1 = document.createElement("div");
    row1.className = "map-builder__actions-row";
    row1.append(btnDownload, btnPlaytest);
    const row2 = document.createElement("div");
    row2.className = "map-builder__actions-row";
    row2.append(btnLoadTutorial);
    a.append(row1, row2);
    return a;
  })(),
);

sidebar.append(sidebarHead, sidebarBody);

const artboard = document.createElement("div");
artboard.className = "map-builder__artboard";
artboard.append(gridWrap);

const mapColumn = document.createElement("div");
mapColumn.className = "map-builder__map-column";
mapColumn.append(artboard);

const workspace = document.createElement("div");
workspace.className = "map-builder__workspace";
workspace.append(toolRail, mapColumn);

canvasInner.append(keyRow, axesNote, legend, workspace);

const cleanWholeFab = document.createElement("div");
cleanWholeFab.className = "map-builder__clean-whole-fab";
const btnCleanWholeMap = document.createElement("button");
btnCleanWholeMap.type = "button";
btnCleanWholeMap.className = "map-builder__clean-whole-btn";
btnCleanWholeMap.textContent = "Clean whole map";
btnCleanWholeMap.title =
  "Reset layout to the default template (9×9, centered citadel only — no paths, spawns, or waves). Keeps map id, name, difficulty, and starting shells.";
cleanWholeFab.append(btnCleanWholeMap);

main.append(canvasInner, cleanWholeFab);
root.append(sidebar, main);

let gridEl: HTMLDivElement | null = null;

function syncFormFromState(): void {
  inputId.value = state.id;
  inputName.value = state.name;
  selectDifficulty.value = state.difficulty;
  inputShells.value = String(state.startingShells ?? 50);
  inputGw.value = String(state.gridSize[0]);
  inputGd.value = String(state.gridSize[1]);
  inputCastleW.value = String(state.castle.size[0]);
  inputCastleD.value = String(state.castle.size[1]);

  selectPath.replaceChildren();
  for (const p of state.paths) {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.id;
    selectPath.append(o);
  }
  if (state.paths.length === 0) {
    selectedPathId = "";
  } else if (!state.paths.some((p) => p.id === selectedPathId)) {
    selectedPathId = state.paths[0]!.id;
  }
  if (state.paths.length > 0) {
    selectPath.value = selectedPathId;
  }

  selectSpawn.replaceChildren();
  for (const s of state.spawnPoints) {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.id;
    selectSpawn.append(o);
  }
  if (state.spawnPoints.length === 0) {
    selectedSpawnId = "";
  } else if (!state.spawnPoints.some((s) => s.id === selectedSpawnId)) {
    selectedSpawnId = state.spawnPoints[0]!.id;
  }
  if (state.spawnPoints.length > 0) {
    selectSpawn.value = selectedSpawnId;
  }

  selectDecoType.value = decoType;
  inputDecoY.value = String(decoY);
  inputDecoRot.value = String(decoRot);
  inputDecoScale.value = String(decoScale);

  refreshBottomToolbar();
}

function refreshBottomToolbar(): void {
  for (const b of toolRail.querySelectorAll("[data-cursor-mode]")) {
    const btn = b as HTMLButtonElement;
    const m = btn.dataset.cursorMode as CursorMode | undefined;
    const on = m === cursorMode;
    if (on) btn.setAttribute("data-active", "true");
    else btn.removeAttribute("data-active");
    if (m) btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  for (const b of toolRail.querySelectorAll("[data-resource]")) {
    const btn = b as HTMLButtonElement;
    const r = btn.dataset.resource as MapResource | undefined;
    const on = r === activeResource;
    if (on) btn.setAttribute("data-active", "true");
    else btn.removeAttribute("data-active");
    if (r) btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

function syncStateFromFormMeta(): void {
  state.id = inputId.value.trim() || "untitled";
  state.name = inputName.value.trim() || state.id;
  state.difficulty = selectDifficulty.value as MapDifficulty;
  const ss = Number(inputShells.value);
  if (Number.isFinite(ss) && ss >= 0) state.startingShells = ss;
  const cw = Number(inputCastleW.value);
  const cd = Number(inputCastleD.value);
  if (Number.isInteger(cw) && cw >= 1 && Number.isInteger(cd) && cd >= 1) {
    state.castle = {
      ...state.castle,
      size: [cw, cd],
    };
  }
  decoType = selectDecoType.value as DecorationTypeKey;
  const dy = Number(inputDecoY.value);
  if (Number.isFinite(dy)) decoY = dy;
  const dr = Number(inputDecoRot.value);
  if (Number.isFinite(dr)) decoRot = dr;
  const dsc = Number(inputDecoScale.value);
  if (Number.isFinite(dsc) && dsc > 0) decoScale = dsc;
}

function decorationKeySet(): Set<string> {
  const set = new Set<string>();
  for (const d of state.decorations) {
    set.add(gridCellKey(Math.floor(d.position[0]), Math.floor(d.position[2])));
  }
  return set;
}

function dedupeConsecutiveWaypoints(
  waypoints: readonly [number, number][],
): [number, number][] {
  const out: [number, number][] = [];
  for (const w of waypoints) {
    const prev = out[out.length - 1];
    if (prev && prev[0] === w[0] && prev[1] === w[1]) continue;
    out.push([w[0], w[1]]);
  }
  return out;
}

/** Ensure editor never leaves a path with fewer than two waypoints (spawnEnemyFromWaveGroup). */
function ensurePathWaypointMinimum(wps: [number, number][]): [number, number][] {
  if (wps.length >= 2) return wps;
  if (wps.length === 1) {
    const a = wps[0]!;
    return [a, [a[0] + 1, a[1]]];
  }
  return [
    [0, 0],
    [1, 0],
  ];
}

function runCleanupMap(): void {
  syncStateFromFormMeta();
  const decKeys = decorationKeySet();

  const newPaths = state.paths.map((p) => {
    const wps = ensurePathWaypointMinimum(dedupeConsecutiveWaypoints([...p.waypoints]));
    return { ...p, waypoints: wps };
  });

  const pathKeys = pathCellKeySetUnion(newPaths);
  const [cx, cz] = state.castle.position;
  const [cw, ch] = state.castle.size;
  const inCastle = (gx: number, gz: number): boolean =>
    gx >= cx && gx < cx + cw && gz >= cz && gz < cz + ch;

  const newDefenses = state.defenses.filter((d) => {
    const k = gridCellKey(d.position[0], d.position[1]);
    if (pathKeys.has(k)) return false;
    if (decKeys.has(k)) return false;
    if (inCastle(d.position[0], d.position[1])) return false;
    return true;
  });

  state = {
    ...state,
    paths: newPaths,
    defenses: newDefenses,
  };
}

function showValidation(): void {
  syncStateFromFormMeta();
  const issues = validateMapDocument(state);
  const hints = issues.length === 0 ? analyzeMapStrategyHints(state) : [];

  if (issues.length === 0) {
    errorsEl.dataset.visible = "true";
    errorsEl.classList.add("ok");
    errorsEl.textContent = "No schema errors — matches docs/map-schema.md.";
  } else {
    errorsEl.classList.remove("ok");
    errorsEl.dataset.visible = "true";
    errorsEl.textContent = issues
      .map((i) => `${i.path}: ${i.message} (${i.code})`)
      .join("\n");
  }

  if (hints.length === 0) {
    hintsEl.removeAttribute("data-visible");
    hintsEl.textContent = "";
  } else {
    hintsEl.dataset.visible = "true";
    hintsEl.textContent = hints
      .map((h) => `[${h.code}] ${h.path}: ${h.message}`)
      .join("\n\n");
  }

  if (issues.length > 0) {
    statusChip.textContent = `${issues.length} error${issues.length === 1 ? "" : "s"}`;
    statusChip.dataset.state = "err";
  } else if (hints.length > 0) {
    statusChip.textContent = `OK · ${hints.length} hint${hints.length === 1 ? "" : "s"}`;
    statusChip.dataset.state = "warn";
  } else {
    statusChip.textContent = "Schema OK";
    statusChip.dataset.state = "ok";
  }
}

function updateToolLegend(): void {
  const [gw, gd] = state.gridSize;
  const modeLabel = cursorMode === "paint" ? "Paint" : "Erase";
  const resLabel = RESOURCE_LABELS[activeResource];
  const paintHints: Record<MapResource, string> = {
    spawn: "Places or moves the active spawn (red). First spawn auto-creates a path if needed.",
    path: "Extends the active path with a new waypoint (green). A path is created automatically on first click if needed.",
    castle: "Sets the citadel origin—the front-left of its footprint (blue).",
    decoration: "Places the sidebar decoration type on this tile (purple).",
  };
  const eraseHints: Record<MapResource, string> = {
    spawn: "Removes spawns on the clicked tile.",
    path: "Removes a waypoint at this tile on the active path (minimum two waypoints kept).",
    castle: "Citadel stays on the map—use Paint + Citadel to move it.",
    decoration: "Removes decorations whose floor tile matches.",
  };
  const hint = cursorMode === "paint" ? paintHints[activeResource] : eraseHints[activeResource];
  legend.innerHTML = `<strong>${modeLabel}</strong> · <strong>${resLabel}</strong> · grid ${gw}×${gd}<br>${hint}`;
}

function rebuildGrid(): void {
  syncStateFromFormMeta();
  const [gw, gd] = state.gridSize;
  axesNote.textContent = "Origin front-left · +X right · +Z toward citadel (see map-schema.md)";
  updateToolLegend();

  const pathKeys = pathCellKeySetUnion(state.paths);
  const spawnKeys = new Set(
    state.spawnPoints.map((s) => gridCellKey(s.position[0], s.position[1])),
  );
  const decKeys = decorationKeySet();

  const [cx, cz] = state.castle.position;
  const [cw, ch] = state.castle.size;
  const inCastle = (gx: number, gz: number): boolean =>
    gx >= cx && gx < cx + cw && gz >= cz && gz < cz + ch;

  gridWrap.replaceChildren();
  gridEl = document.createElement("div");
  gridEl.className = "map-builder__grid";
  gridEl.style.gridTemplateColumns = `repeat(${gw}, 1fr)`;

  for (let gz = 0; gz < gd; gz++) {
    for (let gx = 0; gx < gw; gx++) {
      const cell = document.createElement("div");
      cell.className = "map-builder__cell";
      cell.dataset.gx = String(gx);
      cell.dataset.gz = String(gz);
      const key = gridCellKey(gx, gz);
      if (inCastle(gx, gz)) cell.classList.add("map-builder__cell--castle");
      else if (spawnKeys.has(key))
        cell.classList.add("map-builder__cell--spawn");
      if (pathKeys.has(key)) cell.classList.add("map-builder__cell--path");
      const towerOk =
        !inCastle(gx, gz) && !pathKeys.has(key) && !decKeys.has(key);
      if (towerOk) cell.classList.add("map-builder__cell--buildable");
      if (decKeys.has(key))
        cell.classList.add("map-builder__cell--decoration");

      cell.title = `Tile ${gx}, ${gz}`;
      cell.addEventListener("click", () => onCellClick(gx, gz));
      gridEl.append(cell);
    }
  }
  gridWrap.append(gridEl);
  showValidation();
}

function buddySecondWaypoint(
  gx: number,
  gz: number,
  gw: number,
  gd: number,
): [number, number] {
  if (gx + 1 < gw) return [gx + 1, gz];
  if (gx - 1 >= 0) return [gx - 1, gz];
  if (gz + 1 < gd) return [gx, gz + 1];
  return [gx, Math.max(0, gz - 1)];
}

function createAutoPathAt(gx: number, gz: number): void {
  const [gw, gd] = state.gridSize;
  let n = state.paths.length + 1;
  let id = `path_${n}`;
  while (state.paths.some((p) => p.id === id)) {
    n++;
    id = `path_${n}`;
  }
  const b = buddySecondWaypoint(gx, gz, gw, gd);
  const path: PathDefinition = { id, waypoints: [[gx, gz], b] };
  state = { ...state, paths: [...state.paths, path] };
  selectedPathId = id;
}

function ensureAtLeastOnePath(): string {
  if (state.paths.length > 0) {
    return selectedPathId || state.paths[0]!.id;
  }
  createAutoPathAt(0, 0);
  return state.paths[0]!.id;
}

function onCellClick(gx: number, gz: number): void {
  syncStateFromFormMeta();

  if (cursorMode === "paint") {
    if (activeResource === "path") {
      if (state.paths.length === 0) {
        createAutoPathAt(gx, gz);
      } else {
        const p = state.paths.find((x) => x.id === selectedPathId);
        if (!p) return;
        const wps = [...p.waypoints, [gx, gz] as [number, number]];
        replacePath(selectedPathId, { ...p, waypoints: wps });
      }
    } else if (activeResource === "spawn") {
      const pathId = ensureAtLeastOnePath();
      if (state.spawnPoints.length === 0) {
        let n = 1;
        let id = `spawn_${n}`;
        while (state.spawnPoints.some((s) => s.id === id)) {
          n++;
          id = `spawn_${n}`;
        }
        state = {
          ...state,
          spawnPoints: [
            {
              id,
              position: [gx, gz],
              pathIds: [pathId],
            },
          ],
        };
        selectedSpawnId = id;
      } else {
        const s = state.spawnPoints.find((x) => x.id === selectedSpawnId);
        if (!s) return;
        state = {
          ...state,
          spawnPoints: state.spawnPoints.map((sp) =>
            sp.id === selectedSpawnId
              ? { ...sp, position: [gx, gz] as [number, number] }
              : sp,
          ),
        };
      }
    } else if (activeResource === "castle") {
      state = {
        ...state,
        castle: {
          ...state.castle,
          position: [gx, gz] as [number, number],
        },
      };
    } else if (activeResource === "decoration") {
      const dec: DecorationDefinition = {
        type: decoType,
        position: [gx, decoY, gz],
        rotation: decoRot,
        scale: decoScale,
      };
      state = { ...state, decorations: [...state.decorations, dec] };
    }
  } else {
    if (activeResource === "spawn") {
      state = {
        ...state,
        spawnPoints: state.spawnPoints.filter(
          (sp) => !(sp.position[0] === gx && sp.position[1] === gz),
        ),
      };
      if (!state.spawnPoints.some((s) => s.id === selectedSpawnId)) {
        selectedSpawnId = state.spawnPoints[0]?.id ?? "";
      }
    } else if (activeResource === "path") {
      const p = state.paths.find((x) => x.id === selectedPathId);
      if (!p) return;
      const filtered = p.waypoints.filter((w) => !(w[0] === gx && w[1] === gz));
      const wps = ensurePathWaypointMinimum([...filtered]);
      replacePath(selectedPathId, { ...p, waypoints: wps });
    } else if (activeResource === "castle") {
      return;
    } else if (activeResource === "decoration") {
      state = {
        ...state,
        decorations: state.decorations.filter(
          (d) =>
            !(
              Math.floor(d.position[0]) === gx &&
              Math.floor(d.position[2]) === gz
            ),
        ),
      };
    }
  }
  syncFormFromState();
  rebuildGrid();
}

function replacePath(id: string, def: PathDefinition): void {
  state = {
    ...state,
    paths: state.paths.map((p) => (p.id === id ? def : p)),
  };
}

function exportDoc(): MapDocument {
  syncStateFromFormMeta();
  const raw = structuredClone(state) as MapDocument & { description?: string };
  delete raw.description;
  return raw as MapDocument;
}

/** One test wave for playtest when the draft has paths + spawns but no `waves` yet. */
function ensurePlayableWavesForPlaytest(doc: MapDocument): MapDocument {
  if (doc.waves.length > 0) return doc;
  const p = doc.paths[0];
  const s = doc.spawnPoints[0];
  if (!p || !s || p.waypoints.length < 2) return doc;
  const stub: WaveDefinition = {
    wave: 1,
    prepTime: 10,
    isBoss: false,
    groups: [
      {
        enemyType: "stoneclaw",
        count: 1,
        spawnId: s.id,
        pathId: p.id,
        interval: 1,
        delay: 0,
        hpMultiplier: 1,
        speedMultiplier: 1,
      },
    ],
  };
  return { ...doc, waves: [stub] };
}

btnApplyGrid.addEventListener("click", () => {
  syncStateFromFormMeta();
  const w = Number(inputGw.value);
  const h = Number(inputGd.value);
  if (!Number.isInteger(w) || w < 1 || !Number.isInteger(h) || h < 1) return;
  state = { ...state, gridSize: [w, h] as [number, number] };
  syncFormFromState();
  rebuildGrid();
});

btnCleanup.addEventListener("click", () => {
  runCleanupMap();
  syncFormFromState();
  rebuildGrid();
});

selectPath.addEventListener("change", () => {
  selectedPathId = selectPath.value;
});

selectSpawn.addEventListener("change", () => {
  selectedSpawnId = selectSpawn.value;
});

btnNewPath.addEventListener("click", () => {
  syncStateFromFormMeta();
  let n = state.paths.length + 1;
  let id = `path_${n}`;
  while (state.paths.some((p) => p.id === id)) {
    n++;
    id = `path_${n}`;
  }
  const path: PathDefinition = {
    id,
    waypoints: [
      [0, 0],
      [1, 0],
    ],
  };
  state = { ...state, paths: [...state.paths, path] };
  selectedPathId = id;
  syncFormFromState();
  rebuildGrid();
});

btnPopWp.addEventListener("click", () => {
  syncStateFromFormMeta();
  const p = state.paths.find((x) => x.id === selectedPathId);
  if (!p || p.waypoints.length <= 2) return;
  replacePath(selectedPathId, {
    ...p,
    waypoints: p.waypoints.slice(0, -1),
  });
  syncFormFromState();
  rebuildGrid();
});

btnNewSpawn.addEventListener("click", () => {
  syncStateFromFormMeta();
  const pathId = state.paths[0]?.id;
  if (!pathId) return;
  let n = state.spawnPoints.length + 1;
  let id = `spawn_${n}`;
  while (state.spawnPoints.some((s) => s.id === id)) {
    n++;
    id = `spawn_${n}`;
  }
  const sp: SpawnPointDefinition = {
    id,
    position: [0, 0],
    pathIds: [pathId],
  };
  state = { ...state, spawnPoints: [...state.spawnPoints, sp] };
  selectedSpawnId = id;
  syncFormFromState();
  rebuildGrid();
});

inputId.addEventListener("input", () => {
  state.id = inputId.value;
  showValidation();
});
inputName.addEventListener("input", () => {
  state.name = inputName.value;
});
selectDifficulty.addEventListener("change", () => {
  state.difficulty = selectDifficulty.value as MapDifficulty;
  showValidation();
});

btnDownload.addEventListener("click", () => {
  const doc = exportDoc();
  const issues = validateMapDocument(doc);
  if (issues.length > 0) {
    showValidation();
    return;
  }
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${doc.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

btnPlaytest.addEventListener("click", () => {
  const doc = exportDoc();
  const issues = validateMapDocument(doc);
  if (issues.length > 0) {
    showValidation();
    return;
  }
  const p = doc.paths[0];
  const s = doc.spawnPoints[0];
  if (!p || p.waypoints.length < 2 || !s) {
    syncStateFromFormMeta();
    errorsEl.dataset.visible = "true";
    errorsEl.classList.remove("ok");
    errorsEl.textContent =
      "Playtest needs at least one path with 2+ waypoints and one spawn. Paint them with the bottom toolbar, or use Download and edit JSON.";
    statusChip.textContent = "Playtest blocked";
    statusChip.dataset.state = "err";
    return;
  }
  const forGame = ensurePlayableWavesForPlaytest(doc);
  if (validateMapDocument(forGame).length > 0) {
    showValidation();
    return;
  }
  try {
    sessionStorage.setItem(MAP_BUILDER_DRAFT_KEY, JSON.stringify(doc));
  } catch {
    /* quota or private mode — playtest still works from localStorage */
  }
  localStorage.setItem(PLAYTEST_SESSION_KEY, JSON.stringify(forGame));
  window.open("/index.html?playtest=1&mapBuilderReturn=1", "_blank");
});

function cleanWholeMapLayout(): void {
  syncStateFromFormMeta();
  const preserve = {
    id: state.id,
    name: state.name,
    difficulty: state.difficulty,
    startingShells: state.startingShells,
  };
  state = cloneDoc(MINIMAL_MAP_DOCUMENT);
  state.id = preserve.id;
  state.name = preserve.name;
  state.difficulty = preserve.difficulty;
  state.startingShells = preserve.startingShells;
  selectedPathId = state.paths[0]?.id ?? "";
  selectedSpawnId = state.spawnPoints[0]?.id ?? "";
  syncFormFromState();
  rebuildGrid();
}

btnLoadTutorial.addEventListener("click", () => {
  state = cloneDoc(MINIMAL_MAP_DOCUMENT);
  selectedPathId = state.paths[0]?.id ?? "";
  selectedSpawnId = state.spawnPoints[0]?.id ?? "";
  syncFormFromState();
  rebuildGrid();
});

btnCleanWholeMap.addEventListener("click", () => {
  cleanWholeMapLayout();
});

function tryRestoreFromSession(): boolean {
  const params = new URLSearchParams(location.search);
  if (params.get("restore") !== "1") return false;
  history.replaceState({}, "", location.pathname);
  try {
    const raw = sessionStorage.getItem(MAP_BUILDER_DRAFT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown;
    if (validateMapDocument(parsed).length > 0) return false;
    state = cloneDoc(parsed as MapDocument);
    selectedPathId = state.paths[0]?.id ?? "";
    selectedSpawnId = state.spawnPoints[0]?.id ?? "";
    return true;
  } catch {
    return false;
  }
}

tryRestoreFromSession();
syncFormFromState();
rebuildGrid();
