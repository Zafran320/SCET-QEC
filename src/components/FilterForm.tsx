"use client";

import { ReactNode, useRef } from "react";

/** Admin filter bar: dropdowns apply as soon as they change; the search box applies on Enter or "Filter". */
export default function FilterForm({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      method="GET"
      className="toolbar filters"
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") ref.current?.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
