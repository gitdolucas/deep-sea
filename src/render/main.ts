import { MINIMAL_MAP_DOCUMENT } from "../game/minimal-map-document.js";
import { validateMapDocument } from "../game/map-validation.js";
import type { MapDocument } from "../game/map-types.js";
import { GameApp, type MissionEndNavigation } from "./GameApp.js";
import { LEVELS } from "./levels.js";
import { createMapOverviewElement } from "./map-overview.js";
import { shouldMountBubbleAttackFxLeva } from "./bubble-attack-fx-tuning.js";
import { shouldMountCannonDnaHelixLeva } from "./cannon-dna-helix-tuning.js";
import { shouldMountVibrationDomeLeva } from "./vibration-dome-tuning.js";

if (shouldMountVibrationDomeLeva()) {
  void import("./mount-vibration-dome-leva.js").then((m) =>
    m.mountVibrationDomeLeva(),
  );
}

if (shouldMountBubbleAttackFxLeva()) {
  void import("./mount-bubble-attack-fx-leva.js").then((m) =>
    m.mountBubbleAttackFxLeva(),
  );
}

if (shouldMountCannonDnaHelixLeva()) {
  void import("./mount-cannon-dna-helix-leva.js").then((m) =>
    m.mountCannonDnaHelixLeva(),
  );
}

const PLAYTEST_SESSION_KEY = "deepSeaPlaytestMap";

function takePlaytestDocument(): MapDocument | null {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("playtest") !== "1") return null;
    const raw = localStorage.getItem(PLAYTEST_SESSION_KEY);
    if (!raw) return null;
    localStorage.removeItem(PLAYTEST_SESSION_KEY);
    const parsed = JSON.parse(raw) as unknown;
    if (validateMapDocument(parsed).length > 0) return null;
    return parsed as MapDocument;
  } catch {
    return null;
  }
}

const mainMenu = document.getElementById("mainMenu");
const gameScreen = document.getElementById("gameScreen");
const gameMount = document.getElementById("gameMount");
const btnPlay = document.getElementById("btnPlay") as HTMLButtonElement | null;
const btnMainMenu = document.getElementById("btnMainMenu");
const quitDialog = document.getElementById("quitDialog");
const quitConfirmYes = document.getElementById("quitConfirmYes");
const quitConfirmNo = document.getElementById("quitConfirmNo");
const levelSelectHost = document.getElementById("levelSelectHost");
const skipToContent = document.getElementById(
  "skipToContent",
) as HTMLAnchorElement | null;

function syncSkipLinkTarget(): void {
  if (!skipToContent) return;
  const menuVisible = mainMenu?.classList.contains("visible") ?? false;
  const gameVisible = Boolean(
    gameScreen && !gameScreen.hasAttribute("hidden"),
  );
  if (gameVisible && !menuVisible) {
    skipToContent.href = "#gameScreen";
    skipToContent.textContent = "Skip to game";
  } else {
    skipToContent.href = "#mainMenu";
    skipToContent.textContent = "Skip to main menu";
  }
}

skipToContent?.addEventListener("click", () => {
  const hash = new URL(skipToContent.href).hash;
  const el = hash ? document.querySelector<HTMLElement>(hash) : null;
  if (!el) return;
  window.requestAnimationFrame(() => {
    el.focus({ preventScroll: false });
  });
});

let app: GameApp | null = null;
let selectedLevelId = LEVELS[0]?.id ?? MINIMAL_MAP_DOCUMENT.id;
/** Map for the active run (retry / nav); set whenever a mission starts. */
let activeMissionDoc: MapDocument | null = null;

function getSelectedDocument(): MapDocument {
  return (
    LEVELS.find((l) => l.id === selectedLevelId)?.document ??
    MINIMAL_MAP_DOCUMENT
  );
}

function renderLevelSelect(): void {
  if (!levelSelectHost) return;
  levelSelectHost.replaceChildren();
  for (const level of LEVELS) {
    const label = document.createElement("label");
    label.className = "level-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "levelId";
    input.value = level.id;
    input.checked = level.id === selectedLevelId;
    input.addEventListener("change", () => {
      if (input.checked) selectedLevelId = level.id;
    });
    const body = document.createElement("div");
    body.className = "level-option__body";
    const thumb = document.createElement("div");
    thumb.className = "level-option__thumb";
    thumb.append(createMapOverviewElement(level.document));
    const content = document.createElement("div");
    content.className = "level-option__content";
    const nameEl = document.createElement("span");
    nameEl.className = "level-option__name";
    nameEl.textContent = level.name;
    const diffEl = document.createElement("span");
    diffEl.className = "level-option__meta";
    diffEl.textContent = level.document.difficulty;
    const waveCount = level.document.waves.length;
    const wavesEl = document.createElement("p");
    wavesEl.className = "level-option__waves";
    wavesEl.textContent =
      waveCount === 1 ? "1 wave" : `${waveCount} waves`;
    content.append(nameEl, diffEl, wavesEl);
    const blurb = level.document.description;
    if (blurb) {
      const descEl = document.createElement("p");
      descEl.className = "level-option__desc";
      descEl.textContent = blurb;
      content.append(descEl);
    }
    body.append(thumb, content);
    label.append(input, body);
    levelSelectHost.append(label);
  }
}

renderLevelSelect();

syncSkipLinkTarget();

const playtestDocument = takePlaytestDocument();

function buildMissionEndNav(): MissionEndNavigation {
  const doc = activeMissionDoc;
  if (!doc) {
    return {
      retry: () => {},
      nextMap: () => {},
      menu: () => showMainMenu(),
      hasNextMap: false,
    };
  }
  const idx = LEVELS.findIndex((level) => level.id === doc.id);
  const hasNext = idx >= 0 && idx < LEVELS.length - 1;
  return {
    retry: () => {
      if (!gameMount || !activeMissionDoc) return;
      app?.dispose();
      app = new GameApp(
        activeMissionDoc,
        gameMount,
        buildMissionEndNav(),
      );
      app.start();
    },
    nextMap: () => {
      if (!gameMount || idx < 0) return;
      const next = LEVELS[idx + 1];
      if (!next) return;
      startMission(next.document);
    },
    menu: () => showMainMenu(),
    hasNextMap: hasNext,
  };
}

function showMainMenu(): void {
  if (app) {
    app.dispose();
    app = null;
  }
  activeMissionDoc = null;
  document.getElementById("overlay")?.classList.remove("visible");
  document.getElementById("overlayActions")?.setAttribute("hidden", "");
  gameScreen?.removeAttribute("data-active-map");
  gameScreen?.setAttribute("hidden", "");
  mainMenu?.classList.add("visible");
  btnPlay?.removeAttribute("disabled");
  syncSkipLinkTarget();
  btnPlay?.focus();
}

function hideQuitDialog(): void {
  quitDialog?.classList.remove("visible");
}

function showQuitDialog(): void {
  quitDialog?.classList.add("visible");
  quitConfirmNo?.focus();
}

function startMission(doc: MapDocument): void {
  if (!gameMount) return;
  activeMissionDoc = doc;
  selectedLevelId = doc.id;
  btnPlay?.setAttribute("disabled", "");
  mainMenu?.classList.remove("visible");
  gameScreen?.removeAttribute("hidden");
  gameScreen?.setAttribute("data-active-map", doc.id);
  syncSkipLinkTarget();
  app?.dispose();
  app = new GameApp(doc, gameMount, buildMissionEndNav());
  app.start();
  btnPlay?.removeAttribute("disabled");
}

function startGame(): void {
  startMission(getSelectedDocument());
}

btnPlay?.addEventListener("click", () => {
  startGame();
});

btnMainMenu?.addEventListener("click", () => {
  showQuitDialog();
});

quitConfirmNo?.addEventListener("click", () => {
  hideQuitDialog();
  btnMainMenu?.focus();
});

quitConfirmYes?.addEventListener("click", () => {
  hideQuitDialog();
  showMainMenu();
});

window.addEventListener(
  "keydown",
  (ev: KeyboardEvent) => {
    if (ev.key !== "Escape") return;
    if (!quitDialog?.classList.contains("visible")) return;
    ev.preventDefault();
    ev.stopPropagation();
    hideQuitDialog();
    btnMainMenu?.focus();
  },
  true,
);

if (playtestDocument && gameMount) {
  mainMenu?.classList.remove("visible");
  gameScreen?.removeAttribute("hidden");
  gameScreen?.setAttribute("data-active-map", playtestDocument.id);
  syncSkipLinkTarget();
  activeMissionDoc = playtestDocument;
  app = new GameApp(playtestDocument, gameMount, buildMissionEndNav());
  app.start();
}
