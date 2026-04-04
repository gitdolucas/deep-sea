import firstTrench from "../../data/maps/first_trench.json";
import type { MapDocument } from "../game/map-types.js";
import { GameApp } from "./GameApp.js";

const doc = firstTrench as MapDocument;
const app = new GameApp(doc);
app.start();
