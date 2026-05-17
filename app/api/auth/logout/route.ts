import { NextRequest, NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, shouldUseSecureCookie } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
