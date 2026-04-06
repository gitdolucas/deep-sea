const DEFAULT_SHOWCASE_FX_LOOP_SEC = 8;

let showcaseFxLoopSeconds = DEFAULT_SHOWCASE_FX_LOOP_SEC;

export function getShowcaseFxLoopSeconds(): number {
  return showcaseFxLoopSeconds;
}

export function setShowcaseFxLoopSeconds(v: number): void {
  showcaseFxLoopSeconds = Math.max(0.25, Math.min(120, v));
}

export function resetShowcaseFxLoopSeconds(): void {
  showcaseFxLoopSeconds = DEFAULT_SHOWCASE_FX_LOOP_SEC;
}
