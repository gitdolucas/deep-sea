import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InkVeilLevaRoot } from "./InkVeilLeva.js";

export function mountInkVeilLeva(): void {
  const el = document.createElement("div");
  el.id = "ink-veil-leva";
  document.body.append(el);
  createRoot(el).render(
    <StrictMode>
      <InkVeilLevaRoot />
    </StrictMode>,
  );
}
