export const PLACE_TYPES = [
  "Памятники",
  "Здания",
  "Улицы",
  "Мосты",
  "Мемориалы"
] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];
export type VerificationStatus = "verified" | "needs_review";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PlaceSource {
  title: string;
  author: string;
  url: string;
  license: string;
}

export interface PlaceImages {
  then: string;
  now: string;
  then_alt: string;
  now_alt: string;
}

export interface Place {
  id: string;
  title: string;
  type: PlaceType;
  address: string;
  coordinates: Coordinates;
  period_then: string;
  year_then: number;
  year_now: number;
  description: string;
  images: PlaceImages;
  sources: PlaceSource[];
  verification_status: VerificationStatus;
}
