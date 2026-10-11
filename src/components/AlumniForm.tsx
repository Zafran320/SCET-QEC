"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/SignaturePad";
import { DepartmentSelect, Header, Honeypot, RatingGrid } from "@/components/FormParts";
import { EMPLOYMENT_STATUSES, EmploymentStatus, FeedbackRecord, QUESTIONS } from "@/lib/questions";

/**
 * The alumni feedback form. Students use it at /alumni-feedback ("create"); the admin uses the same
 * form pre-filled to edit a response ("edit"), which overwrites the old values but keeps the signature.
 */
export default function AlumniForm({ initial }: { initial?: FeedbackRecord & { id: string } }) {
  const editing = Boolean(initial);
  const router = useRouter();
  const [ratings, setRatings] = useState<(number | null)[]>(initial?.ratings ?? Array(QUESTIONS.length).fill(null));
  const [employment, setEmployment] = useState<EmploymentStatus | "">(initial?.employment_status ?? "");
  const [department, setDepartment] = useState<string>(initial?.department ?? "");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);

    if (!department) return setError("Please select your department.");
    if (!employment) return setError("Please select your employment status.");
    if (ratings.some((r) => r === null)) return setError(`Please rate all ${QUESTIONS.length} statements.`);
    if (!editing && !signature) return setError("Please sign in the signature box.");

    const body = {
      name: fd.get("name"),
      reg_no: fd.get("reg_no"),
      grad_year: fd.get("grad_year"),
      email: fd.get("email"),
      cell_no: fd.get("cell_no"),
      department,
      employment_status: employment,
      ratings,
      comments: fd.get("comments"),
      ...(editing ? {} : { signature, website: fd.get("website") }),
    };

    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/admin/alumni/${initial!.id}` : "/api/submit", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Saving failed. Please try again.");
      if (editing) {
        router.push("/?form=alumni&saved=1");
        router.refresh();
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed.");
    } finally {
      setBusy(false);
    }
  }

  const subtitle = "Alumni Feedback (to be filled in by Ex-students of SCET)";

  if (done) {
    return (
      <>
        <Header subtitle={subtitle} />
        <div className="wrap">
          <div className="card">
            <h2 className="success">Thank you! Your feedback has been submitted.</h2>
            <p>
              Your response has been recorded by the QEC office. You do not need to print or upload
              anything else.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {editing ? (
        <div className="wrap" style={{ paddingBottom: 0 }}>
          <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 0 }}>
            <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Edit alumni response</h1>
            <a className="btn secondary" href="/?form=alumni">Back to list</a>
          </div>
          <p className="notice">
            Saving replaces the student&apos;s previous answers. The old values are not kept. The signature stays as the
            student drew it.
          </p>
        </div>
      ) : (
        <Header subtitle={subtitle} />
      )}
      <div className="wrap">
        <form onSubmit={onSubmit}>
          {!editing && (
            <div className="card">
              <p style={{ margin: 0 }}>
                The purpose of this survey is to obtain alumni input on the quality of education imparted at SCET
                with a view to update the curriculum in a rapidly changing environment.
              </p>
            </div>
          )}

          <div className="card">
            <h2>Alumni Information</h2>
            <div className="grid">
              <label className="field">
                Name
                <input type="text" name="name" required maxLength={120} autoComplete="name" defaultValue={initial?.name} />
              </label>
              <label className="field">
                Registration No
                <input type="text" name="reg_no" required maxLength={40} defaultValue={initial?.reg_no} />
              </label>
              <label className="field">
                Year of Graduation
                <input type="text" name="grad_year" required maxLength={9} inputMode="numeric" placeholder="e.g. 2021"
                  defaultValue={initial?.grad_year} />
              </label>
              <DepartmentSelect label="Department" value={department} onChange={setDepartment} />
              <label className="field">
                Email
                <input type="email" name="email" required maxLength={160} autoComplete="email" defaultValue={initial?.email} />
              </label>
              <label className="field">
                Cell No
                <input type="tel" name="cell_no" required maxLength={20} autoComplete="tel" defaultValue={initial?.cell_no} />
              </label>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: ".9rem", fontWeight: 600 }}>Employment status</div>
              <div className="radio-row">
                {(Object.keys(EMPLOYMENT_STATUSES) as EmploymentStatus[]).map((s) => (
                  <label key={s}>
                    <input type="radio" name="employment" checked={employment === s} onChange={() => setEmployment(s)} />
                    {EMPLOYMENT_STATUSES[s]}
                  </label>
                ))}
              </div>
            </div>
            {!editing && <Honeypot />}
          </div>

          <RatingGrid questions={QUESTIONS} ratings={ratings} onChange={setRatings} />

          <div className="card">
            <h2>Any other comment and justification</h2>
            <textarea name="comments" rows={4} maxLength={500} defaultValue={initial?.comments} />
          </div>

          <div className="card">
            <h2>Signature</h2>
            {editing ? (
              initial!.signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={initial!.signature} alt="Student's signature" className="sig-preview" />
              ) : (
                <p className="muted">No signature.</p>
              )
            ) : (
              <>
                <p className="muted" style={{ marginTop: 0 }}>Sign with your finger or mouse in the box below.</p>
                <SignaturePad onChange={setSignature} />
              </>
            )}
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>
            {editing ? (busy ? "Saving..." : "Save changes") : busy ? "Submitting..." : "Submit feedback"}
          </button>
        </form>
      </div>
    </>
  );
}
