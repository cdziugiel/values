import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Network } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { getTeamAggregateReport } from "@/features/assessment-results/api/aggregate-report.queries";
import { getReportTemplateVersionEditor } from "@/features/report-builder/api/report-builder.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
    unitId: string;
    reportTemplateVersionId: string;
  }>;
};

export default async function TeamAggregateReportPage({ params }: PageProps) {
  const { tenantSlug, projectId, unitId, reportTemplateVersionId } =
    await params;

  const [data, reportTemplateVersion] = await Promise.all([
    getTeamAggregateReport({
      tenantSlug,
      assessmentProjectId: projectId,
      clientUnitId: unitId,
      reportTemplateVersionId,
      previewMode: true,
    }),
    getReportTemplateVersionEditor({
      reportTemplateVersionId,
    }),
  ]);

  if (!data || !reportTemplateVersion) {
    notFound();
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
            Nie można wygenerować raportu zbiorczego zespołu
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Zespół: <strong>{data.unit?.name}</strong>
            <br />
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
            <div>
              Uwzględnione jednostki:{" "}
              <strong>{data.unit?.descendantUnitCount ?? 0}</strong>
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

  console.log("PAYLOAD", data.payload)
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
                Raport zbiorczy zespołu
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
                <Network className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  {data.unit?.name}
                </h1>

                <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                  Projekt: {data.project?.name} · respondenci:{" "}
                  {data.eligibility.nRespondents} · sesje:{" "}
                  {data.eligibility.nSessions} · wyniki:{" "}
                  {data.eligibility.nScores} · jednostki:{" "}
                  {data.unit?.descendantUnitCount ?? 0}
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
          title="Podgląd raportu zbiorczego zespołu"
          srcDoc={rendered.html}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      </section>
    </main>
  );
}