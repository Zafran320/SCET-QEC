# SCET Alumni & Employer Feedback (Next.js + Supabase)

Two online feedback forms for the Office of Director QEC:

| URL | Who | What |
|---|---|---|
| `/` | Admin | Login, then the admin page: both form types, filters, PDF / ZIP / CSV downloads, editing |
| `/alumni-feedback` | Ex-students | Alumni feedback proforma (9 statements, signature) |
| `/employer` | Employers | Employer feedback (11 statements, typed organization details **or** company stamp) |

Every response is saved in Supabase. PDFs are generated on demand: the alumni PDF is the official proforma
with the answers written on top; the employer PDF is drawn to match the printed employer form.

## 1. Supabase setup
1. Create a project at supabase.com (free plan).
2. SQL Editor -> New query -> paste `supabase/schema.sql` -> Run.
   **Upgrading an existing database:** run the same file again. It is safe to re-run, keeps all responses,
   adds the new columns (department, self-employed, edit marker) and creates the employer table.
3. Project Settings -> API: copy the **Project URL** and the **service_role** key.
   The service role key is used only on the server. Never put it in client code or commit it.

## 2. Local run
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000  (admin)
```
Preview the PDF layouts without any setup: `npm run sample-pdf` (writes `sample-alumni.pdf` and
`sample-employer.pdf`; add `-- stamp.png` to also render a stamped employer PDF).

## 3. PDFs
- **Alumni:** `assets/proforma-template.pdf` is the background. If it changes, replace the file and update the
  coordinates at the top of `src/lib/pdf.ts`. The printed form only has Employed / Unemployed boxes, so that row
  is redrawn with Employed / Self-employed / Unemployed. Misprinted grade digits (rows 3 and 9) are corrected.
- **Employer:** drawn in `src/lib/employer-pdf.ts` (letterhead copied from the alumni proforma). The misprint in
  row 3 of the paper form ("1 2 4 4 5") is not reproduced. With a company stamp, the stamp is placed where
  "Organization Name" and "Address" would be.

## 4. Deploy on Vercel (free)
1. Push this folder to a GitHub repository.
2. Vercel -> Add New Project -> import the repo (framework: Next.js).
3. Add every variable from `.env.example` under Settings -> Environment Variables.
4. Deploy. Share `<your-domain>/alumni-feedback` with alumni and `<your-domain>/employer` with employers.
   The main URL is the admin page.

## Notes
- **Departments:** Electrical, Civil, Mechanical Engineering and Computer Science. Both forms ask for it and the
  admin page filters by it. Alumni responses from before this feature show "Not set" (filter: "Department not
  set"); the admin can set it with Edit.
- **Admin editing (alumni):** Edit opens the response pre-filled; every field and every rating can be changed.
  Saving overwrites the previous answers (no history is kept) and marks the row "Edited". The student's
  signature is never changed. PDFs are built from the current data, so the next download shows the edit.
- **Downloads are unlimited.** "Download next 10 new" gives the 10 oldest responses never downloaded that match
  the current filters; you can also tick up to 10 rows or download one row, as often as you like. The
  "Downloaded" column only shows when a PDF was last downloaded. The CSV export uses the current filters.
- **Company stamp:** the employer drops a photo or scan of the stamp; the browser removes the white background,
  trims it and shrinks it to 400 px, and shows a preview before submitting. Choosing the stamp hides the
  Organization Name and Address fields (they are not stored).
- One alumni response per registration number (case-insensitive); duplicates get a clear message. Employer
  responses are not limited.
- Spam protection: hidden honeypot field plus server-side validation. For stronger protection add Cloudflare Turnstile.
- Comments are limited to 500 characters so they fit the 4 lines on the form.
- Supabase free projects pause after about a week of inactivity; restore from the dashboard if that happens.
- Changing wording: alumni statements in `src/lib/questions.ts` (the schema expects exactly 9 ratings),
  employer statements in `src/lib/employer.ts` (exactly 11).
- Admin sessions last 8 hours; change `MAX_AGE_SECONDS` in `src/lib/auth.ts`.
