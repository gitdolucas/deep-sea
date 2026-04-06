import { createRoot } from "react-dom/client";
import { VisualShowcaseLevaRoot } from "./VisualShowcaseLeva.js";

export function mountVisualShowcaseLeva(): void {
  const el = document.createElement("div");
  el.id = "visual-showcase-leva-host";
  document.body.append(el);
  createRoot(el).render(<VisualShowcaseLevaRoot />);
}
