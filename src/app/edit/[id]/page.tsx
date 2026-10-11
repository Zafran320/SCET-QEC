import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { FeedbackRecord } from "@/lib/questions";
import AlumniForm from "@/components/AlumniForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit response - SCET Feedback" };

// Admin only: edit a student's alumni feedback response
export default async function EditAlumniPage({ params }: { params: { id: string } }) {
  if (!isAdmin()) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();

  const { data, error } = await getSupabase().from("alumni_feedback").select("*").eq("id", params.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();

  return <AlumniForm initial={data as FeedbackRecord & { id: string }} />;
}
