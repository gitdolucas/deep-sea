import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BubbleAttackFxLevaRoot } from "./BubbleAttackFxLeva.js";

export function mountBubbleAttackFxLeva(): void {
  const el = document.createElement("div");
  el.id = "bubble-attack-fx-leva";
  document.body.append(el);
  createRoot(el).render(
    <StrictMode>
      <BubbleAttackFxLevaRoot />
    </StrictMode>,
  );
}
