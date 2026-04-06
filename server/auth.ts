import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "a2a-global-jwt-secret-2026-prod";
const JWT_EXPIRY = "730d";
const COOKIE_NAME = "a2a_session";

export interface AuthPayload {
  userId: number;
  email: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

// Set session cookie on response
export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: false, // needs to be readable by JS for SPA navigation
    secure: true,
    sameSite: "none", // needed for cross-origin iframe
    maxAge: 730 * 24 * 60 * 60 * 1000, // 24 months
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

// Middleware: reads token from cookie OR Authorization header
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token: string | null = null;

  // Try cookie first
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  // Fall back to Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required. Please sign in." });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }

  (req as any).userId = payload.userId;
  (req as any).userEmail = payload.email;
  next();
}
