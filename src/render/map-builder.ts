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
import { validateMapDocument } from "../game/map-validation.js";

const PLAYTEST_SESSION_KEY = "deepSeaPlaytestMap";

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

type Tool =
  | "path"
  | "spawn"
  | "castle"
  | "slot"
  | "decoration"
  | "erase_dec"
  | "pop_waypoint";

const TOOL_HINTS: Record<Tool, string> = {
  path: "Each click appends a waypoint to the active path. Waypoints define the coral lane enemies follow.",
  spawn: "Moves the selected spawn to the clicked tile. New spawns default to the first path id.",
  castle: "Sets the citadel’s grid origin (front-left of the footprint). Adjust width/depth in the sidebar.",
  slot: "Toggles a build slot on this tile. Slots cannot overlap path or decoration tiles when valid.",
  decoration: "Places a prop at (x, floor y, z) using the type and transform fields on the left.",
  erase_dec: "Removes every decoration whose floor tile matches the cell you click.",
  pop_waypoint: "Click any cell to remove the last waypoint from the active path (keeps at least two).",
};

function cloneDoc(base: MapDocument): MapDocument {
  return structuredClone(base) as MapDocument;
}

let state: MapDocument = cloneDoc(MINIMAL_MAP_DOCUMENT);
let tool: Tool = "path";
let selectedPathId: string = state.paths[0]?.id ?? "path_main";
let selectedSpawnId: string = state.spawnPoints[0]?.id ?? "spawn_a";
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
  "Strip consecutive duplicate waypoints, drop build slots on paths or decoration tiles (deduped), remove defenses not on a remaining slot.";

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

const wavesTa = document.createElement("textarea");
wavesTa.spellcheck = false;

const errorsEl = document.createElement("div");
errorsEl.className = "map-builder__errors";
errorsEl.setAttribute("role", "status");
errorsEl.setAttribute("aria-live", "polite");

const toolBar = document.createElement("div");
toolBar.className = "map-builder__tools";

function toolButton(name: string, t: Tool): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = name;
  b.dataset.tool = t;
  return b;
}

const tools: [string, Tool][] = [
  ["Path", "path"],
  ["Spawn", "spawn"],
  ["Castle origin", "castle"],
  ["Build slot", "slot"],
  ["Decoration", "decoration"],
  ["Erase deco", "erase_dec"],
  ["Pop WP", "pop_waypoint"],
];
for (const [label, t] of tools) {
  const tb = toolButton(label, t);
  tb.title = TOOL_HINTS[t];
  toolBar.append(tb);
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

const btnApplyWaves = document.createElement("button");
btnApplyWaves.type = "button";
btnApplyWaves.className = "map-builder__mini";
btnApplyWaves.textContent = "Apply waves JSON";

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
    ["Build slot", "map-builder__swatch--slot", "Tower hint"],
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
  "<strong>Workflow:</strong> edit the grid with tools → validate below → download JSON to <code>data/maps/</code> → add the map to <code>src/render/levels.ts</code>. Use <strong>Playtest</strong> to try the draft in a new tab.";

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
  elField("Brush", toolBar),
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

sidebarBody.append(
  hintP,
  secMeta,
  secGrid,
  secTools,
  secDeco,
  section("Waves", [
    elField("JSON array (see map-schema.md)", wavesTa),
    (() => {
      const r = document.createElement("div");
      r.className = "map-builder__btn-row";
      r.append(btnApplyWaves);
      return r;
    })(),
    errorsEl,
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

canvasInner.append(keyRow, axesNote, legend, gridWrap);
main.append(canvasInner);
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
  if (!state.paths.some((p) => p.id === selectedPathId) && state.paths[0]) {
    selectedPathId = state.paths[0]!.id;
  }
  selectPath.value = selectedPathId;

  selectSpawn.replaceChildren();
  for (const s of state.spawnPoints) {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.id;
    selectSpawn.append(o);
  }
  if (
    !state.spawnPoints.some((s) => s.id === selectedSpawnId) &&
    state.spawnPoints[0]
  ) {
    selectedSpawnId = state.spawnPoints[0]!.id;
  }
  selectSpawn.value = selectedSpawnId;

  selectDecoType.value = decoType;
  inputDecoY.value = String(decoY);
  inputDecoRot.value = String(decoRot);
  inputDecoScale.value = String(decoScale);

  wavesTa.value = JSON.stringify(state.waves, null, 2);
  refreshToolButtons();
}

const TOOL_LABELS: Record<Tool, string> = {
  path: "Path",
  spawn: "Spawn",
  castle: "Castle",
  slot: "Build slot",
  decoration: "Decoration",
  erase_dec: "Erase deco",
  pop_waypoint: "Pop waypoint",
};

function refreshToolButtons(): void {
  for (const b of toolBar.querySelectorAll("button")) {
    const t = b.dataset.tool as Tool | undefined;
    const on = t === tool;
    if (on) b.setAttribute("data-active", "true");
    else b.removeAttribute("data-active");
    if (t) b.setAttribute("aria-pressed", on ? "true" : "false");
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

  const slotSeen = new Set<string>();
  const newBuildSlots = state.buildSlots.filter((s) => {
    const key = gridCellKey(s.position[0], s.position[1]);
    if (pathKeys.has(key)) return false;
    if (decKeys.has(key)) return false;
    if (slotSeen.has(key)) return false;
    slotSeen.add(key);
    return true;
  });

  const slotKeys = new Set(
    newBuildSlots.map((s) => gridCellKey(s.position[0], s.position[1])),
  );
  const newDefenses = state.defenses.filter((d) =>
    slotKeys.has(gridCellKey(d.position[0], d.position[1])),
  );

  state = {
    ...state,
    paths: newPaths,
    buildSlots: newBuildSlots,
    defenses: newDefenses,
  };
}

function showValidation(): void {
  syncStateFromFormMeta();
  const issues = validateMapDocument(state);
  if (issues.length === 0) {
    statusChip.textContent = "Schema OK";
    statusChip.dataset.state = "ok";
    errorsEl.dataset.visible = "true";
    errorsEl.classList.add("ok");
    errorsEl.textContent = "Valid — matches docs/map-schema.md rules.";
    return;
  }
  statusChip.textContent = `${issues.length} issue${issues.length === 1 ? "" : "s"}`;
  statusChip.dataset.state = "err";
  errorsEl.classList.remove("ok");
  errorsEl.dataset.visible = "true";
  errorsEl.textContent = issues
    .map((i) => `${i.path}: ${i.message} (${i.code})`)
    .join("\n");
}

function updateToolLegend(): void {
  const [gw, gd] = state.gridSize;
  const name = TOOL_LABELS[tool];
  const hint = TOOL_HINTS[tool];
  legend.innerHTML = `<strong>${name}</strong> · grid ${gw}×${gd}<br>${hint}`;
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
  const slotKeys = new Set(
    state.buildSlots.map((s) => gridCellKey(s.position[0], s.position[1])),
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
      if (slotKeys.has(key)) cell.classList.add("map-builder__cell--slot");
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

function onCellClick(gx: number, gz: number): void {
  syncStateFromFormMeta();
  if (tool === "path") {
    const p = state.paths.find((x) => x.id === selectedPathId);
    if (!p) return;
    const wps = [...p.waypoints, [gx, gz] as [number, number]];
    replacePath(selectedPathId, { ...p, waypoints: wps });
  } else if (tool === "pop_waypoint") {
    const p = state.paths.find((x) => x.id === selectedPathId);
    if (!p || p.waypoints.length <= 2) return;
    const wps = p.waypoints.slice(0, -1);
    replacePath(selectedPathId, { ...p, waypoints: wps });
  } else if (tool === "spawn") {
    const s = state.spawnPoints.find((x) => x.id === selectedSpawnId);
    if (!s) return;
    const next: SpawnPointDefinition[] = state.spawnPoints.map((sp) =>
      sp.id === selectedSpawnId ? { ...sp, position: [gx, gz] as [number, number] } : sp,
    );
    state = { ...state, spawnPoints: next };
  } else if (tool === "castle") {
    state = {
      ...state,
      castle: {
        ...state.castle,
        position: [gx, gz] as [number, number],
      },
    };
  } else if (tool === "slot") {
    const key = gridCellKey(gx, gz);
    const i = state.buildSlots.findIndex(
      (s) => gridCellKey(s.position[0], s.position[1]) === key,
    );
    let slots = [...state.buildSlots];
    if (i >= 0) slots.splice(i, 1);
    else slots = [...slots, { position: [gx, gz] as [number, number], type: "standard" as const }];
    state = { ...state, buildSlots: slots };
  } else if (tool === "decoration") {
    const dec: DecorationDefinition = {
      type: decoType,
      position: [gx, decoY, gz],
      rotation: decoRot,
      scale: decoScale,
    };
    state = { ...state, decorations: [...state.decorations, dec] };
  } else if (tool === "erase_dec") {
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

for (const b of toolBar.querySelectorAll("button")) {
  b.addEventListener("click", () => {
    const next = b.dataset.tool as Tool | undefined;
    if (next) {
      tool = next;
      refreshToolButtons();
      updateToolLegend();
    }
  });
}

btnApplyWaves.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(wavesTa.value) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Waves must be a JSON array.");
    syncStateFromFormMeta();
    state = { ...state, waves: parsed as WaveDefinition[] };
    wavesTa.value = JSON.stringify(state.waves, null, 2);
    rebuildGrid();
  } catch (e) {
    errorsEl.dataset.visible = "true";
    errorsEl.classList.remove("ok");
    errorsEl.textContent =
      e instanceof Error ? e.message : "Invalid waves JSON.";
  }
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
  localStorage.setItem(PLAYTEST_SESSION_KEY, JSON.stringify(doc));
  window.open("/index.html?playtest=1", "_blank");
});

btnLoadTutorial.addEventListener("click", () => {
  state = cloneDoc(MINIMAL_MAP_DOCUMENT);
  selectedPathId = state.paths[0]?.id ?? selectedPathId;
  selectedSpawnId = state.spawnPoints[0]?.id ?? selectedSpawnId;
  syncFormFromState();
  rebuildGrid();
});

syncFormFromState();
rebuildGrid();
