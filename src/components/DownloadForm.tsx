"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Submits download buttons with fetch instead of a page navigation, so the admin sees errors
 * inline and the table refreshes afterwards (downloaded rows switch from "New" to their date).
 * Each button supplies its endpoint via formAction and may carry name/value (e.g. mode=next).
 */
export default function DownloadForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(form);
    if (submitter?.name) fd.set(submitter.name, submitter.value);
    const url = submitter?.formAction || form.action;

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.text()) || "Download failed.");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || "download";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      form.reset(); // clears ticked rows
      setMessage(`Downloaded ${filename}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <form method="POST" action="/api/admin/zip" onSubmit={onSubmit} aria-busy={busy}>
      {message && <p className="muted" role="status">{message}</p>}
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {children}
      </fieldset>
    </form>
  );
}
