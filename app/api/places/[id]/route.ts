import { NextRequest, NextResponse } from "next/server";

import { getPlaceById } from "@/lib/place-utils";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { parsePlacePayload, PlaceValidationError } from "@/lib/server/place-validation";
import { readPlaces, writePlaces } from "@/lib/server/places-repository";

interface RouteContext {
  params: {
    id: string;
  };
}

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const place = await getPlaceById(params.id);

  if (!place) {
    return NextResponse.json(
      {
        error: "Place not found"
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: place
  });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const updatedPlace = parsePlacePayload(payload, { expectedId: params.id });

    const places = await readPlaces();
    const index = places.findIndex((place) => place.id === params.id);
    if (index === -1) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    places[index] = updatedPlace;
    await writePlaces(places);

    return NextResponse.json({ data: updatedPlace });
  } catch (error) {
    if (error instanceof PlaceValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to update place" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const places = await readPlaces();
  const nextPlaces = places.filter((place) => place.id !== params.id);

  if (nextPlaces.length === places.length) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  await writePlaces(nextPlaces);
  return NextResponse.json({ ok: true });
}
