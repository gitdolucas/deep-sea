import { validateMapDocument } from "../game/map-validation.js";
import { SHOWCASE_MAP_DOCUMENT } from "./showcase-map-document.js";
import { VisualShowcaseApp } from "./visual-showcase-app.js";

const issues = validateMapDocument(SHOWCASE_MAP_DOCUMENT);
if (issues.length > 0) {
  console.error("Showcase map invalid:", issues);
}

const mount = document.getElementById("showcaseMount");
if (!mount) {
  throw new Error("Missing #showcaseMount");
}

void new VisualShowcaseApp(SHOWCASE_MAP_DOCUMENT, mount);
