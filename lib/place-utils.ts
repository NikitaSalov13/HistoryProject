import { filterPlaces, type PlacesQuery } from "@/lib/place-query";
import { readPlaces } from "@/lib/server/places-repository";
import { PLACE_TYPES, type Place } from "@/lib/types";

export { parseBbox, parseBboxFromEdges } from "@/lib/place-query";
export type { PlacesQuery } from "@/lib/place-query";

export const getTypes = (): string[] => [...PLACE_TYPES];

export const getPlaceById = async (id: string): Promise<Place | null> => {
  const places = await readPlaces();
  return places.find((place) => place.id === id) ?? null;
};

export const getPlaces = async (query: PlacesQuery = {}): Promise<Place[]> => {
  const places = await readPlaces();
  return filterPlaces(places, query);
};
