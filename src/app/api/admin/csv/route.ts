import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { EMPLOYMENT_STATUSES, FeedbackRecord, QUESTIONS, departmentLabel } from "@/lib/questions";
import { EMPLOYER_QUESTIONS, EmployerRecord } from "@/lib/employer";
import { TABLES, applyFilters, readFilters } from "@/lib/filters";
import { downloadHeaders } from "@/lib/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(v: unknown): string {
  let s = String(v ?? "");
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const avg = (ratings: number[]) => (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);

// Exports the responses that match the admin page's current filters.
export async function GET(req: Request) {
  if (!isAdmin()) return new NextResponse("Unauthorized", { status: 401 });
  const filters = readFilters(new URL(req.url).searchParams);
  const employer = filters.form === "employer";
  const questions = employer ? EMPLOYER_QUESTIONS : QUESTIONS;

  const columns: string = employer
    ? "created_at,employee_name,employee_designation,department,employer_name,employer_designation,org_mode,organization_name,address,email,ratings"
    : "created_at,updated_at,name,reg_no,grad_year,department,email,cell_no,employment_status,ratings,comments";
  const { data, error } = await applyFilters(
    getSupabase().from(TABLES[filters.form]).select(columns).order("created_at", { ascending: true }),
    filters,
  );
  if (error) return new NextResponse("Database error", { status: 500 });

  const header = employer
    ? ["Submitted at", "Employee Name", "Employee Designation", "Department", "Employer Name", "Employer Designation",
       "Organization Name", "Address", "Email", ...questions.map((_, i) => `Q${i + 1}`), "Average"]
    : ["Submitted at", "Edited at", "Name", "Registration No", "Year of Graduation", "Department", "Email", "Cell No",
       "Status", ...questions.map((_, i) => `Q${i + 1}`), "Average", "Comments"];

  const list = (data || []) as unknown as (FeedbackRecord & EmployerRecord)[];
  const rows = list.map((r) =>
    (employer
      ? [r.created_at, r.employee_name, r.employee_designation, departmentLabel(r.department), r.employer_name,
         r.employer_designation, r.org_mode === "stamp" ? "(company stamp)" : r.organization_name, r.address, r.email,
         ...r.ratings, avg(r.ratings)]
      : [r.created_at, r.updated_at || "", r.name, r.reg_no, r.grad_year, departmentLabel(r.department), r.email, r.cell_no,
         EMPLOYMENT_STATUSES[r.employment_status] ?? r.employment_status, ...r.ratings, avg(r.ratings), r.comments]
    ).map(cell).join(","),
  );

  // Average per question as a last row
  const n = list.length || 1;
  const lead = 9; // both layouts have 9 columns before Q1
  const avgRow = [
    ...Array(lead).fill(""),
    ...questions.map((_, i) => (list.reduce((a, r) => a + r.ratings[i], 0) / n).toFixed(2)),
  ];
  avgRow[0] = "AVERAGE";

  const csv = "﻿" + [header.map(cell).join(","), ...rows, avgRow.map(cell).join(",")].join("\r\n");
  const name = `${filters.form}_feedback_${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, { headers: downloadHeaders("text/csv; charset=utf-8", name) });
}
