// app/(protected)/t/[tenantSlug]/assessment-sessions/[sessionId]/report/[reportTemplateVersionId]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTenantAssessmentSessionReport } from "@/features/assessment-results/api/assessment-session-report.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { ReportDocumentPreviewFrame } from "@/features/report-builder/components/report-document-preview-frame";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";
import { getSuperAdminBuilderPreviewReport } from "@/features/report-builder/api/report-preview-real-session.queries";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    sessionId: string;
    reportTemplateVersionId: string;
  }>;

  searchParams: Promise<{
    projectQuestionnaireId?: string;
    questionnaireVersionId?: string;
    source?: string;
  }>;
};

type ReportScope = {
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
};

type TenantReportPdfDownloadButtonProps = ReportScope & {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
};

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();

  return normalized || null;
}

function buildReportSearchParams({
  projectQuestionnaireId,
  questionnaireVersionId,
}: ReportScope) {
  const searchParams = new URLSearchParams();

  if (projectQuestionnaireId) {
    searchParams.set(
      "projectQuestionnaireId",
      projectQuestionnaireId,
    );
  }

  if (questionnaireVersionId) {
    searchParams.set(
      "questionnaireVersionId",
      questionnaireVersionId,
    );
  }

  return searchParams;
}

function appendSearchParams(
  pathname: string,
  searchParams: URLSearchParams,
) {
  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function buildSessionResultsHref({
  tenantSlug,
  sessionId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: ReportScope & {
  tenantSlug: string;
  sessionId: string;
}) {
  const searchParams = buildReportSearchParams({
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  return appendSearchParams(
    `/t/${tenantSlug}/assessment-sessions/${sessionId}/results`,
    searchParams,
  );
}

function buildReportPdfHref({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: TenantReportPdfDownloadButtonProps) {
  const searchParams = buildReportSearchParams({
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  return appendSearchParams(
    `/t/${tenantSlug}` +
      `/assessment-sessions/${sessionId}` +
      `/report/${reportTemplateVersionId}/pdf`,
    searchParams,
  );
}

function TenantReportPdfDownloadButton({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: TenantReportPdfDownloadButtonProps) {
  const href = buildReportPdfHref({
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  return (
    <Button asChild>
      <a href={href} target="_blank" rel="noreferrer">
        Pobierz PDF
      </a>
    </Button>
  );
}

export default async function TenantAssessmentSessionReportPage({
  params,
  searchParams,
}: PageProps) {
  const {
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
  } = await params;

const {
  projectQuestionnaireId,
  questionnaireVersionId,
  source,
} = await searchParams;


  const normalizedProjectQuestionnaireId =
    normalizeOptionalString(projectQuestionnaireId);

  const normalizedQuestionnaireVersionId =
    normalizeOptionalString(questionnaireVersionId);

const isBuilderPreview = source === "builder-preview";

const result = isBuilderPreview
  ? await getSuperAdminBuilderPreviewReport({
      tenantSlug,
      sessionId,
      reportTemplateVersionId,
      projectQuestionnaireId:
        normalizedProjectQuestionnaireId,
      questionnaireVersionId:
        normalizedQuestionnaireVersionId,
    })
  : await getTenantAssessmentSessionReport({
      tenantSlug,
      sessionId,
      reportTemplateVersionId,
      projectQuestionnaireId:
        normalizedProjectQuestionnaireId,
      questionnaireVersionId:
        normalizedQuestionnaireVersionId,
    });

console.log("[TenantAssessmentSessionReportPage] report result", {
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  projectQuestionnaireId:
    normalizedProjectQuestionnaireId,
  questionnaireVersionId:
    normalizedQuestionnaireVersionId,
  hasResult: Boolean(result),
  hasPayload: Boolean(result?.payload),
});

if (!result?.payload) {
  const sessionResultsHref = buildSessionResultsHref({
    tenantSlug,
    sessionId,
    projectQuestionnaireId:
      normalizedProjectQuestionnaireId,
    questionnaireVersionId:
      normalizedQuestionnaireVersionId,
  });

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <AlertCircle className="size-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold">
              Nie można otworzyć raportu
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Nie znaleziono dostępu do tego raportu dla bieżącego
              użytkownika i wskazanej sesji.
            </p>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Raport może być przypisany do innej sesji, innego projektu
              badawczego lub innego tenanta. Sprawdź wybraną sesję albo
              przyznany zakres dostępu do raportu.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild>
                <Link href={sessionResultsHref}>
                  Wróć do wyników sesji
                </Link>
              </Button>

              <Button asChild variant="outline">
                <Link href={`/t/${tenantSlug}/dashboard`}>
                  Przejdź do panelu
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

const reportTemplateVersion =
  await getReportTemplateVersionForRender({
    reportTemplateVersionId,
  });

console.log("[TenantAssessmentSessionReportPage] template result", {
  reportTemplateVersionId,
  found: Boolean(reportTemplateVersion),
});

if (!reportTemplateVersion) {
  notFound();
}

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: result.payload,
  });

  const sessionResultsHref = buildSessionResultsHref({
    tenantSlug,
    sessionId,
    projectQuestionnaireId:
      normalizedProjectQuestionnaireId,
    questionnaireVersionId:
      normalizedQuestionnaireVersionId,
  });

  const projectResultsHref =
    `/t/${tenantSlug}` +
    `/assessment-projects/${result.project.id}/results`;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            HUMANET VALUES · Raport respondenta
          </div>
{isBuilderPreview ? (
  <div className="mb-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
    PODGLĄD BUILDERA · SUPERADMIN
  </div>
) : null}
          <h1 className="mt-1 text-3xl font-semibold">
            {result.respondent.displayName}
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Projekt: {result.project.name}
          </p>

          {result.respondent.email ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {result.respondent.email}
            </p>
          ) : null}

          <p className="mt-2 text-xs text-muted-foreground">
            Widoczne strony raportu:{" "}
            {rendered.visiblePages.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TenantReportPdfDownloadButton
            tenantSlug={tenantSlug}
            sessionId={sessionId}
            reportTemplateVersionId={
              reportTemplateVersionId
            }
            projectQuestionnaireId={
              normalizedProjectQuestionnaireId
            }
            questionnaireVersionId={
              normalizedQuestionnaireVersionId
            }
          />

          <Button asChild variant="outline">
            <Link href={sessionResultsHref}>
              Wróć do wyniku sesji
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={projectResultsHref}>
              Wróć do wyników projektu
            </Link>
          </Button>
        </div>
      </div>

      <ReportDocumentPreviewFrame html={rendered.html} />
    </main>
  );
}