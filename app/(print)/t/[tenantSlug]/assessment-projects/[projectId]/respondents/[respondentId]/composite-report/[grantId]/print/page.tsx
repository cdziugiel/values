import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
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

export default async function PartnerCompositeReportPrintPage({
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

  if (!grant?.reportTemplateVersionId) {
    notFound();
  }

  const frozenSelection = readFrozenSelection(
    grant.metadata,
  );

  if (!frozenSelection) {
    notFound();
  }

  const [data, reportTemplateVersion] =
    await Promise.all([
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