// features/report-builder/components/report-document-preview-frame.tsx
"use client";

import { FileText, Maximize2 } from "lucide-react";

type ReportDocumentPreviewFrameProps = {
  html: string;
};

export function ReportDocumentPreviewFrame({
  html,
}: ReportDocumentPreviewFrameProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-black/10 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <FileText size={18} />
          </div>

          <div>
            <div className="text-sm font-semibold text-[#171717]">
              Podgląd dokumentu raportu
            </div>
            <div className="mt-0.5 text-xs text-[#6b7280]">
              Renderowany HTML z aktualnej konfiguracji
            </div>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-[#6b7280]">
          <Maximize2 size={13} />
          Preview
        </div>
      </div>

      <div className="bg-[#f3f4f6] p-3 sm:p-5">
        <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-inner">
          <iframe
            title="Podgląd raportu"
            srcDoc={html}
            sandbox="allow-scripts"
            className="h-[85vh] w-full bg-[#f3f4f6]"
          />
        </div>
      </div>
    </section>
  );
}
