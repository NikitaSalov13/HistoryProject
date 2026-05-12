import { PLACE_TYPES, type PlaceType } from "@/lib/types";

const PLACE_TYPE_COLOR_PALETTE = ["#b45309", "#1d4ed8", "#0f766e", "#8b3e2f", "#6d28d9"] as const;

const PLACE_TYPE_COLORS = Object.fromEntries(
  PLACE_TYPES.map((type, index) => [type, PLACE_TYPE_COLOR_PALETTE[index % PLACE_TYPE_COLOR_PALETTE.length]])
) as Record<PlaceType, string>;

const hashString = (value: string): number =>
  Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);

export const getPlaceTypeColor = (type: string): string => {
  const knownColor = (PLACE_TYPE_COLORS as Record<string, string>)[type];
  if (knownColor) {
    return knownColor;
  }

  return PLACE_TYPE_COLOR_PALETTE[Math.abs(hashString(type)) % PLACE_TYPE_COLOR_PALETTE.length];
};

export { PLACE_TYPE_COLORS, PLACE_TYPE_COLOR_PALETTE };
