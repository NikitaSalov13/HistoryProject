import { describe, expect, it } from "vitest";

import { filterPlaces, parseBbox, parseBboxFromEdges } from "@/lib/place-query";
import { places } from "@/lib/data/places";

describe("parseBbox", () => {
  it("parses bbox string", () => {
    expect(parseBbox("30.2,59.9,30.4,60.0")).toEqual([30.2, 59.9, 30.4, 60.0]);
  });

  it("returns null for invalid bbox", () => {
    expect(parseBbox("invalid")).toBeNull();
  });
});

describe("parseBboxFromEdges", () => {
  it("parses bbox from map edges", () => {
    expect(parseBboxFromEdges("60.0", "59.9", "30.4", "30.2")).toEqual([
      30.2, 59.9, 30.4, 60.0
    ]);
  });
});

describe("filterPlaces", () => {
  it("filters by type", () => {
    const result = filterPlaces(places, { type: "Мосты" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("spb_002");
  });

  it("filters by search query", () => {
    const result = filterPlaces(places, { q: "гостиного" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("spb_003");
  });

  it("filters by bbox", () => {
    const result = filterPlaces(places, {
      bbox: [30.30, 59.93, 30.34, 59.94]
    });
    const ids = result.map((place) => place.id);
    expect(ids).toEqual(["spb_001", "spb_003"]);
  });
});
