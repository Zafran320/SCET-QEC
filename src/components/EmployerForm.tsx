"use client";

import { FormEvent, useState } from "react";
import StampDrop from "@/components/StampDrop";
import { DepartmentSelect, Header, Honeypot, RatingGrid } from "@/components/FormParts";
import { EMPLOYER_QUESTIONS, OrgMode } from "@/lib/employer";

const SUBTITLE = "Employer Feedback (to be filled in by employer)";

export default function EmployerForm() {
  const [ratings, setRatings] = useState<(number | null)[]>(Array(EMPLOYER_QUESTIONS.length).fill(null));
  const [department, setDepartment] = useState("");
  const [orgMode, setOrgMode] = useState<OrgMode | "">("");
  const [stamp, setStamp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);

    if (!department) return setError("Please select the employee's department.");
    if (ratings.some((r) => r === null)) return setError(`Please rate all ${EMPLOYER_QUESTIONS.length} statements.`);
    if (!orgMode) return setError("Please choose how to show your organization: details or company stamp.");
    if (orgMode === "stamp" && !stamp) return setError("Please add the company stamp image.");

    setBusy(true);
    try {
      const res = await fetch("/api/employer/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: fd.get("employee_name"),
          employee_designation: fd.get("employee_designation"),
          department,
          employer_name: fd.get("employer_name"),
          employer_designation: fd.get("employer_designation"),
          org_mode: orgMode,
          organization_name: orgMode === "details" ? fd.get("organization_name") : "",
          address: orgMode === "details" ? fd.get("address") : "",
          stamp: orgMode === "stamp" ? stamp : null,
          email: fd.get("email"),
          ratings,
          website: fd.get("website"), // honeypot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Submission failed. Please try again.");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <Header subtitle={SUBTITLE} />
        <div className="wrap">
          <div className="card">
            <h2 className="success">Thank you! Your feedback has been submitted.</h2>
            <p>Your response has been recorded by the QEC office of SCET. We appreciate your time.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header subtitle={SUBTITLE} />
      <div className="wrap">
        <form onSubmit={onSubmit}>
          <div className="card">
            <p style={{ margin: 0 }}>
              The purpose of this feedback is to obtain employers&apos; input regarding the performance of SCET
              graduates employed in your organization. This information will be used to review and improve the
              quality of education being imparted at SCET. Your help in completing this feedback will be highly
              appreciated.
            </p>
          </div>

          <div className="card">
            <h2>Employee (SCET graduate)</h2>
            <div className="grid">
              <label className="field">
                Employee Name
                <input type="text" name="employee_name" required maxLength={120} />
              </label>
              <label className="field">
                Designation
                <input type="text" name="employee_designation" required maxLength={120} />
              </label>
              <DepartmentSelect label="Department at SCET" value={department} onChange={setDepartment} />
            </div>
            <Honeypot />
          </div>

          <RatingGrid questions={EMPLOYER_QUESTIONS} ratings={ratings} onChange={setRatings} />

          <div className="card">
            <h2>Employer</h2>
            <div className="grid">
              <label className="field">
                Employer Name
                <input type="text" name="employer_name" required maxLength={120} autoComplete="name" />
              </label>
              <label className="field">
                Designation
                <input type="text" name="employer_designation" required maxLength={120} />
              </label>
              <label className="field">
                Email address
                <input type="email" name="email" required maxLength={160} autoComplete="email" />
              </label>
            </div>

            <div style={{ marginTop: 16, fontSize: ".9rem", fontWeight: 600 }}>Organization</div>
            <div className="radio-row" style={{ flexWrap: "wrap" }}>
              <label>
                <input type="radio" name="org_mode" checked={orgMode === "details"} onChange={() => setOrgMode("details")} />
                Enter organization name and address
              </label>
              <label>
                <input type="radio" name="org_mode" checked={orgMode === "stamp"} onChange={() => setOrgMode("stamp")} />
                Use company stamp
              </label>
            </div>

            {orgMode === "details" && (
              <div className="grid" style={{ marginTop: 12 }}>
                <label className="field">
                  Organization Name
                  <input type="text" name="organization_name" required maxLength={160} autoComplete="organization" />
                </label>
                <label className="field">
                  Address
                  <input type="text" name="address" required maxLength={200} autoComplete="street-address" />
                </label>
              </div>
            )}
            {orgMode === "stamp" && (
              <div style={{ marginTop: 12 }}>
                <StampDrop value={stamp} onChange={setStamp} />
              </div>
            )}
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Submitting..." : "Submit feedback"}
          </button>
        </form>
      </div>
    </>
  );
}
