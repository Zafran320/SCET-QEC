import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { buildFeedbackZip, downloadHeaders } from "@/lib/zip";
import { BATCH_SIZE } from "@/lib/questions";
import { TABLES, applyFilters, readFilters } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST only, because it marks responses as downloaded. Downloads can be repeated any number of times.
//   mode=next      -> the oldest 10 not-yet-downloaded responses matching the current filters
//   mode=selected  -> the ticked responses (max 10), downloaded or not
export async function POST(req: Request) {
  if (!isAdmin()) return new NextResponse("Unauthorized", { status: 401 });

  const form = await req.formData();
  const filters = readFilters(form);
  const table = TABLES[filters.form];
  const supabase = getSupabase();

  let query = supabase.from(table).select("*").order("created_at", { ascending: true }).limit(BATCH_SIZE);
  if (form.get("mode") === "selected") {
    const ids = form.getAll("ids").map(String).filter((s) => /^[0-9a-f-]{36}$/i.test(s));
    if (ids.length === 0) return new NextResponse("No responses selected.", { status: 400 });
    if (ids.length > BATCH_SIZE) {
      return new NextResponse(`Select at most ${BATCH_SIZE} responses per download.`, { status: 400 });
    }
    query = query.in("id", ids);
  } else {
    query = applyFilters(query, { ...filters, dl: "new" });
  }

  const { data, error } = await query;
  if (error) {
    console.error("ZIP query failed", error);
    return new NextResponse("Database error", { status: 500 });
  }
  if (!data?.length) return new NextResponse("Nothing new to download for the current filters.", { status: 404 });

  let buf: Uint8Array;
  try {
    buf = await buildFeedbackZip(filters.form, data);
  } catch (e) {
    console.error("ZIP build failed", e);
    return new NextResponse("Could not build the ZIP. Please try again.", { status: 500 });
  }

  // Only a marker for the admin list ("New" vs "Downloaded"); it never blocks another download
  await supabase.from(table).update({ downloaded_at: new Date().toISOString() }).in("id", data.map((r) => r.id));

  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "_");
  return new NextResponse(buf as unknown as BodyInit, {
    headers: downloadHeaders("application/zip", `${filters.form}_feedback_${stamp}.zip`),
  });
}
