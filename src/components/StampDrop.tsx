"use client";

import { DragEvent, useRef, useState } from "react";

const MAX_SIDE = 400; // px; keeps the PNG small (server limit ~300 KB) and is plenty for print size
const MAX_FILE_MB = 10;

// Pixels whose darkest channel is above HARD are paper (fully transparent); between SOFT and HARD
// they fade out, so stamp edges stay smooth. Stamp ink (blue, red, purple, black) is far below SOFT.
const SOFT = 170;
const HARD = 215;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file could not be read as an image."));
    };
    img.src = url;
  });
}

/** Removes the white/paper background, trims empty borders and returns a transparent PNG data URL. */
async function processStamp(file: File): Promise<string> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < px.length; i += 4) {
    const lightest = Math.min(px[i], px[i + 1], px[i + 2]);
    let a = px[i + 3];
    if (lightest >= HARD) a = 0;
    else if (lightest > SOFT) a = Math.round((a * (HARD - lightest)) / (HARD - SOFT));
    px[i + 3] = a;
    if (a > 24) {
      const p = i / 4;
      const x = p % w;
      const y = (p - x) / w;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("No stamp found in this image. Please use a clear photo or scan of the stamp.");
  ctx.putImageData(data, 0, 0);

  // Trim to the stamp itself (+ a small margin) so it fills the space on the PDF
  const pad = 4;
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w, maxX + pad + 1) - cx;
  const ch = Math.min(h, maxY + pad + 1) - cy;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return out.toDataURL("image/png");
}

/**
 * Drop zone for the company stamp. The employer drops (or picks) a photo/scan of the stamp;
 * the background is removed in the browser and the result is placed on the PDF automatically.
 */
export default function StampDrop({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handle(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError("Please use a PNG, JPG or WEBP image.");
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`The image must be smaller than ${MAX_FILE_MB} MB.`);
    setBusy(true);
    try {
      onChange(await processStamp(file));
    } catch (e) {
      onChange(null);
      setError(e instanceof Error ? e.message : "Could not process the stamp.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    handle(e.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <div
        className={`dropzone${over ? " over" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {busy ? (
          <span>Processing stamp...</span>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Company stamp preview" className="stamp-preview" />
        ) : (
          <span>
            <strong>Drop the company stamp image here</strong>
            <br />
            or click to choose a photo / scan (PNG, JPG). The white background is removed automatically.
          </span>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {value && !busy && (
        <div className="toolbar" style={{ marginTop: 8 }}>
          <span className="muted">This is how the stamp will appear on the form.</span>
          <button type="button" className="secondary" onClick={() => onChange(null)}>Remove stamp</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
