// features/report-builder/components/report-template-version-editor-page.tsx

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui";

import { getReportTemplateVersionEditorData } from "../api/report-template-admin.queries";
import { listReportPreviewSessionOptions } from "../api/report-preview-session.queries";
import { ReportTemplateVersionEditForm } from "./report-template-version-edit-form";
import { ReportRealDataPreviewPicker } from "./report-real-data-preview-picker";

function statusLabel(status: string) {
  if (status === "active") return "Aktywny";
  if (status === "draft") return "Roboczy";
  if (status === "archived") return "Archiwalny";

  return status;
}

export async function ReportTemplateVersionEditorPage({
  reportTemplateId,
  reportTemplateVersionId,
}: {
  reportTemplateId: string;
  reportTemplateVersionId: string;
}) {
  const data = await getReportTemplateVersionEditorData({
    reportTemplateId,
    reportTemplateVersionId,
  });

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Nie znaleziono wersji raportu"
          description="Wersja template’u nie istnieje albo została zarchiwizowana."
        />

        <Button asChild variant="outline">
          <Link href={`/dashboard/report-templates/${reportTemplateId}`}>
            Wróć
          </Link>
        </Button>
      </div>
    );
  }

  const { version } = data;

  const previewSessions = await listReportPreviewSessionOptions({
    reportTemplateVersionId: version.reportTemplateVersionId,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Wersja raportu: ${version.name}`}
        description={`${version.reportTemplateName} · ${version.version}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ReportRealDataPreviewPicker
              reportTemplateVersionId={version.reportTemplateVersionId}
              sessions={previewSessions}
            />

            <Button asChild>
              <Link
                href={`/dashboard/report-builder/${version.reportTemplateVersionId}`}
              >
                Otwórz builder raportu
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`/dashboard/report-templates/${reportTemplateId}`}>
                Wróć do template’u
              </Link>
            </Button>
          </div>
        }
      />

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{statusLabel(version.status)}</Badge>

          {version.isDefault ? <Badge>Domyślna</Badge> : null}

          <Badge variant="outline">{version.pageSize}</Badge>

          <Badge variant="outline">
            {version.orientation === "portrait" ? "Pionowa" : "Pozioma"}
          </Badge>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Powiązana wersja kwestionariusza:{" "}
          <span className="font-medium text-foreground">
            {version.questionnaireVersionName}
          </span>{" "}
          ({version.questionnaireVersion})
        </p>
      </section>

      <ReportTemplateVersionEditForm version={version} />

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Treść raportu</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Strony A4, HTML/CSS/JS, warunki widoczności i komponenty
              aplikacyjne edytujesz w builderze raportu.
            </p>
          </div>

          <Button asChild>
            <Link
              href={`/dashboard/report-builder/${version.reportTemplateVersionId}`}
            >
              Przejdź do buildera
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}