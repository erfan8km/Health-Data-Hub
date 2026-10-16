import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const ADMIN_SESSION_COOKIE = "iedr_admin_session";
const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

type AdminSessionPayload = {
  issuedAt: number;
  expiresAt: number;
};

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken(now = Date.now()): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const payload: AdminSessionPayload = {
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_MAX_AGE_MS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

function parseSessionToken(token: string | undefined): AdminSessionPayload | null {
  const secret = getSessionSecret();
  if (!secret || !token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const encodedPayload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!safeEqual(sign(encodedPayload, secret), signature)) return null;

  const decodedPayload = decode(encodedPayload);
  if (!decodedPayload) return null;

  try {
    const payload = JSON.parse(decodedPayload) as AdminSessionPayload;
    if (
      !Number.isFinite(payload.issuedAt) ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now() ||
      payload.issuedAt > Date.now() + 60_000
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return valueParts.join("=");
  }
  return undefined;
}

export function setAdminSession(response: Response): number {
  const token = createSessionToken();
  if (!token) {
    throw new Error("SESSION_SECRET must be set to create an admin session.");
  }

  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_MS;
  response.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_MAX_AGE_MS,
    path: "/",
  });
  return expiresAt;
}

export function clearAdminSession(response: Response): void {
  response.clearCookie(ADMIN_SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!getSessionSecret()) {
    res.status(503).json({ error: "Admin authentication is not configured." });
    return;
  }

  const session = parseSessionToken(getCookie(req, ADMIN_SESSION_COOKIE));
  if (!session) {
    res.status(401).json({ error: "Admin authentication required." });
    return;
  }

  res.locals.adminSession = session;
  next();
}

export function hasValidAdminSession(request: Request): boolean {
  return Boolean(parseSessionToken(getCookie(request, ADMIN_SESSION_COOKIE)));
}

export function compareAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(password, expected);
}
