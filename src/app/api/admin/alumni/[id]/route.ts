import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { parseAlumni } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin edit of a student's response. The new values overwrite the old ones (no history is kept);
// the student's signature is never changed. PDFs are built on demand, so the next download shows the edit.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseAlumni(body, { requireSignature: false });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { signature: _keep, ...fields } = parsed.rec;

  const { data, error } = await getSupabase()
    .from("alumni_feedback")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Another response already uses this registration number." },
        { status: 409 },
      );
    }
    console.error("Update failed", error);
    return NextResponse.json({ error: "Could not save the changes. Please try again." }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "This response no longer exists." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
