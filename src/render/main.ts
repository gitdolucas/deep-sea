import type { MapDocument } from "../game/map-types.js";
import { GameApp } from "./GameApp.js";
import { LEVELS } from "./levels.js";
import { createMapOverviewElement } from "./map-overview.js";

const mainMenu = document.getElementById("mainMenu");
const gameScreen = document.getElementById("gameScreen");
const gameMount = document.getElementById("gameMount");
const btnPlay = document.getElementById("btnPlay") as HTMLButtonElement | null;
const btnMainMenu = document.getElementById("btnMainMenu");
const quitDialog = document.getElementById("quitDialog");
const quitConfirmYes = document.getElementById("quitConfirmYes");
const quitConfirmNo = document.getElementById("quitConfirmNo");
const levelSelectHost = document.getElementById("levelSelectHost");

let app: GameApp | null = null;
let selectedLevelId = LEVELS[0]!.id;

function getSelectedDocument(): MapDocument {
  return (
    LEVELS.find((l) => l.id === selectedLevelId)?.document ?? LEVELS[0]!.document
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
    body.append(createMapOverviewElement(level.document));
    const textWrap = document.createElement("span");
    textWrap.className = "level-option__text";
    const nameEl = document.createElement("span");
    nameEl.className = "level-option__name";
    nameEl.textContent = level.name;
    const meta = document.createElement("span");
    meta.className = "level-option__meta";
    meta.textContent = `${level.document.difficulty} · ${level.document.gridSize[0]}×${level.document.gridSize[1]}`;
    textWrap.append(nameEl, meta);
    body.append(textWrap);
    label.append(input, body);
    levelSelectHost.append(label);
  }
}

renderLevelSelect();

function showMainMenu(): void {
  if (app) {
    app.dispose();
    app = null;
  }
  document.getElementById("overlay")?.classList.remove("visible");
  gameScreen?.removeAttribute("data-active-map");
  gameScreen?.setAttribute("hidden", "");
  mainMenu?.classList.add("visible");
  btnPlay?.removeAttribute("disabled");
  btnPlay?.focus();
}

function hideQuitDialog(): void {
  quitDialog?.classList.remove("visible");
}

function showQuitDialog(): void {
  quitDialog?.classList.add("visible");
  quitConfirmNo?.focus();
}

function startGame(): void {
  if (!gameMount) return;
  const doc = getSelectedDocument();
  btnPlay?.setAttribute("disabled", "");
  mainMenu?.classList.remove("visible");
  gameScreen?.removeAttribute("hidden");
  gameScreen?.setAttribute("data-active-map", doc.id);
  app = new GameApp(doc, gameMount);
  app.start();
  btnPlay?.removeAttribute("disabled");
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
