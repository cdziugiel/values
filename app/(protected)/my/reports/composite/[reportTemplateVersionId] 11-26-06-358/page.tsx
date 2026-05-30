import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";
import { ReportDocumentPreviewFrame } from "@/features/report-builder/components/report-document-preview-frame";

import {
  getActiveReportAccessGrantForSubject,
  resolveRespondentForCurrentUser,
} from "@/features/report-access/api/report-access.queries";

import { requireSession } from "@/server/auth/require-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    reportTemplateVersionId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
  }>;
};

type ReportPdfDownloadButtonProps = {
  tenantSlug: string;
  reportTemplateVersionId: string;
};

function ReportPdfDownloadButton({
  tenantSlug,
  reportTemplateVersionId,
}: ReportPdfDownloadButtonProps) {
  const href =
    `/my/reports/composite/${reportTemplateVersionId}/pdf` +
    `?tenant=${encodeURIComponent(tenantSlug)}`;

  return (
    <Button asChild>
      <a href={href} target="_blank" rel="noreferrer">
        Pobierz PDF
      </a>
    </Button>
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  const { reportTemplateVersionId } = await params;
  const { tenant } = await searchParams;

  if (!tenant) {
    notFound();
  }

  const authSession = await requireSession();

  const resolved = await resolveRespondentForCurrentUser({
    tenantSlug: tenant,
  });

  if (!resolved.ok) {
    notFound();
  }

  const grant = await getActiveReportAccessGrantForSubject({
    tenantSlug: tenant,
    subjectType: "respondent",
    subjectId: resolved.respondent.id,
    reportTemplateVersionId,
    userId: authSession.user.id,
  });

  if (!grant) {
    redirect(
      `/my/assessment/composite-reports/${reportTemplateVersionId}/unlock?tenant=${tenant}`,
    );
  }

  const [data, reportTemplateVersion] = await Promise.all([
    getPersonalCompositeReport({
      tenantSlug: tenant,
      respondentId: resolved.respondent.id,
      reportTemplateVersionId,
      previewMode: false,
    }),
    getReportTemplateVersionForRender({
      reportTemplateVersionId,
    }),
  ]);

  if (!data || !reportTemplateVersion) {
    notFound();
  }

  console.log("DATA", data)
  if (!data.eligibility.canRender) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-8">
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-start gap-3">
            <FileText className="mt-1 h-5 w-5 shrink-0" />

            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.04em]">
                Nie można wygenerować raportu złożonego
              </h1>

              <p className="mt-2 text-sm leading-6">
                Masz aktywny dostęp do raportu, ale brakuje wymaganych danych
                źródłowych. Najczęściej oznacza to, że jeden z wymaganych
                kwestionariuszy nie został jeszcze ukończony.
              </p>

              {data.eligibility.missingRequiredSources.length > 0 ? (
                <div className="mt-5 space-y-2">
                  {data.eligibility.missingRequiredSources.map((source) => (
                    <div
                      key={source.slot}
                      className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-sm"
                    >
                      <div className="font-semibold">
                        {source.questionnaireName}
                      </div>
                      <div className="mt-1 font-mono text-xs">
                        {source.questionnaireCode}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-6">
                <Button asChild variant="outline">
                  <Link href="/my/assessment">Wróć do moich badań</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: data.payload,
  });

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            HUMANET VALUES · Raport złożony
          </div>

          <h1 className="mt-1 text-3xl font-semibold">
            {reportTemplateVersion.name}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Widoczne strony: {rendered.visiblePages.length} · źródła:{" "}
            {data.payload?.composite?.availableSourceCount ?? 0}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ReportPdfDownloadButton
            tenantSlug={tenant}
            reportTemplateVersionId={reportTemplateVersionId}
          />

          <Link
            href="/my/assessment"
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do moich badań
          </Link>
        </div>
      </div>

      <ReportDocumentPreviewFrame html={rendered.html} />
    </main>
  );
}