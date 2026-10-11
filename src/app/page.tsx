import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { BATCH_SIZE, DEPARTMENTS, EMPLOYMENT_STATUSES, EmploymentStatus, QUESTIONS, departmentLabel } from "@/lib/questions";
import { EMPLOYER_QUESTIONS } from "@/lib/employer";
import { Filters, TABLES, applyFilters, filterQuery, readFilters } from "@/lib/filters";
import DownloadForm from "@/components/DownloadForm";
import FilterForm from "@/components/FilterForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin - SCET Feedback" };

interface AlumniRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  name: string;
  reg_no: string;
  grad_year: string;
  department: string | null;
  employment_status: EmploymentStatus;
  ratings: number[];
  downloaded_at: string | null;
}

interface EmployerRow {
  id: string;
  created_at: string;
  employee_name: string;
  employee_designation: string;
  department: string;
  employer_name: string;
  org_mode: string;
  organization_name: string;
  ratings: number[];
  downloaded_at: string | null;
}

const COLUMNS = {
  alumni: "id,created_at,updated_at,name,reg_no,grad_year,department,employment_status,ratings,downloaded_at",
  employer: "id,created_at,employee_name,employee_designation,department,employer_name,org_mode,organization_name,ratings,downloaded_at",
};

const fmt = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");
const avg = (r: number[]) => (r.reduce((a, b) => a + b, 0) / r.length).toFixed(2);
const selectStyle = { padding: 9, borderRadius: 8, border: "1px solid var(--line)", font: "inherit" };

export default async function AdminPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  if (!isAdmin()) redirect("/login");

  const f = readFilters(searchParams);
  const employer = f.form === "employer";
  const supabase = getSupabase();
  const count = (form: Filters["form"]) =>
    supabase.from(TABLES[form]).select("id", { count: "exact", head: true });

  const [{ data, error }, { count: newCount }, { count: alumniTotal }, { count: employerTotal }] = await Promise.all([
    applyFilters(
      supabase.from(TABLES[f.form]).select(COLUMNS[f.form]).order("created_at", { ascending: false }).limit(2000),
      f,
    ),
    applyFilters(count(f.form), { ...f, dl: "new" }),
    count("alumni"),
    count("employer"),
  ]);
  const rows = (data || []) as unknown as (AlumniRow & EmployerRow)[];
  const questions = employer ? EMPLOYER_QUESTIONS : QUESTIONS;
  const avgPerQ = questions.map((_, i) =>
    rows.length ? (rows.reduce((a, r) => a + r.ratings[i], 0) / rows.length).toFixed(2) : "-",
  );
  const filtered = Boolean(f.q || f.department || f.status || f.dl);

  return (
    <div className="wrap" style={{ maxWidth: 1200 }}>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "1.3rem" }}>SCET Feedback &mdash; Admin</h1>
        <form method="POST" action="/api/admin/logout">
          <button type="submit" className="secondary">Log out</button>
        </form>
      </div>

      <p className="muted" style={{ marginTop: 0 }}>
        Public forms: <a href="/alumni-feedback">/alumni-feedback</a> (students) &middot;{" "}
        <a href="/employer">/employer</a> (employers)
      </p>

      <nav className="tabs">
        <a href="/?form=alumni" className={employer ? "" : "active"}>Alumni feedback ({alumniTotal ?? 0})</a>
        <a href="/?form=employer" className={employer ? "active" : ""}>Employer feedback ({employerTotal ?? 0})</a>
      </nav>

      {searchParams.saved && !employer && <p className="notice success">Changes saved.</p>}
      {error && <p className="error">Could not load data: {error.message}</p>}

      <FilterForm>
        <input type="hidden" name="form" value={f.form} />
        <input
          type="text"
          name="q"
          defaultValue={f.q}
          placeholder={employer ? "Search employee, employer, organization, email" : "Search name, reg no, year, email"}
          className="search"
        />
        <select name="department" defaultValue={f.department} style={selectStyle} aria-label="Department">
          <option value="">All departments</option>
          {Object.entries(DEPARTMENTS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
          {!employer && <option value="none">Department not set</option>}
        </select>
        {!employer && (
          <select name="status" defaultValue={f.status} style={selectStyle} aria-label="Employment status">
            <option value="">All statuses</option>
            {Object.entries(EMPLOYMENT_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}
        <select name="dl" defaultValue={f.dl} style={selectStyle} aria-label="Download state">
          <option value="">New and downloaded</option>
          <option value="new">New only</option>
          <option value="done">Downloaded only</option>
        </select>
        <button type="submit" className="secondary">Filter</button>
        <a className="btn secondary" href={`/?form=${f.form}`}>Reset</a>
      </FilterForm>

      <DownloadForm>
        {/* "Download next" uses the same filters as the list */}
        <input type="hidden" name="form" value={f.form} />
        <input type="hidden" name="q" value={f.q} />
        <input type="hidden" name="department" value={f.department} />
        <input type="hidden" name="status" value={f.status} />

        <div className="toolbar">
          <button type="submit" name="mode" value="next" disabled={!newCount}>
            Download next {BATCH_SIZE} new (ZIP)
          </button>
          <button type="submit" name="mode" value="selected" className="secondary" disabled={!rows.length}>
            Download selected (max {BATCH_SIZE})
          </button>
          <a className="btn secondary" href={`/api/admin/csv?${filterQuery(f)}`}>Export CSV / Excel</a>
          <span className="muted">
            {rows.length} shown{filtered ? " (filtered)" : ""}, {newCount ?? 0} not downloaded yet. PDFs can be
            downloaded again at any time.
          </span>
        </div>

        <div className="scroll">
          <table className="list">
            <thead>
              {employer ? (
                <tr>
                  <th></th><th>Submitted</th><th>Employee</th><th>Designation</th><th>Department</th>
                  <th>Employer</th><th>Organization</th><th>Avg</th><th>Downloaded</th><th></th>
                </tr>
              ) : (
                <tr>
                  <th></th><th>Submitted</th><th>Name</th><th>Reg No</th><th>Year</th><th>Department</th>
                  <th>Status</th><th>Avg</th><th>Downloaded</th><th></th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input type="checkbox" name="ids" value={r.id} aria-label="Select response" />
                  </td>
                  <td>{fmt(r.created_at)}</td>
                  {employer ? (
                    <>
                      <td>{r.employee_name}</td>
                      <td>{r.employee_designation}</td>
                      <td>{departmentLabel(r.department)}</td>
                      <td>{r.employer_name}</td>
                      <td>{r.org_mode === "stamp" ? <em className="muted">Company stamp</em> : r.organization_name}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        {r.name}
                        {r.updated_at && (
                          <span className="badge" title={`Edited by admin on ${fmt(r.updated_at)} UTC`}>Edited</span>
                        )}
                      </td>
                      <td>{r.reg_no}</td>
                      <td>{r.grad_year}</td>
                      <td className={r.department ? "" : "muted"}>{departmentLabel(r.department)}</td>
                      <td>{EMPLOYMENT_STATUSES[r.employment_status] ?? r.employment_status}</td>
                    </>
                  )}
                  <td>{avg(r.ratings)}</td>
                  <td>{r.downloaded_at ? <span className="muted">{fmt(r.downloaded_at)}</span> : <strong>New</strong>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button type="submit" formAction={`/api/admin/pdf/${r.id}?form=${f.form}`} className="secondary small">
                      PDF
                    </button>
                    {!employer && (
                      <a className="btn secondary small" href={`/edit/${r.id}`} style={{ marginLeft: 6 }}>Edit</a>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="muted">No responses found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DownloadForm>

      {rows.length > 0 && (
        <div className="card">
          <h2>Average rating per statement (current view)</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {questions.map((q, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <strong>{avgPerQ[i]}</strong> &mdash; <span className="muted">{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
