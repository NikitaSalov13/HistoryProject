import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "ts_admin_session";

interface SessionPayload {
  username: string;
  exp: number;
}

const sessionTtlSeconds = 60 * 60 * 12;

const getSessionSecret = (): string =>
  process.env.ADMIN_SESSION_SECRET ??
  process.env.SESSION_SECRET ??
  "change-me-in-production-session-secret";

const base64UrlEncode = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8");

const sign = (value: string): string =>
  createHmac("sha256", getSessionSecret()).update(value).digest("base64url");

const safeCompare = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const getAdminUsername = (): string =>
  process.env.ADMIN_USERNAME?.trim() || "admin";

export const getAdminPassword = (): string =>
  process.env.ADMIN_PASSWORD?.trim() || "admin12345";

export const createAdminSessionToken = (username: string): string => {
  const payload: SessionPayload = {
    username,
    exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const parseAdminSessionToken = (token: string | undefined): SessionPayload | null => {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (!safeCompare(expectedSignature, providedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (
      typeof payload.username !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const isAdminRequest = (request: NextRequest): boolean => {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return !!parseAdminSessionToken(token);
};
