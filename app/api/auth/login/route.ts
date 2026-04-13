import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminPassword,
  getAdminUsername
} from "@/lib/server/admin-auth";

export const runtime = "nodejs";

const safeCompare = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { username?: string; password?: string };

  const username = payload.username?.trim() ?? "";
  const password = payload.password?.trim() ?? "";

  const expectedUsername = getAdminUsername();
  const expectedPassword = getAdminPassword();

  if (!safeCompare(username, expectedUsername) || !safeCompare(password, expectedPassword)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createAdminSessionToken(username);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  return response;
}
