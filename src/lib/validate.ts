import { EMPLOYER_QUESTIONS, EmployerRecord } from "./employer";
import { FeedbackRecord, QUESTIONS, isDepartment, isEmploymentStatus } from "./questions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SIGNATURE_CHARS = 200_000; // ~150 KB, keeps a 10-PDF ZIP well under 4.5 MB
const MAX_STAMP_CHARS = 400_000; // ~300 KB; the browser shrinks stamps to 400 px before upload
const PNG_PREFIX = "data:image/png;base64,";

type Result<T> = { ok: true; rec: T } | { ok: false; error: string };

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function validRatings(v: unknown, count: number): v is number[] {
  return Array.isArray(v) && v.length === count && v.every((r) => Number.isInteger(r) && r >= 1 && r <= 5);
}

/**
 * Alumni form fields. Used for new submissions and for admin edits; an edit keeps the
 * student's original signature, so `signature` is only checked when it is required.
 */
export function parseAlumni(body: Record<string, unknown>, { requireSignature }: { requireSignature: boolean }): Result<FeedbackRecord> {
  const rec: FeedbackRecord = {
    name: str(body.name, 120),
    reg_no: str(body.reg_no, 40),
    grad_year: str(body.grad_year, 9),
    email: str(body.email, 160),
    cell_no: str(body.cell_no, 20),
    department: body.department as FeedbackRecord["department"],
    employment_status: body.employment_status as FeedbackRecord["employment_status"],
    ratings: body.ratings as number[],
    comments: str(body.comments, 500),
    signature: typeof body.signature === "string" ? body.signature : "",
  };

  if (!rec.name || !rec.reg_no || !rec.grad_year || !rec.cell_no) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!EMAIL_RE.test(rec.email)) return { ok: false, error: "Please enter a valid email address." };
  if (!isDepartment(rec.department)) return { ok: false, error: "Please select a department." };
  if (!isEmploymentStatus(rec.employment_status)) {
    return { ok: false, error: "Please select Employed, Self-employed or Unemployed." };
  }
  if (!validRatings(rec.ratings, QUESTIONS.length)) {
    return { ok: false, error: "Please rate all statements from 1 to 5." };
  }
  if (requireSignature && (!rec.signature.startsWith(PNG_PREFIX) || rec.signature.length > MAX_SIGNATURE_CHARS)) {
    return { ok: false, error: "Please provide a valid signature." };
  }
  return { ok: true, rec };
}

export function parseEmployer(body: Record<string, unknown>): Result<EmployerRecord> {
  const stamp = body.org_mode === "stamp";
  const rec: EmployerRecord = {
    employee_name: str(body.employee_name, 120),
    employee_designation: str(body.employee_designation, 120),
    department: body.department as EmployerRecord["department"],
    employer_name: str(body.employer_name, 120),
    employer_designation: str(body.employer_designation, 120),
    org_mode: stamp ? "stamp" : "details",
    // The stamp replaces the typed organization details, so they are never stored together
    organization_name: stamp ? "" : str(body.organization_name, 160),
    address: stamp ? "" : str(body.address, 200),
    stamp: stamp && typeof body.stamp === "string" ? body.stamp : null,
    email: str(body.email, 160),
    ratings: body.ratings as number[],
  };

  if (!rec.employee_name || !rec.employee_designation || !rec.employer_name || !rec.employer_designation) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!isDepartment(rec.department)) return { ok: false, error: "Please select the employee's department." };
  if (!EMAIL_RE.test(rec.email)) return { ok: false, error: "Please enter a valid email address." };
  if (body.org_mode !== "stamp" && body.org_mode !== "details") {
    return { ok: false, error: "Please choose organization details or company stamp." };
  }
  if (rec.org_mode === "details" && (!rec.organization_name || !rec.address)) {
    return { ok: false, error: "Please enter the organization name and address." };
  }
  if (rec.org_mode === "stamp" && (!rec.stamp?.startsWith(PNG_PREFIX) || rec.stamp.length > MAX_STAMP_CHARS)) {
    return { ok: false, error: "Please add a valid company stamp image." };
  }
  if (!validRatings(rec.ratings, EMPLOYER_QUESTIONS.length)) {
    return { ok: false, error: "Please rate all statements from 1 to 5." };
  }
  return { ok: true, rec };
}
