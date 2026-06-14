import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Download,
  Network,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { reportAccessGrants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import {
  getProjectAggregateReport,
  getOrganizationAggregateReport,
  getTeamAggregateReport,
} from "@/features/assessment-results/api/aggregate-report.queries";
import {
  getUserVsUserComparisonReport,
  readComparisonDefinition,
} from "@/features/comparison-reports/api/comparison-report-render.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { renderReportDocument } from "@/features/report-builder/lib/report-template-renderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
    grantId: string;
  }>;
};

type PartnerReportPdfDownloadButtonProps = {
  tenantSlug: string;
  projectId: string;
  grantId: string;
};

function getReportBadgeLabel(subjectType: string) {
  if (subjectType === "assessment_project") {
    return "Raport projektu";
  }

  if (subjectType === "client_organization") {
    return "Raport organizacji";
  }

  if (subjectType === "client_unit") {
    return "Raport zespołu";
  }

  if (subjectType === "comparison") {
    return "Raport porównawczy";
  }

  return "Raport partnera";
}

function getReportIcon(subjectType: string) {
  if (subjectType === "client_organization") {
    return <Building2 className="h-5 w-5" />;
  }

  if (subjectType === "client_unit") {
    return <Network className="h-5 w-5" />;
  }

  return <BarChart3 className="h-5 w-5" />;
}

function getScopeName(data: any, subjectType: string) {
  if (subjectType === "client_organization") {
    return data.organization?.name ?? "Organizacja";
  }

  if (subjectType === "client_unit") {
    return data.unit?.name ?? "Zespół";
  }

  if (subjectType === "comparison") {
    const left =
      data.payload?.comparison?.left?.label ??
      "Pierwszy wynik";

    const right =
      data.payload?.comparison?.right?.label ??
      "Drugi wynik";

    return `${left} vs ${right}`;
  }

  return data.project?.name ?? "Projekt";
}

function getScopeDescription(
  data: any,
  subjectType: string,
) {
  if (subjectType === "comparison") {
    return [
      data.project?.name
        ? `Projekt: ${data.project.name}`
        : null,
      `porównywane wyniki: ${data.eligibility.nRespondents}`,
      `sesje: ${data.eligibility.nSessions}`,
      `wyniki: ${data.eligibility.nScores}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const parts = [
    data.project?.name
      ? `Projekt: ${data.project.name}`
      : null,
    `respondenci: ${data.eligibility.nRespondents}`,
    `sesje: ${data.eligibility.nSessions}`,
    `wyniki: ${data.eligibility.nScores}`,
  ];

  if (subjectType === "client_unit") {
    parts.push(
      `jednostki: ${
        data.unit?.descendantUnitCount ?? 0
      }`,
    );
  }

  return parts.filter(Boolean).join(" · ");
}

function buildPartnerReportPdfHref({
  tenantSlug,
  projectId,
  grantId,
}: PartnerReportPdfDownloadButtonProps) {
  return (
    `/t/${tenantSlug}` +
    `/assessment-projects/${projectId}` +
    `/partner-reports/${grantId}/pdf`
  );
}

function PartnerReportPdfDownloadButton({
  tenantSlug,
  projectId,
  grantId,
}: PartnerReportPdfDownloadButtonProps) {
  const href = buildPartnerReportPdfHref({
    tenantSlug,
    projectId,
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

export default async function PartnerAggregateReportGrantPage({
  params,
}: PageProps) {
  const {
    tenantSlug,
    projectId,
    grantId,
  } = await params;

  const [grant] = await controlDb
    .select({
      id: reportAccessGrants.id,
      tenantSlug: reportAccessGrants.tenantSlug,
      status: reportAccessGrants.status,

      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,

      assessmentProjectId:
        reportAccessGrants.assessmentProjectId,

      reportTemplateId:
        reportAccessGrants.reportTemplateId,

      reportTemplateVersionId:
        reportAccessGrants.reportTemplateVersionId,

      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,
      metadata: reportAccessGrants.metadata,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.id, grantId),
        eq(
          reportAccessGrants.tenantSlug,
          tenantSlug,
        ),
        eq(
          reportAccessGrants.assessmentProjectId,
          projectId,
        ),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    )
    .limit(1);

  if (
    !grant?.subjectType ||
    !grant.subjectId ||
    !grant.reportTemplateVersionId
  ) {
    notFound();
  }

  const now = new Date();

  if (
    grant.validFrom &&
    grant.validFrom > now
  ) {
    notFound();
  }

  if (
    grant.validUntil &&
    grant.validUntil < now
  ) {
    notFound();
  }

  const reportTemplateVersionId =
    grant.reportTemplateVersionId;

  const comparisonDefinition =
    grant.subjectType === "comparison"
      ? readComparisonDefinition(grant.metadata)
      : null;

  const data =
    grant.subjectType === "comparison"
      ? comparisonDefinition
        ? await getUserVsUserComparisonReport({
            tenantSlug,
            assessmentProjectId: projectId,
            reportTemplateVersionId,
            comparisonDefinition,
          })
        : null
      : grant.subjectType === "assessment_project"
        ? await getProjectAggregateReport({
            tenantSlug,
            assessmentProjectId: projectId,
            reportTemplateVersionId,
            previewMode: false,
          })
        : grant.subjectType ===
            "client_organization"
          ? await getOrganizationAggregateReport({
              tenantSlug,
              assessmentProjectId: projectId,
              clientOrganizationId:
                grant.subjectId,
              reportTemplateVersionId,
              previewMode: false,
            })
          : grant.subjectType === "client_unit"
            ? await getTeamAggregateReport({
                tenantSlug,
                assessmentProjectId:
                  projectId,
                clientUnitId: grant.subjectId,
                reportTemplateVersionId,
                previewMode: false,
              })
            : null;

  const reportTemplateVersion =
    await getReportTemplateVersionForRender({
      reportTemplateVersionId,
    });

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
          <div className="flex items-center gap-2">
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
              className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
            >
              {data.eligibility.status}
            </Badge>
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Nie można wygenerować raportu
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Zakres:{" "}
            <strong>
              {getScopeName(
                data,
                grant.subjectType,
              )}
            </strong>
          </p>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div>
              Respondenci z wynikami:{" "}
              <strong>
                {data.eligibility.nRespondents}
              </strong>
            </div>

            <div>
              Minimalna liczebność:{" "}
              <strong>
                {data.eligibility.minimumN}
              </strong>
            </div>

            <div>
              Wyniki wymiarów:{" "}
              <strong>
                {data.eligibility.nScores}
              </strong>
            </div>
          </div>

          {data.eligibility.warnings.length >
          0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-[#6b7280]">
              {data.eligibility.warnings.map(
                (warning: string) => (
                  <li key={warning}>
                    {warning}
                  </li>
                ),
              )}
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
                {getReportBadgeLabel(
                  grant.subjectType,
                )}
              </Badge>

              <Badge
                variant="outline"
                className="rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
              >
                dostęp: {grant.id}
              </Badge>
            </div>

            <div className="mt-3 flex items-start gap-3">
              <div className="mt-1 rounded-2xl border border-black/10 bg-white p-2 text-[#0f766e]">
                {getReportIcon(
                  grant.subjectType,
                )}
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  {getScopeName(
                    data,
                    grant.subjectType,
                  )}
                </h1>

                <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                  {getScopeDescription(
                    data,
                    grant.subjectType,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PartnerReportPdfDownloadButton
              tenantSlug={tenantSlug}
              projectId={projectId}
              grantId={grantId}
            />
          </div>
        </div>
      </header>

      <section className="h-[calc(100vh-104px)]">
        <iframe
          title={getReportBadgeLabel(
            grant.subjectType,
          )}
          srcDoc={rendered.html}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin"
        />
      </section>
    </main>
  );
}