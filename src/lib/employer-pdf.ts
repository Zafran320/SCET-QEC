import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { EMPLOYER_QUESTIONS, EmployerRecord } from "./employer";
import { LEGEND } from "./questions";
import { clean, fillLine, templatePdfBytes, wrap } from "./pdf";

// The employer form has no PDF template, so the page is drawn here to match the printed
// "Employer Feedback" form. The letterhead (logo + college name) is copied from the alumni proforma.
// All coordinates are measured from the TOP of a Letter page (612 x 792 pt).
const PAGE_W = 612;
const PAGE_H = 792;
const Y = (top: number) => PAGE_H - top;

const black = rgb(0, 0, 0);
const ink = rgb(0.05, 0.1, 0.45); // dark blue "pen" for filled-in values
const white = rgb(1, 1, 1);

const LETTERHEAD_H = 96; // logo + "Swedish College ..." + "Office of Director QEC"
const TITLE_COVER_TOP = 80; // the proforma's own "Alumni Feedback" title starts below this, right of the logo
const MARGIN = { x0: 72, x1: 540 };

const INTRO =
  "The purpose of this feedback is to obtain employers' input regarding the performance of SCET graduates " +
  "employed in your organization. This information will be used to review and improve the quality of " +
  "education being imparted at SCET. Your help in completing this feedback will be highly appreciated.";

// Ratings table
const TABLE = { top: 268, rowH: 29, numX1: 96, textX1: 380 };
const RATE_W = (MARGIN.x1 - TABLE.textX1) / 5;

// Bottom fields: two columns of "Label: ________"
const LEFT = { x0: 72, x1: 290 };
const RIGHT = { x0: 318, x1: 540 };
const FIELD_TOP = 628;
const FIELD_GAP = 25;
// Area the company stamp fills instead of "Organization Name" and "Address"
const STAMP_BOX = { top: FIELD_TOP + FIELD_GAP + 8, height: 58 };

function centered(page: PDFPage, text: string, font: PDFFont, size: number, top: number) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_W - w) / 2, y: Y(top), size, font, color: black });
}

/** Draws "Label: ______" with its baseline at `base` and writes the value on the line. */
function field(page: PDFPage, font: PDFFont, label: string, value: string, col: { x0: number; x1: number }, base: number) {
  const size = 11;
  page.drawText(label, { x: col.x0, y: Y(base), size, font, color: black });
  const x0 = col.x0 + font.widthOfTextAtSize(label, size) + 4;
  page.drawLine({ start: { x: x0, y: Y(base + 2) }, end: { x: col.x1, y: Y(base + 2) }, thickness: 0.5, color: black });
  if (value) fillLine(page, font, value, { x0, x1: col.x1, base: base - 1 });
}

/** Address may be long: shrink to fit one line, else wrap onto a second line. */
function addressField(page: PDFPage, font: PDFFont, value: string, base: number) {
  const label = "Address:";
  const size = 11;
  page.drawText(label, { x: RIGHT.x0, y: Y(base), size, font, color: black });
  const x0 = RIGHT.x0 + font.widthOfTextAtSize(label, size) + 4;
  page.drawLine({ start: { x: x0, y: Y(base + 2) }, end: { x: RIGHT.x1, y: Y(base + 2) }, thickness: 0.5, color: black });
  const v = clean(value).trim();
  const maxW = RIGHT.x1 - x0 - 3;
  if (font.widthOfTextAtSize(v, 9) <= maxW) {
    fillLine(page, font, v, { x0, x1: RIGHT.x1, base: base - 1 });
    return;
  }
  // Two lines, the second sitting just under the first (still above "Email address")
  let s = 9;
  let lines = wrap(v, font, s, maxW);
  while (lines.length > 2 && s > 6.5) {
    s -= 0.5;
    lines = wrap(v, font, s, maxW);
  }
  lines.slice(0, 2).forEach((l, i) => {
    page.drawText(l, { x: x0 + 2, y: Y(base - 1 + i * (s + 1.5)), size: s, font, color: ink });
  });
}

export async function generateEmployerPdf(rec: EmployerRecord): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Employer Feedback - ${rec.employee_name}`);
  pdf.setAuthor("Swedish College of Engineering & Technology, Wah Cantt");
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  // ---- Letterhead from the official proforma (its own "Alumni Feedback" title is covered) ----
  const template = await PDFDocument.load(templatePdfBytes());
  const [head] = await pdf.embedPages([template.getPage(0)], [
    { left: 0, right: PAGE_W, top: PAGE_H, bottom: PAGE_H - LETTERHEAD_H },
  ]);
  page.drawPage(head, { x: 0, y: PAGE_H - LETTERHEAD_H });
  // The cover runs 2 pt past the clip edge so no anti-aliased sliver of the old title survives
  page.drawRectangle({ x: 140, y: PAGE_H - LETTERHEAD_H - 2, width: PAGE_W - 140, height: LETTERHEAD_H - TITLE_COVER_TOP + 2, color: white });

  centered(page, "Employer Feedback", bold, 14, 112);
  centered(page, "(to be filled in by employer)", serif, 13, 129);

  // ---- Introduction ----
  wrap(INTRO, serif, 11, MARGIN.x1 - MARGIN.x0).forEach((l, i) => {
    page.drawText(l, { x: MARGIN.x0, y: Y(160 + i * 14), size: 11, font: serif, color: black });
  });

  // ---- Legend ----
  const legendTop = 214;
  page.drawText("Legend:", { x: MARGIN.x0, y: Y(legendTop + 11), size: 11, font: serif, color: black });
  const lx0 = 150;
  const lw = (MARGIN.x1 - lx0) / LEGEND.length;
  LEGEND.forEach((l, i) => {
    page.drawRectangle({ x: lx0 + i * lw, y: Y(legendTop + 15), width: lw, height: 15, borderColor: black, borderWidth: 0.6 });
    page.drawText(l, { x: lx0 + i * lw + 4, y: Y(legendTop + 11), size: 10.5, font: serif, color: black });
  });
  page.drawText("Please encircle the appropriate grade:", { x: MARGIN.x0, y: Y(250), size: 11, font: serif, color: black });

  // ---- Ratings table ----
  const rows = EMPLOYER_QUESTIONS.length;
  const tableBottom = TABLE.top + rows * TABLE.rowH;
  const line = (x0: number, t0: number, x1: number, t1: number) =>
    page.drawLine({ start: { x: x0, y: Y(t0) }, end: { x: x1, y: Y(t1) }, thickness: 0.6, color: black });

  for (let r = 0; r <= rows; r++) line(MARGIN.x0, TABLE.top + r * TABLE.rowH, MARGIN.x1, TABLE.top + r * TABLE.rowH);
  for (const x of [MARGIN.x0, TABLE.numX1, TABLE.textX1, ...[1, 2, 3, 4, 5].map((c) => TABLE.textX1 + c * RATE_W)]) {
    line(x, TABLE.top, x, tableBottom);
  }

  EMPLOYER_QUESTIONS.forEach((q, i) => {
    const top = TABLE.top + i * TABLE.rowH;
    const mid = top + TABLE.rowH / 2;
    page.drawText(`${i + 1}.`, { x: MARGIN.x0 + 5, y: Y(mid + 3.5), size: 10.5, font: serif, color: black });

    const lines = wrap(q, serif, 10.5, TABLE.textX1 - TABLE.numX1 - 10);
    const first = mid + 3.5 - ((lines.length - 1) * 12.5) / 2;
    lines.forEach((l, j) => {
      page.drawText(l, { x: TABLE.numX1 + 5, y: Y(first + j * 12.5), size: 10.5, font: serif, color: black });
    });

    for (let c = 0; c < 5; c++) {
      const cx = TABLE.textX1 + c * RATE_W + RATE_W / 2;
      const d = String(c + 1);
      page.drawText(d, { x: cx - serif.widthOfTextAtSize(d, 10.5) / 2, y: Y(mid + 3.5), size: 10.5, font: serif, color: black });
    }

    const r = rec.ratings[i];
    if (r >= 1 && r <= 5) {
      page.drawEllipse({
        x: TABLE.textX1 + (r - 1) * RATE_W + RATE_W / 2,
        y: Y(mid),
        xScale: 8.5,
        yScale: 8,
        borderColor: ink,
        borderWidth: 1.3,
      });
    }
  });

  // ---- Employee / employer details ----
  field(page, serif, "Employee Name:", rec.employee_name, LEFT, FIELD_TOP);
  field(page, serif, "Designation:", rec.employee_designation, LEFT, FIELD_TOP + FIELD_GAP);

  field(page, serif, "Employer Name:", rec.employer_name, RIGHT, FIELD_TOP);
  field(page, serif, "Designation:", rec.employer_designation, RIGHT, FIELD_TOP + FIELD_GAP);

  if (rec.org_mode === "stamp" && rec.stamp) {
    // The stamp replaces "Organization Name" and "Address"
    try {
      const img = await pdf.embedPng(Buffer.from(rec.stamp.replace(/^data:image\/png;base64,/, ""), "base64"));
      const maxW = RIGHT.x1 - RIGHT.x0;
      const scale = Math.min(maxW / img.width, STAMP_BOX.height / img.height, 1.2);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, {
        x: RIGHT.x0 + (maxW - w) / 2,
        y: Y(STAMP_BOX.top + (STAMP_BOX.height + h) / 2),
        width: w,
        height: h,
      });
    } catch {
      /* stamp could not be embedded */
    }
  } else {
    field(page, serif, "Organization Name:", rec.organization_name, RIGHT, FIELD_TOP + 2 * FIELD_GAP);
    addressField(page, serif, rec.address, FIELD_TOP + 3 * FIELD_GAP);
  }
  // The stamp box ends just above this line, so "Email address" sits at the same place in both modes
  field(page, serif, "Email address:", rec.email, RIGHT, FIELD_TOP + 4 * FIELD_GAP + 4);

  // ---- Footer ----
  const when = rec.created_at ? new Date(rec.created_at) : new Date();
  const foot = `Submitted online on ${when.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  page.drawText(foot, { x: 72, y: 24, size: 7.5, font: serif, color: rgb(0.45, 0.45, 0.45) });

  return pdf.save();
}
