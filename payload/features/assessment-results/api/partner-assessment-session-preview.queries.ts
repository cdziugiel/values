import { and, eq, isNull } from "drizzle-orm";

import { assessmentResultSnapshots } from "@/drizzle/schema/tenant-schema";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import { getPartnerAssessmentSessionMaterials } from "./partner-assessment-session-materials.queries";

export async function getPartnerAssessmentSessionPreview({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const ctx = await requireTenantContext({ tenantSlug });

  requirePermission(ctx, "assessment_result:read");
  requirePermission(ctx, "report:read");

  const overview = await getPartnerAssessmentSessionMaterials({
    tenantSlug,
    sessionId,
  });

  if (
    !overview ||
    overview.session.status !== "completed" ||
    !overview.normativeDataAvailable
  ) {
    return null;
  }

  const material = overview.materials.find((candidate) => {
    if (
      candidate.reportTemplateVersionId !==
      reportTemplateVersionId
    ) {
      return false;
    }

    if (
      projectQuestionnaireId &&
      candidate.projectQuestionnaireId !==
        projectQuestionnaireId
    ) {
      return false;
    }

    if (
      questionnaireVersionId &&
      candidate.questionnaireVersionId !==
        questionnaireVersionId
    ) {
      return false;
    }

    return candidate.summaryHref !== null;
  });

  if (!material) {
    return null;
  }

  const db = await getTenantDb(ctx);

  const snapshotRows = await db
    .select({
      id: assessmentResultSnapshots.id,
      payload: assessmentResultSnapshots.payload,
    })
    .from(assessmentResultSnapshots)
    .where(
      and(
        eq(
          assessmentResultSnapshots.id,
          material.snapshotId,
        ),
        eq(
          assessmentResultSnapshots.assessmentSessionId,
          sessionId,
        ),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    )
    .limit(1);

  const snapshot = snapshotRows[0] ?? null;

  if (!snapshot?.payload) {
    return null;
  }

  await writeTenantAuditLog({
    db,
    ctx,
    action: "report_preview_viewed",
    entityType: "assessment_session",
    entityId: sessionId,
    after: {
      assessmentProjectId: overview.project.id,
      reportTemplateVersionId,
      snapshotId: snapshot.id,
      projectQuestionnaireId:
        material.projectQuestionnaireId,
      questionnaireId: material.questionnaireId,
      questionnaireVersionId:
        material.questionnaireVersionId,
      accessMode:
        "tenant_partner_normative_summary",
    },
  });

  return {
    tenant: overview.tenant,
    project: overview.project,
    session: overview.session,
    respondent: overview.respondent,
    material,
    payload: snapshot.payload,
  };
}
