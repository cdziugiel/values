import Link from "next/link";
import {
  BarChart3,
  Building2,
  GitCompare,
  Layers3,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GrantPartnerReportAccessForm } from "./grant-partner-report-access-form";
import { TeamPartnerReportAccessControl } from "./team-partner-report-access-control";

type PartnerProjectReportsPanelProps = {
  tenantSlug: string;
  projectId: string;
  reports: any[];
  projectClientUnits: any[];
};

function getPartnerReportIcon(kind: string) {
  if (kind === "project_aggregate") {
    return <BarChart3 size={18} />;
  }

  if (kind === "organization_aggregate") {
    return <Building2 size={18} />;
  }

  if (kind === "team_aggregate") {
    return <UsersRound size={18} />;
  }

  if (kind === "comparison") {
    return <GitCompare size={18} />;
  }

  return <Layers3 size={18} />;
}

function getPartnerReportLabel(kind: string) {
  if (kind === "project_aggregate") {
    return "Raport projektu";
  }

  if (kind === "organization_aggregate") {
    return "Raport organizacji";
  }

  if (kind === "team_aggregate") {
    return "Raport zespołu";
  }

  if (kind === "comparison") {
    return "Raport porównawczy";
  }

  return "Raport partnera";
}

function getPartnerReportStatusLabel(report: any) {
  if (report.existingGrant) {
    return "Aktywny dostęp";
  }

  if (report.status === "ready") {
    return `Dostępne: ${report.availableCount}`;
  }

  if (report.status === "missing_pool") {
    return "Brak puli";
  }

  return "Niedostępny";
}

function getPartnerReportStatusClass(report: any) {
  if (report.existingGrant) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (report.status === "ready") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function buildComparisonConfigHref({
  tenantSlug,
  projectId,
  reportTemplateVersionId,
  productId,
}: {
  tenantSlug: string;
  projectId: string;
  reportTemplateVersionId: string;
  productId: string;
}) {
  return (
    `/t/${tenantSlug}/assessment-projects/${projectId}` +
    `/comparison/${reportTemplateVersionId}/configure` +
    `?product=${encodeURIComponent(productId)}`
  );
}

export function PartnerProjectReportsPanel({
  tenantSlug,
  projectId,
  reports,
  projectClientUnits,
}: PartnerProjectReportsPanelProps) {
  if (!reports?.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 px-5 py-4 text-sm leading-6 text-[#6b7280]">
        Brak aktywnych raportów partnera dla tego projektu.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {reports.map((report) => {
        const isComparison = report.reportTemplateKind === "comparison";

        return (
          <article
            key={report.reportTemplateVersionId}
            className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm"
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                    {getPartnerReportIcon(report.reportTemplateKind)}
                  </div>

                  <div className="min-w-0">
                    <div className="break-words font-semibold text-[#171717]">
                      {report.reportTemplateName}
                    </div>

                    <div className="mt-0.5 text-xs text-[#6b7280]">
                      {getPartnerReportLabel(report.reportTemplateKind)} ·
                      wersja: {report.reportTemplateVersionName} (
                      {report.reportTemplateVersion})
                    </div>
                  </div>

                  <span
                    className={[
                      "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                      getPartnerReportStatusClass(report),
                    ].join(" ")}
                  >
                    {getPartnerReportStatusLabel(report)}
                  </span>
                </div>

                {report.reportTemplateDescription ? (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">
                    {report.reportTemplateDescription}
                  </p>
                ) : null}

                {report.product ? (
                  <div className="mt-2 font-mono text-xs text-[#8b9099]">
                    Produkt: {report.product.code}
                  </div>
                ) : null}
              </div>

              <div className="flex min-w-[220px] justify-start md:justify-end">
                {report.reportTemplateKind === "team_aggregate" ? (
                  <TeamPartnerReportAccessControl
                    tenantSlug={tenantSlug}
                    projectId={projectId}
                    report={report}
                    units={projectClientUnits}
                  />
                ) : report.existingGrant && report.href ? (
                  <Button
                    asChild
                    className="rounded-full bg-[#171717] text-white shadow-sm hover:bg-[#2a2a2a]"
                  >
                    <Link href={report.href}>Otwórz raport</Link>
                  </Button>
                ) : isComparison && report.product ? (
                  <Button
                    asChild={report.canGrant}
                    disabled={!report.canGrant}
                    className="rounded-full bg-[#171717] text-white shadow-sm hover:bg-[#2a2a2a]"
                  >
                    {report.canGrant ? (
                      <Link
                        href={buildComparisonConfigHref({
                          tenantSlug,
                          projectId,
                          reportTemplateVersionId:
                            report.reportTemplateVersionId,
                          productId: report.product.id,
                        })}
                      >
                        Skonfiguruj porównanie
                      </Link>
                    ) : (
                      <span>Brak puli</span>
                    )}
                  </Button>
                ) : report.product && report.defaultSubject?.subjectId ? (
                  <GrantPartnerReportAccessForm
                    tenantSlug={tenantSlug}
                    assessmentProjectId={projectId}
                    productId={report.product.id}
                    reportTemplateVersionId={report.reportTemplateVersionId}
                    reportTemplateKind={report.reportTemplateKind}
                    subjectType={report.defaultSubject.subjectType}
                    subjectId={report.defaultSubject.subjectId}
                    disabled={!report.canGrant}
                  />
                ) : (
                  <Button disabled variant="outline" className="rounded-full">
                    Brak zakresu
                  </Button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}