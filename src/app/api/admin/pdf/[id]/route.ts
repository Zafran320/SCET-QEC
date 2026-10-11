import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { buildPdf, downloadHeaders } from "@/lib/zip";
import { TABLES } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Single PDF download (alumni by default, ?form=employer for employer responses). Repeatable.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return new NextResponse("Unauthorized", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse("Not found", { status: 404 });
  const form = new URL(req.url).searchParams.get("form") === "employer" ? "employer" : "alumni";

  const supabase = getSupabase();
  const { data: row, error } = await supabase.from(TABLES[form]).select("*").eq("id", params.id).maybeSingle();
  if (error) return new NextResponse("Database error", { status: 500 });
  if (!row) return new NextResponse("This response no longer exists.", { status: 404 });

  try {
    const { base, pdf } = await buildPdf(form, row);
    await supabase.from(TABLES[form]).update({ downloaded_at: new Date().toISOString() }).eq("id", params.id);
    const prefix = form === "alumni" ? "Alumni_Feedback_" : "";
    return new NextResponse(Buffer.from(pdf), { headers: downloadHeaders("application/pdf", `${prefix}${base}.pdf`) });
  } catch (e) {
    console.error("PDF build failed", e);
    return new NextResponse("Could not build the PDF. Please try again.", { status: 500 });
  }
}
