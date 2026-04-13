import { NextRequest, NextResponse } from "next/server";

import { getPlaces, parseBbox, parseBboxFromEdges } from "@/lib/place-utils";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { parsePlacePayload, PlaceValidationError } from "@/lib/server/place-validation";
import { readPlaces, writePlaces } from "@/lib/server/places-repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type");
  const q = searchParams.get("q");
  const bbox =
    parseBbox(searchParams.get("bbox")) ??
    parseBboxFromEdges(
      searchParams.get("north"),
      searchParams.get("south"),
      searchParams.get("east"),
      searchParams.get("west")
    );

  const data = await getPlaces({
    type,
    q,
    bbox
  });

  return NextResponse.json({
    count: data.length,
    data
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const place = parsePlacePayload(payload, { requireId: true });

    const places = await readPlaces();
    if (places.some((item) => item.id === place.id)) {
      return NextResponse.json(
        { error: `Place with id "${place.id}" already exists` },
        { status: 409 }
      );
    }

    places.push(place);
    await writePlaces(places);

    return NextResponse.json({ data: place }, { status: 201 });
  } catch (error) {
    if (error instanceof PlaceValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create place" }, { status: 500 });
  }
}
