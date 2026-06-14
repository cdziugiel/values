import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

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

export default async function PartnerAggregateReportPrintPage({
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

  if (
    !data ||
    !reportTemplateVersion ||
    !data.eligibility.canRender
  ) {
    notFound();
  }

  const rendered = renderReportDocument({
    reportTemplateVersion,
    payload: data.payload,
  });

  return (
    <main
      className="report-print-root"
      dangerouslySetInnerHTML={{
        __html: rendered.html,
      }}
    />
  );
}