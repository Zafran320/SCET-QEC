"use client";

import { DEPARTMENTS, LEGEND } from "@/lib/questions";

export function Header({ subtitle }: { subtitle: string }) {
  return (
    <div className="header">
      <h1>Swedish College of Engineering &amp; Technology, Wah Cantt</h1>
      <p>Office of Director QEC &mdash; {subtitle}</p>
    </div>
  );
}

export function DepartmentSelect({ name = "department", label, value, onChange }: {
  name?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      {label}
      <select name={name} required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>Select department</option>
        {Object.entries(DEPARTMENTS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </label>
  );
}

/** 1-5 rating buttons for each statement. */
export function RatingGrid({ questions, ratings, onChange }: {
  questions: string[];
  ratings: (number | null)[];
  onChange: (next: (number | null)[]) => void;
}) {
  return (
    <div className="card">
      <h2>Please select the appropriate grade</h2>
      <div className="legend">
        {LEGEND.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      {questions.map((q, i) => (
        <div className="q" key={i}>
          <p>
            <strong>{i + 1}.</strong> {q}
          </p>
          <div className="rates" role="radiogroup" aria-label={`Question ${i + 1}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name={`q${i}`}
                  value={n}
                  checked={ratings[i] === n}
                  onChange={() => onChange(ratings.map((v, idx) => (idx === i ? n : v)))}
                />
                {n}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Honeypot() {
  // Real users never see or fill this
  return (
    <div className="hp" aria-hidden="true">
      <label>
        Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
