import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { parseEmployer } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields. Pretend success so they go away.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const parsed = parseEmployer(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { error } = await getSupabase().from("employer_feedback").insert(parsed.rec);
  if (error) {
    console.error("Employer insert failed", error);
    return NextResponse.json({ error: "Could not save your response. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
