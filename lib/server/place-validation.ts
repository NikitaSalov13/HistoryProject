import { PLACE_TYPES, type Place, type PlaceSource, type VerificationStatus } from "@/lib/types";

const verificationStatuses: VerificationStatus[] = ["verified", "needs_review"];

export class PlaceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaceValidationError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readText = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new PlaceValidationError(`Field "${key}" is required`);
  }

  return value.trim();
};

const readNumber = (record: Record<string, unknown>, key: string): number => {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new PlaceValidationError(`Field "${key}" must be a number`);
};

const readType = (value: string): Place["type"] => {
  if (!PLACE_TYPES.includes(value as Place["type"])) {
    throw new PlaceValidationError("Invalid place type");
  }

  return value as Place["type"];
};

const readVerificationStatus = (value: unknown): VerificationStatus => {
  if (typeof value !== "string" || !verificationStatuses.includes(value as VerificationStatus)) {
    throw new PlaceValidationError("Invalid verification status");
  }

  return value as VerificationStatus;
};

const readSources = (record: Record<string, unknown>): PlaceSource[] => {
  const value = record.sources;
  if (!Array.isArray(value) || value.length === 0) {
    throw new PlaceValidationError('Field "sources" must contain at least one source');
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new PlaceValidationError(`Source ${index + 1} is invalid`);
    }

    return {
      title: readText(item, "title"),
      author: readText(item, "author"),
      url: readText(item, "url"),
      license: readText(item, "license")
    };
  });
};

export const parsePlacePayload = (
  payload: unknown,
  options: { expectedId?: string; requireId?: boolean } = {}
): Place => {
  if (!isRecord(payload)) {
    throw new PlaceValidationError("Payload must be an object");
  }

  const idFromBody =
    typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : undefined;

  const id = options.expectedId ?? idFromBody;
  if (options.requireId && !id) {
    throw new PlaceValidationError('Field "id" is required');
  }

  if (options.expectedId && idFromBody && idFromBody !== options.expectedId) {
    throw new PlaceValidationError("Place id in body does not match URL parameter");
  }

  if (!id) {
    throw new PlaceValidationError('Field "id" is required');
  }

  const coordinates = payload.coordinates;
  if (!isRecord(coordinates)) {
    throw new PlaceValidationError('Field "coordinates" is required');
  }

  const images = payload.images;
  if (!isRecord(images)) {
    throw new PlaceValidationError('Field "images" is required');
  }

  return {
    id,
    title: readText(payload, "title"),
    type: readType(readText(payload, "type")),
    address: readText(payload, "address"),
    coordinates: {
      lat: readNumber(coordinates, "lat"),
      lng: readNumber(coordinates, "lng")
    },
    period_then: readText(payload, "period_then"),
    year_then: Math.round(readNumber(payload, "year_then")),
    year_now: Math.round(readNumber(payload, "year_now")),
    description: readText(payload, "description"),
    images: {
      then: readText(images, "then"),
      now: readText(images, "now"),
      then_alt: readText(images, "then_alt"),
      now_alt: readText(images, "now_alt")
    },
    sources: readSources(payload),
    verification_status: readVerificationStatus(payload.verification_status)
  };
};
