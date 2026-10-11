import { isDepartment, isEmploymentStatus } from "./questions";

export type FormKind = "alumni" | "employer";

export const TABLES: Record<FormKind, string> = {
  alumni: "alumni_feedback",
  employer: "employer_feedback",
};

/** Admin list filters. The same filters drive the table, the CSV export and "download next". */
export interface Filters {
  form: FormKind;
  q: string;
  department: string; // a Department key, "none" (alumni without one), or "" for all
  status: string; // alumni only: an EmploymentStatus key or ""
  dl: "" | "new" | "done";
}

const SEARCH_COLUMNS: Record<FormKind, string[]> = {
  alumni: ["name", "reg_no", "grad_year", "email"],
  employer: ["employee_name", "employer_name", "organization_name", "email"],
};

type Source = { get(name: string): unknown };

export function readFilters(src: Source | Record<string, string | undefined>): Filters {
  const get = (k: string) => {
    const v = typeof (src as Source).get === "function" ? (src as Source).get(k) : (src as Record<string, unknown>)[k];
    return typeof v === "string" ? v : "";
  };
  const form: FormKind = get("form") === "employer" ? "employer" : "alumni";
  const department = get("department");
  const status = get("status");
  const dl = get("dl");
  return {
    form,
    // Characters that would break the PostgREST "or" filter syntax
    q: get("q").trim().replace(/[%,()*\\]/g, " ").slice(0, 100),
    department: isDepartment(department) || (department === "none" && form === "alumni") ? department : "",
    status: form === "alumni" && isEmploymentStatus(status) ? status : "",
    dl: dl === "new" || dl === "done" ? dl : "",
  };
}

/** Query string for links that keep the current filters, e.g. the CSV export. */
export function filterQuery(f: Filters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return p.toString();
}

// The Supabase filter builder's generic types are very deep; this helper only chains filters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters<Q extends Record<string, any>>(query: Q, f: Filters): Q {
  let q: Q = query;
  if (f.q) q = q.or(SEARCH_COLUMNS[f.form].map((c) => `${c}.ilike.%${f.q}%`).join(","));
  if (f.department === "none") q = q.is("department", null);
  else if (f.department) q = q.eq("department", f.department);
  if (f.status) q = q.eq("employment_status", f.status);
  if (f.dl === "new") q = q.is("downloaded_at", null);
  if (f.dl === "done") q = q.not("downloaded_at", "is", null);
  return q;
}
