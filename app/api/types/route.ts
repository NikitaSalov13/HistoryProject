import { NextResponse } from "next/server";

import { getTypes } from "@/lib/place-utils";

export async function GET() {
  return NextResponse.json({
    data: getTypes()
  });
}
