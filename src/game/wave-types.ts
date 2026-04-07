export type WavePhase = "prep" | "active" | "completed";

/** HUD wave strip + release bar (`GameSession.getWaveFeedbackState`). */
export type WaveFeedbackUiState =
  | "all_complete"
  | "not_started"
  | "preparation"
  | "started"
  | "passed";
