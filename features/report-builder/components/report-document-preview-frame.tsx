// features/report-builder/components/report-document-preview-frame.tsx
"use client";

type ReportDocumentPreviewFrameProps = {
  html: string;
};

export function ReportDocumentPreviewFrame({
  html,
}: ReportDocumentPreviewFrameProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-muted/30">
      <iframe
        title="Podgląd raportu"
        srcDoc={html}
        sandbox="allow-scripts"
        className="h-[85vh] w-full bg-muted"
      />
    </div>
  );
}