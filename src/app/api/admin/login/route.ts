import { NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_MAX_AGE, checkPassword, createSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") || "");
  const url = new URL(req.url);

  if (!checkPassword(password)) {
    return NextResponse.redirect(new URL("/login?error=1", url.origin), 303);
  }

  const res = NextResponse.redirect(new URL("/", url.origin), 303);
  res.cookies.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
