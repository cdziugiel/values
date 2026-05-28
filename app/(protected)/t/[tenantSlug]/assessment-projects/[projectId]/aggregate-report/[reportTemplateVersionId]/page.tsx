// app/(protected)/t/[tenantSlug]/assessment-projects/[projectId]/aggregate-report/[reportTemplateVersionId]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { getProjectAggregateReport } from "@/features/assessment-results/api/aggregate-report.queries";
import { getReportTemplateVersionEditor } from "@/features/report-builder/api/report-builder.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
    reportTemplateVersionId: string;
  }>;
};

export default async function ProjectAggregateReportPage({
  params,
}: PageProps) {
  const { tenantSlug, projectId, reportTemplateVersionId } = await params;

  const [data, reportTemplateVersion] = await Promise.all([
    getProjectAggregateReport({
      tenantSlug,
      assessmentProjectId: projectId,
      reportTemplateVersionId,
      previewMode: true,
    }),
    getReportTemplateVersionEditor({
      reportTemplateVersionId,
    }),
  ]);

  if (!data || !reportTemplateVersion) {
  return (
    <main className="min-h-screen bg-[#f3f4f6] p-6">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[#171717]">
          Debug 404 raportu zbiorczego
        </h1>

        <pre className="mt-4 overflow-auto rounded-2xl bg-[#111827] p-4 text-xs leading-6 text-white">
          {JSON.stringify(
            {
              tenantSlug,
              projectId,
              reportTemplateVersionId,
              hasData: Boolean(data),
              hasReportTemplateVersion: Boolean(reportTemplateVersion),
              dataReportTemplateKind: data?.reportTemplate?.kind ?? null,
              dataEligibility: data?.eligibility ?? null,
              reportTemplateVersionKind:
                reportTemplateVersion?.reportTemplateKind ?? null,
              reportTemplateVersionStatus:
                reportTemplateVersion?.status ?? null,
            },
            null,
            2,
          )}
        </pre>
      </section>
    </main>
  );
}

  const backHref = `/t/${tenantSlug}/assessment-projects/${projectId}/results`;

  if (!data.eligibility.canRender) {
    return (
      <main className="min-h-screen bg-[#f3f4f6] p-6">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Wróć
              </Link>
            </Button>

            <Badge
              variant="outline"
              className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
            >
              {data.eligibility.status}
            </Badge>
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Nie można wygenerować raportu zbiorczego
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Projekt: <strong>{data.project?.name}</strong>
          </p>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div>
              Respondenci z wynikami:{" "}
              <strong>{data.eligibility.nRespondents}</strong>
            </div>
            <div>
              Minimalna liczebność:{" "}
              <strong>{data.eligibility.minimumN}</strong>
            </div>
            <div>
              Wyniki wymiarów: <strong>{data.eligibility.nScores}</strong>
            </div>
          </div>

          {data.eligibility.warnings.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-[#6b7280]">
              {data.eligibility.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
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
              <Button asChild variant="outline" size="sm">
                <Link href={backHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wróć
                </Link>
              </Button>

              <Badge
                variant="outline"
                className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
              >
                Raport zbiorczy
              </Badge>

              <Badge
                variant="outline"
                className="rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
              >
                {data.reportTemplate.kind}
              </Badge>

              {data.reportTemplate.versionStatus !== "active" ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
                >
                  Preview wersji {data.reportTemplate.versionStatus}
                </Badge>
              ) : null}
            </div>

            <div className="mt-3 flex items-start gap-3">
              <div className="mt-1 rounded-2xl border border-black/10 bg-white p-2 text-[#0f766e]">
                <BarChart3 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  {data.project?.name}
                </h1>

                <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                  Respondenci: {data.eligibility.nRespondents} · sesje:{" "}
                  {data.eligibility.nSessions} · wyniki:{" "}
                  {data.eligibility.nScores}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/report-builder/${reportTemplateVersionId}`}>
                Otwórz template w builderze
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link
                href={`/dashboard/report-templates/${data.reportTemplateId}/versions/${reportTemplateVersionId}`}
              >
                Ustawienia wersji
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="h-[calc(100vh-104px)]">
        <iframe
          title="Podgląd raportu zbiorczego"
          srcDoc={rendered.html}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      </section>
    </main>
  );
}