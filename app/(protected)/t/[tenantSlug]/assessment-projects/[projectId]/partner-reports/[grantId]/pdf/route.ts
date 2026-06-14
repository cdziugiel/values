import { and, eq, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";

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
import { renderReportPdfFromUrl } from "@/features/report-builder/lib/render-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
    grantId: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
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
    return new Response(
      "Brak dostępu do raportu.",
      {
        status: 403,
      },
    );
  }

  const now = new Date();

  if (
    grant.validFrom &&
    grant.validFrom > now
  ) {
    return new Response(
      "Dostęp do raportu nie jest jeszcze aktywny.",
      {
        status: 403,
      },
    );
  }

  if (
    grant.validUntil &&
    grant.validUntil < now
  ) {
    return new Response(
      "Dostęp do raportu wygasł.",
      {
        status: 403,
      },
    );
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

  if (!data || !data.eligibility.canRender) {
    return new Response(
      "Raport nie może zostać wygenerowany.",
      {
        status: 404,
      },
    );
  }

  const printUrl = new URL(
    `/t/${tenantSlug}` +
      `/assessment-projects/${projectId}` +
      `/partner-reports/${grantId}/print`,
    request.nextUrl.origin,
  );

  const pdf = await renderReportPdfFromUrl({
    url: printUrl.toString(),
    cookieHeader:
      request.headers.get("cookie") ??
      undefined,
  });

  const filename =
    `humanet-partner-report-` +
    `${grantId}.pdf`;

  return new Response(
    new Uint8Array(pdf),
    {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="${filename}"`,
        "Cache-Control":
          "private, no-store",
      },
    },
  );
}