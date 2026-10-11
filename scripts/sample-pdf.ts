// Renders sample PDFs so you can check the layouts without Supabase:
//   npm run sample-pdf                      -> sample-alumni.pdf, sample-employer.pdf
//   npm run sample-pdf -- stamp.png         -> also sample-employer-stamp.pdf using that stamp image
import fs from "fs";
import { generateFeedbackPdf } from "../src/lib/pdf";
import { generateEmployerPdf } from "../src/lib/employer-pdf";

// 1x1 placeholder signature
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function main() {
  const now = new Date().toISOString();
  const alumni = await generateFeedbackPdf({
    name: "Muhammad Zafran",
    reg_no: "SCET-2019-CS-014",
    grad_year: "2023",
    email: "alumni@example.com",
    cell_no: "0300-1234567",
    department: "computer_science",
    employment_status: "self_employed",
    ratings: [5, 4, 3, 4, 2, 5, 4, 3, 5],
    comments: "The curriculum should include more hands-on industry projects and updated software tools.",
    signature: TINY_PNG,
    created_at: now,
  });
  fs.writeFileSync("sample-alumni.pdf", alumni);

  const base = {
    employee_name: "Muhammad Zafran",
    employee_designation: "Software Engineer",
    department: "computer_science" as const,
    employer_name: "Ahmed Khan",
    employer_designation: "Engineering Manager",
    email: "hr@example.com",
    ratings: [5, 4, 3, 4, 5, 4, 3, 4, 5, 4, 3],
    created_at: now,
  };
  fs.writeFileSync(
    "sample-employer.pdf",
    await generateEmployerPdf({
      ...base,
      org_mode: "details",
      organization_name: "Example Technologies (Pvt) Ltd",
      address: "Plot 12, Street 4, Industrial Area I-9/3, Islamabad, Pakistan",
      stamp: null,
    }),
  );

  const stampFile = process.argv[2];
  if (stampFile) {
    const stamp = `data:image/png;base64,${fs.readFileSync(stampFile).toString("base64")}`;
    fs.writeFileSync(
      "sample-employer-stamp.pdf",
      await generateEmployerPdf({ ...base, org_mode: "stamp", organization_name: "", address: "", stamp }),
    );
  }
  console.log("Wrote sample PDFs");
}
main();
