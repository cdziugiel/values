// app/(protected)/t/[tenantSlug]/assessment-projects/[projectId]/respondents/[respondentId]/composite-report/[grantId]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import {
  ArrowLeft,
  Download,
  FileText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { reportAccessGrants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";
import type { FrozenCompositeSelection } from "@/features/assessment-results/types/personal-composite-selection.types";
import { getReportTemplateVersionEditor } from "@/features/report-builder/api/report-builder.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
    respondentId: string;
    grantId: string;
  }>;
};

type CompositeReportPdfDownloadButtonProps = {
  tenantSlug: string;
  projectId: string;
  respondentId: string;
  grantId: string;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readFrozenSelection(
  metadata: unknown,
): FrozenCompositeSelection | null {
  const record = asRecord(metadata);
  const selection = record.compositeSelection;

  if (
    !selection ||
    typeof selection !== "object" ||
    Array.isArray(selection)
  ) {
    return null;
  }

  return selection as FrozenCompositeSelection;
}

function buildCompositeReportPdfHref({
  tenantSlug,
  projectId,
  respondentId,
  grantId,
}: CompositeReportPdfDownloadButtonProps) {
  return (
    `/t/${tenantSlug}` +
    `/assessment-projects/${projectId}` +
    `/respondents/${respondentId}` +
    `/composite-report/${grantId}/pdf`
  );
}

function CompositeReportPdfDownloadButton({
  tenantSlug,
  projectId,
  respondentId,
  grantId,
}: CompositeReportPdfDownloadButtonProps) {
  const href = buildCompositeReportPdfHref({
    tenantSlug,
    projectId,
    respondentId,
    grantId,
  });

  return (
    <Button asChild>
      <a href={href} target="_blank" rel="noreferrer">
        <Download className="mr-2 h-4 w-4" />
        Pobierz PDF
      </a>
    </Button>
  );
}

export default async function PartnerPersonalCompositeReportPage({
  params,
}: PageProps) {
  const {
    tenantSlug,
    projectId,
    respondentId,
    grantId,
  } = await params;

  const [grant] = await controlDb
    .select({
      id: reportAccessGrants.id,
      tenantSlug: reportAccessGrants.tenantSlug,
      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,
      assessmentProjectId:
        reportAccessGrants.assessmentProjectId,
      reportTemplateId:
        reportAccessGrants.reportTemplateId,
      reportTemplateVersionId:
        reportAccessGrants.reportTemplateVersionId,
      status: reportAccessGrants.status,
      metadata: reportAccessGrants.metadata,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.id, grantId),
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.subjectType, "respondent"),
        eq(reportAccessGrants.subjectId, respondentId),
        eq(
          reportAccessGrants.assessmentProjectId,
          projectId,
        ),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    )
    .limit(1);

  if (!grant || !grant.reportTemplateVersionId) {
    notFound();
  }

  const frozenSelection = readFrozenSelection(grant.metadata);

  if (!frozenSelection) {
    notFound();
  }

  const [data, reportTemplateVersion] = await Promise.all([
    getPersonalCompositeReport({
      tenantSlug,
      assessmentProjectId: projectId,
      respondentId,
      reportTemplateVersionId:
        grant.reportTemplateVersionId,
      frozenSelection,
      previewMode: true,
    }),

    getReportTemplateVersionEditor({
      reportTemplateVersionId:
        grant.reportTemplateVersionId,
    }),
  ]);

  if (!data || !reportTemplateVersion) {
    notFound();
  }

  const backHref =
    `/t/${tenantSlug}` +
    `/assessment-projects/${projectId}` +
    `/respondents`;

  if (!data.eligibility.canRender) {
    return (
      <main className="min-h-screen bg-[#f3f4f6] p-6">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-amber-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <Button asChild variant="outline" size="sm">
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Wróć
              </Link>
            </Button>
          </div>

          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Nie można wygenerować raportu złożonego
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Raport ma zapisany zamrożony wybór źródeł,
            ale część danych nie jest już dostępna albo
            nie spełnia warunków renderowania.
          </p>

          {data.eligibility.missingRequiredSources.length >
          0 ? (
            <div className="mt-5 space-y-3">
              {data.eligibility.missingRequiredSources.map(
                (source) => (
                  <div
                    key={source.slot}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                  >
                    <div className="font-semibold">
                      {source.questionnaireName}
                    </div>

                    <div className="mt-1 font-mono text-xs">
                      {source.questionnaireCode}
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: data.payload,
  });

  return (
    <main className="min-h-screen bg-[#f3f4f6]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
              >
                <Link href={backHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wróć
                </Link>
              </Button>

              <Badge
                variant="outline"
                className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
              >
                Raport złożony
              </Badge>

              <Badge
                variant="outline"
                className="rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
              >
                grant: {grant.id}
              </Badge>

              {data.reportTemplate.versionStatus !==
              "active" ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
                >
                  Preview wersji{" "}
                  {data.reportTemplate.versionStatus}
                </Badge>
              ) : null}
            </div>

            <div className="mt-3 flex items-start gap-3">
              <div className="mt-1 rounded-2xl border border-black/10 bg-white p-2 text-[#0f766e]">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  {data.respondent.displayName}
                </h1>

                <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                  {data.project?.name ??
                    "Raport złożony"}{" "}
                  · źródła:{" "}
                  {data.payload?.composite
                    ?.availableSourceCount ?? 0}{" "}
                  · tryb:{" "}
                  {data.payload?.composite?.selection
                    ?.mode ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CompositeReportPdfDownloadButton
              tenantSlug={tenantSlug}
              projectId={projectId}
              respondentId={respondentId}
              grantId={grantId}
            />

          </div>
        </div>
      </header>

      <section className="h-[calc(100vh-104px)]">
        <iframe
          title="Podgląd raportu złożonego"
          srcDoc={rendered.html}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      </section>
    </main>
  );
}