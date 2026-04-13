import { PLACE_TYPES, type Place } from "@/lib/types";

export interface PlacesQuery {
  type?: string | null;
  q?: string | null;
  bbox?: [number, number, number, number] | null;
}

const normalize = (value: string): string => value.trim().toLocaleLowerCase("ru-RU");

const isInsideBbox = (
  place: Place,
  bbox: [number, number, number, number] | null | undefined
): boolean => {
  if (!bbox) {
    return true;
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;
  const { lat, lng } = place.coordinates;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
};

export const parseBbox = (
  rawBbox: string | null
): [number, number, number, number] | null => {
  if (!rawBbox) {
    return null;
  }

  const items = rawBbox.split(",").map(Number);
  if (items.length !== 4 || items.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [left, bottom, right, top] = items;
  const minLng = Math.min(left, right);
  const maxLng = Math.max(left, right);
  const minLat = Math.min(bottom, top);
  const maxLat = Math.max(bottom, top);

  return [minLng, minLat, maxLng, maxLat];
};

export const parseBboxFromEdges = (
  north: string | null,
  south: string | null,
  east: string | null,
  west: string | null
): [number, number, number, number] | null => {
  if (!north || !south || !east || !west) {
    return null;
  }

  const parsedNorth = Number(north);
  const parsedSouth = Number(south);
  const parsedEast = Number(east);
  const parsedWest = Number(west);

  if (
    Number.isNaN(parsedNorth) ||
    Number.isNaN(parsedSouth) ||
    Number.isNaN(parsedEast) ||
    Number.isNaN(parsedWest)
  ) {
    return null;
  }

  return [
    Math.min(parsedWest, parsedEast),
    Math.min(parsedSouth, parsedNorth),
    Math.max(parsedWest, parsedEast),
    Math.max(parsedSouth, parsedNorth)
  ];
};

export const filterPlaces = (places: Place[], query: PlacesQuery = {}): Place[] => {
  const typeFilter = query.type?.trim();
  const searchFilter = query.q?.trim();
  const normalizedSearch = searchFilter ? normalize(searchFilter) : null;
  const hasKnownTypeFilter =
    !!typeFilter &&
    PLACE_TYPES.some((availableType) => normalize(availableType) === normalize(typeFilter));

  return places.filter((place) => {
    const typeMatches = !hasKnownTypeFilter || normalize(place.type) === normalize(typeFilter ?? "");
    const searchMatches =
      !normalizedSearch ||
      normalize(place.title).includes(normalizedSearch) ||
      normalize(place.address).includes(normalizedSearch);
    const bboxMatches = isInsideBbox(place, query.bbox);

    return typeMatches && searchMatches && bboxMatches;
  });
};
