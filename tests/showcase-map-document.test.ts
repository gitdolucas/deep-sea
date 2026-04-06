import { describe, expect, it } from "vitest";
import { validateMapDocument } from "../src/game/map-validation.js";
import { SHOWCASE_MAP_DOCUMENT } from "../src/render/showcase-map-document.js";

describe("SHOWCASE_MAP_DOCUMENT", () => {
  it("passes map validation", () => {
    const issues = validateMapDocument(SHOWCASE_MAP_DOCUMENT);
    expect(issues, JSON.stringify(issues)).toEqual([]);
  });
});
