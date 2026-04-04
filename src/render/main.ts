import firstTrench from "../../data/maps/first_trench.json";
import type { MapDocument } from "../game/map-types.js";
import { GameApp } from "./GameApp.js";

const doc = firstTrench as MapDocument;

const mainMenu = document.getElementById("mainMenu");
const gameScreen = document.getElementById("gameScreen");
const gameMount = document.getElementById("gameMount");
const btnPlay = document.getElementById("btnPlay") as HTMLButtonElement | null;
const btnMainMenu = document.getElementById("btnMainMenu");
const quitDialog = document.getElementById("quitDialog");
const quitConfirmYes = document.getElementById("quitConfirmYes");
const quitConfirmNo = document.getElementById("quitConfirmNo");

let app: GameApp | null = null;

function showMainMenu(): void {
  if (app) {
    app.dispose();
    app = null;
  }
  document.getElementById("overlay")?.classList.remove("visible");
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
  btnPlay?.setAttribute("disabled", "");
  mainMenu?.classList.remove("visible");
  gameScreen?.removeAttribute("hidden");
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
