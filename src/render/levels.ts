import firstTrench from "../../data/maps/first_trench.json";
import trenchGate from "../../data/maps/trench_gate.json";
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
];
