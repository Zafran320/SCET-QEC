import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string, expected = process.env.ADMIN_PASSWORD): boolean {
  if (!expected) return false;
  // Hash both so lengths always match for the constant-time compare
  const h = (v: string) => createHmac("sha256", "pw").update(v).digest("hex");
  return safeEqual(h(input), h(expected));
}

export function createSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  return `${exp}.${sign(String(exp))}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Math.floor(Date.now() / 1000);
}

export function isAdmin(): boolean {
  return verifySessionToken(cookies().get(COOKIE_NAME)?.value);
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
