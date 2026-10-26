"use client";

import { PrinterIcon } from "@/components/icons";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="a-btn">
      <PrinterIcon className="size-4" /> Print / Save PDF
    </button>
  );
}
