import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import { EMPLOYMENT_STATUSES, EmploymentStatus, FeedbackRecord } from "./questions";

// The official proforma (Letter, 612 x 792 pt) is used as the background and the
// answers are written on top, so the output looks exactly like the printed form.
// All coordinates below are measured from the TOP of the page, taken from the template.
const TEMPLATE = path.join(process.cwd(), "assets", "proforma-template.pdf");
const PAGE_H = 792;

const ink = rgb(0.05, 0.1, 0.45); // dark blue "pen" for filled-in values
const white = rgb(1, 1, 1);

// Blank lines: x range of the underscores and the baseline to write on
const FIELDS = {
  name: { x0: 119, x1: 286, base: 215 },
  reg_no: { x0: 401, x1: 532, base: 215 },
  grad_year: { x0: 184, x1: 285, base: 243 },
  email: { x0: 353, x1: 532, base: 243 },
  cell_no: { x0: 364, x1: 531, base: 270 },
};

// The template only prints "Employed [ ]  Unemployed [ ]". That row is covered and redrawn with all
// three statuses (slightly smaller font so it still ends before "Cell No" at x = 324).
const STATUS_ROW = { x0: 90, x1: 313, base: 270.2, boxCenterY: 264.1, size: 11, box: 8.6 };
const STATUS_ORDER: EmploymentStatus[] = ["employed", "self_employed", "unemployed"];

// Rating digits: column x (left edge of the digit) and the top of the digits in each row
const RATE_X = [377.23, 411.07, 447.07, 483.1, 519.1];
const ROW_TOP = [332.05, 362.29, 392.41, 424.71, 456.99, 497.07, 537.27, 567.39, 595.62];

// The printed template has wrong digits in two rows (row 3 shows "4" under 3,
// row 9 shows "2" under 3 and 4). Cover them and print the correct ones.
const DIGIT_FIXES: { row: number; col: number }[] = [
  { row: 2, col: 2 },
  { row: 8, col: 2 },
  { row: 8, col: 3 },
];

// Comment area: between the label and the signature
const COMMENT = { x0: 72, x1: 540, firstBase: 672, lineGap: 11, maxLines: 4 };
// Signature line
const SIG = { x0: 397, x1: 540, base: 735, maxH: 30 };

// Standard PDF fonts only cover WinAnsi; strip anything else so generation never crashes.
export function clean(s: string): string {
  return s.replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (let w of text.split(/\s+/).filter(Boolean)) {
    // Break words that are longer than a whole line (e.g. URLs)
    while (font.widthOfTextAtSize(w, size) > maxWidth) {
      let i = w.length - 1;
      while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > maxWidth) i--;
      if (line) lines.push(line);
      lines.push(w.slice(0, i));
      line = "";
      w = w.slice(i);
    }
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Write a value on a blank line, shrinking the font if it is too long. */
export function fillLine(page: PDFPage, font: PDFFont, value: string, f: { x0: number; x1: number; base: number }) {
  let v = clean(value);
  const maxW = f.x1 - f.x0 - 3;
  let size = 11;
  while (size > 7 && font.widthOfTextAtSize(v, size) > maxW) size -= 0.5;
  while (v.length > 1 && font.widthOfTextAtSize(v, size) > maxW) v = v.slice(0, -1);
  page.drawText(v, { x: f.x0 + 2, y: PAGE_H - f.base, size, font, color: ink });
}

/** Redraws the employment status row with three check boxes and ticks the chosen one. */
function drawStatusRow(page: PDFPage, font: PDFFont, status: EmploymentStatus) {
  const r = STATUS_ROW;
  page.drawRectangle({ x: r.x0 - 2, y: PAGE_H - (r.base + 4), width: r.x1 - r.x0 + 4, height: 17, color: white });

  const labels = STATUS_ORDER.map((s) => EMPLOYMENT_STATUSES[s]);
  const textW = labels.reduce((a, l) => a + font.widthOfTextAtSize(l, r.size), 0);
  const labelGap = 4; // between a label and its box
  const groupGap = (r.x1 - r.x0 - textW - STATUS_ORDER.length * (r.box + labelGap)) / (STATUS_ORDER.length - 1);

  let x = r.x0;
  STATUS_ORDER.forEach((s, i) => {
    page.drawText(labels[i], { x, y: PAGE_H - r.base, size: r.size, font, color: rgb(0, 0, 0) });
    x += font.widthOfTextAtSize(labels[i], r.size) + labelGap;
    const cy = PAGE_H - r.boxCenterY;
    page.drawRectangle({ x, y: cy - r.box / 2, width: r.box, height: r.box, borderColor: rgb(0, 0, 0), borderWidth: 0.6 });
    if (s === status) {
      const cx = x + r.box / 2;
      page.drawLine({ start: { x: cx - 4, y: cy + 0.5 }, end: { x: cx - 1, y: cy - 3 }, thickness: 1.6, color: ink });
      page.drawLine({ start: { x: cx - 1, y: cy - 3 }, end: { x: cx + 5, y: cy + 5 }, thickness: 1.6, color: ink });
    }
    x += r.box + groupGap;
  });
}

let templateBytes: Buffer | null = null;

/** The official alumni proforma; the employer form reuses its letterhead. */
export function templatePdfBytes(): Buffer {
  templateBytes ??= fs.readFileSync(TEMPLATE);
  return templateBytes;
}

export async function generateFeedbackPdf(rec: FeedbackRecord): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templatePdfBytes());
  pdf.setTitle(`Alumni Feedback - ${rec.reg_no}`);
  pdf.setAuthor("Swedish College of Engineering & Technology, Wah Cantt");
  const page = pdf.getPage(0);
  const Y = (top: number) => PAGE_H - top;

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);

  // ---- Alumni information ----
  fillLine(page, serif, rec.name, FIELDS.name);
  fillLine(page, serif, rec.reg_no, FIELDS.reg_no);
  fillLine(page, serif, rec.grad_year, FIELDS.grad_year);
  fillLine(page, serif, rec.email, FIELDS.email);
  fillLine(page, serif, rec.cell_no, FIELDS.cell_no);

  drawStatusRow(page, serif, rec.employment_status);

  // ---- Correct the misprinted digits in the template ----
  for (const { row, col } of DIGIT_FIXES) {
    const x = RATE_X[col];
    const top = ROW_TOP[row];
    page.drawRectangle({ x: x - 1, y: Y(top + 10), width: 8, height: 12, color: white });
    page.drawText(String(col + 1), { x, y: Y(top + 8.2), size: 12, font: serif, color: rgb(0, 0, 0) });
  }

  // ---- Ratings: encircle the chosen grade ----
  rec.ratings.forEach((r, i) => {
    if (r < 1 || r > 5 || i >= ROW_TOP.length) return;
    page.drawEllipse({
      x: RATE_X[r - 1] + 3,
      y: Y(ROW_TOP[i] + 4.5),
      xScale: 8,
      yScale: 7.5,
      borderColor: ink,
      borderWidth: 1.3,
    });
  });

  // ---- Comments (font shrinks so up to 4 lines always fit) ----
  const comments = clean(rec.comments || "").trim();
  if (comments) {
    const width = COMMENT.x1 - COMMENT.x0;
    let size = 11;
    let lines = wrap(comments, serif, size, width);
    while (lines.length > COMMENT.maxLines && size > 6.5) {
      size -= 0.5;
      lines = wrap(comments, serif, size, width);
    }
    const gap = Math.min(COMMENT.lineGap, size + 2);
    lines.slice(0, COMMENT.maxLines).forEach((l, i) => {
      page.drawText(l, { x: COMMENT.x0, y: Y(COMMENT.firstBase + i * gap), size, font: serif, color: ink });
    });
  }

  // ---- Signature (sits on the signature line) ----
  try {
    const b64 = rec.signature.replace(/^data:image\/png;base64,/, "");
    const sig = await pdf.embedPng(Buffer.from(b64, "base64"));
    const scale = Math.min((SIG.x1 - SIG.x0) / sig.width, SIG.maxH / sig.height);
    const w = sig.width * scale;
    page.drawImage(sig, { x: SIG.x0 + (SIG.x1 - SIG.x0 - w) / 2, y: Y(SIG.base), width: w, height: sig.height * scale });
  } catch {
    /* signature could not be embedded */
  }

  // ---- Footer ----
  const stamp = rec.created_at ? new Date(rec.created_at) : new Date();
  const foot = `Submitted online on ${stamp.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  page.drawText(foot, { x: 72, y: 24, size: 7.5, font: serif, color: rgb(0.45, 0.45, 0.45) });

  return pdf.save();
}
