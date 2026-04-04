import firstTrench from "../../data/maps/first_trench.json";
import trenchGate from "../../data/maps/trench_gate.json";
import hydraConvergence from "../../data/maps/hydra_convergence.json";
import tripleConvergenceTest from "../../data/maps/triple_convergence_test.json";
import sixTowerGauntlet from "../../data/maps/six_tower_gauntlet.json";
import type { MapDocument } from "../game/map-types.js";

export type LevelEntry = {
  id: string;
  name: string;
  document: MapDocument;
};

function entryFromJson(raw: unknown): LevelEntry {
  const doc = raw as MapDocument;
  return { id: doc.id, name: doc.name, document: doc };
}

/** Playable maps, order = main menu order */
export const LEVELS: readonly LevelEntry[] = [
  entryFromJson(firstTrench),
  entryFromJson(trenchGate),
  entryFromJson(hydraConvergence),
  entryFromJson(tripleConvergenceTest),
  entryFromJson(sixTowerGauntlet),
];
