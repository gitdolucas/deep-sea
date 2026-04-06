import { createRoot } from "react-dom/client";
import { CannonDnaHelixLevaRoot } from "./CannonDnaHelixLeva.js";

export function mountCannonDnaHelixLeva(): void {
  const el = document.createElement("div");
  el.id = "cannon-dna-helix-leva";
  document.body.append(el);
  const root = createRoot(el);
  root.render(<CannonDnaHelixLevaRoot />);
}
