import Link from "next/link";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { getSyntheticReportPreview } from "@/features/report-builder/api/report-preview-snapshot.queries";
import { SyntheticReportLivePreview } from "@/features/report-builder/components/synthetic-report-live-preview";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    reportTemplateVersionId: string;
    previewSnapshotId: string;
  }>;
};

export default async function SyntheticReportPreviewPage({
  params,
}: PageProps) {
  const {
    reportTemplateVersionId,
    previewSnapshotId,
  } = await params;

  const [preview, reportTemplateVersion] =
    await Promise.all([
      getSyntheticReportPreview({
        reportTemplateVersionId,
        previewSnapshotId,
      }),
      getReportTemplateVersionForRender({
        reportTemplateVersionId,
      }),
    ]);

  if (!preview || !reportTemplateVersion) {
    notFound();
  }

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: preview.payload,
  });

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            <FlaskConical size={14} />
            DANE TESTOWE · snapshot tymczasowy
          </div>

          <h1 className="mt-3 text-3xl font-semibold">
            Podgląd konfiguracji raportu
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Snapshot wygasa:{" "}
            {new Intl.DateTimeFormat("pl-PL", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(preview.expiresAt)}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Widoczne strony raportu:{" "}
            {rendered.visiblePages.length}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link
            href={`/dashboard/report-builder/${reportTemplateVersionId}`}
          >
            Wróć do buildera
          </Link>
        </Button>
      </div>

      <SyntheticReportLivePreview
  reportTemplateVersionId={
    reportTemplateVersionId
  }
  previewSnapshotId={previewSnapshotId}
  initialPayload={preview.payload}
  initialHtml={rendered.html}
/>
    </main>
  );
}
