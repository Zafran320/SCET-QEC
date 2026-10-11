import JSZip from "jszip";
import { generateFeedbackPdf } from "./pdf";
import { generateEmployerPdf } from "./employer-pdf";
import { FeedbackRecord } from "./questions";
import { EmployerRecord } from "./employer";
import { FormKind } from "./filters";

const safe = (s: string) => s.replace(/[^\w.-]+/g, "_").slice(0, 80);

/** File name (without .pdf) and PDF bytes for one alumni or employer response. */
export async function buildPdf(form: FormKind, row: FeedbackRecord | EmployerRecord): Promise<{ base: string; pdf: Uint8Array }> {
  if (form === "employer") {
    const r = row as EmployerRecord;
    return { base: safe(`Employer_Feedback_${r.employee_name}_${r.employer_name}`), pdf: await generateEmployerPdf(r) };
  }
  const r = row as FeedbackRecord;
  return { base: safe(`${r.reg_no}_${r.name}`), pdf: await generateFeedbackPdf(r) };
}

/** Builds a ZIP with one filled-in PDF per response. */
export async function buildFeedbackZip(form: FormKind, rows: (FeedbackRecord | EmployerRecord)[]): Promise<Uint8Array> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const row of rows) {
    let { base, pdf } = await buildPdf(form, row);
    while (used.has(base)) base += "_";
    used.add(base);
    zip.file(`${base}.pdf`, pdf);
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function downloadHeaders(contentType: string, filename: string): HeadersInit {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
