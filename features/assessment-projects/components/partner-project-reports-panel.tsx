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
      {reports.map((report) => (
        <article
          key={report.reportTemplateVersionId}
          className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  {getPartnerReportIcon(report.reportTemplateKind)}
                </div>

                <div>
                  <div className="font-semibold text-[#171717]">
                    {report.reportTemplateName}
                  </div>

                  <div className="mt-0.5 text-xs text-[#6b7280]">
                    {getPartnerReportLabel(report.reportTemplateKind)} · wersja:{" "}
                    {report.reportTemplateVersionName} (
                    {report.reportTemplateVersion})
                  </div>
                </div>

                <span
                  className={[
                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                    report.status === "ready"
                      ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                      : "border-amber-200 bg-amber-50 text-amber-800",
                  ].join(" ")}
                >
                  {report.status === "ready"
                    ? `Dostępne: ${report.availableCount}`
                    : "Brak puli"}
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
        </article>
      ))}
    </div>
  );
}