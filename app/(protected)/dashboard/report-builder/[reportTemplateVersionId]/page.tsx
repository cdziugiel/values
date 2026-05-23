// app/(protected)/dashboard/report-builder/[reportTemplateVersionId]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import { getReportTemplateVersionEditor } from "@/features/report-builder/api/report-builder.queries";
import { ReportTemplateVersionEditor } from "@/features/report-builder/components/report-template-version-editor";
import { ReportConditionHelpDialog } from "@/features/report-builder";
import { ReportDataReferencePanel } from "@/features/report-builder/components/report-data-reference-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    reportTemplateVersionId: string;
  }>;
};

export default async function ReportBuilderPage({ params }: PageProps) {
  await requireSuperAdmin();

  const { reportTemplateVersionId } = await params;

  const reportTemplateVersion = await getReportTemplateVersionEditor({
    reportTemplateVersionId,
  });

  if (!reportTemplateVersion) {
    notFound();
  }

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            HUMANET VALUES · Kreator raportów
          </div>

          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">
                {reportTemplateVersion.reportTemplateName}
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {reportTemplateVersion.questionnaireName} ·{" "}
                {reportTemplateVersion.questionnaireVersionName} · wersja raportu:{" "}
                {reportTemplateVersion.version}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <ReportConditionHelpDialog />

          <ReportDataReferencePanel />
          <Button asChild variant="outline">
            <Link
              href={`/dashboard/report-templates/${reportTemplateVersion.reportTemplateId}/versions/${reportTemplateVersion.id}`}
            >
              Ustawienia wersji
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/dashboard/report-templates/${reportTemplateVersion.reportTemplateId}`}>
              Wróć do template’u
            </Link>
          </Button>
        </div>
      </div>

      <ReportTemplateVersionEditor reportTemplateVersion={reportTemplateVersion} />
    </div>
  );
}