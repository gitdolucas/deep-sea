import map00SandboxAll from "../../data/maps/map-00-sandbox-all.json" with {
  type: "json",
};
import map01Tutorial from "../../data/maps/map-01-tutorial.json" with {
  type: "json",
};
import map02ReefRun from "../../data/maps/map-02-reef-run.json" with {
  type: "json",
};
import map03TwinReef from "../../data/maps/map-03-twin-reef.json" with {
  type: "json",
};
import map04SiegeMeridian from "../../data/maps/map-04-siege-meridian.json" with {
  type: "json",
};
import map05NullDepths from "../../data/maps/map-05-null-depths.json" with {
  type: "json",
};
import map06RadialHub from "../../data/maps/map-06-radial-hub.json" with {
  type: "json",
};
import type { MapDocument } from "../game/map-types.js";

export type LevelEntry = {
  id: string;
  name: string;
  document: MapDocument;
};

/** Playable maps, order = main menu order */
export const LEVELS: readonly LevelEntry[] = [
  {
    id: map00SandboxAll.id,
    name: map00SandboxAll.name,
    document: map00SandboxAll as unknown as MapDocument,
  },
  {
    id: map01Tutorial.id,
    name: map01Tutorial.name,
    document: map01Tutorial as unknown as MapDocument,
  },
  {
    id: map02ReefRun.id,
    name: map02ReefRun.name,
    document: map02ReefRun as unknown as MapDocument,
  },
  {
    id: map03TwinReef.id,
    name: map03TwinReef.name,
    document: map03TwinReef as unknown as MapDocument,
  },
  {
    id: map04SiegeMeridian.id,
    name: map04SiegeMeridian.name,
    document: map04SiegeMeridian as unknown as MapDocument,
  },
  {
    id: map05NullDepths.id,
    name: map05NullDepths.name,
    document: map05NullDepths as unknown as MapDocument,
  },
  {
    id: map06RadialHub.id,
    name: map06RadialHub.name,
    document: map06RadialHub as unknown as MapDocument,
  },
];
