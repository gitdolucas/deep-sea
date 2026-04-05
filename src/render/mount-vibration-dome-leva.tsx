import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { VibrationDomeLevaRoot } from "./VibrationDomeLeva.js";

export function mountVibrationDomeLeva(): void {
  const el = document.createElement("div");
  el.id = "vibration-dome-leva";
  document.body.append(el);
  createRoot(el).render(
    <StrictMode>
      <VibrationDomeLevaRoot />
    </StrictMode>,
  );
}
