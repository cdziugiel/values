// HUMANET_INSTALLER: comparison-report-ui-pdf-v1
// Wspólna, serwerowa ścieżka dostępu używana wyłącznie przez print/PDF raportu porównawczego.

import { and, eq, isNull, or } from "drizzle-orm";

import { reportAccessGrants } from "@/drizzle/schema";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

import {
  getUserVsUserComparisonReport,
  readComparisonDefinition,
} from "./comparison-report-render.queries";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function isGrantCurrentlyActive(grant: {
  status: string;
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  if (grant.status !== "active") return false;

  const now = new Date();

  if (grant.validFrom && grant.validFrom > now) return false;
  if (grant.validUntil && grant.validUntil < now) return false;

  return true;
}

export async function resolveMyComparisonReportGrantForRender({
  grantId,
}: {
  grantId: string;
}) {
  const session = await requireSession();
  const userId = session.user?.id;
  const email = normalizeEmail(session.user?.email);

  if (!grantId || !userId || !email) {
    return null;
  }

  const [grant] = await controlDb
    .select({
      id: reportAccessGrants.id,
      tenantSlug: reportAccessGrants.tenantSlug,
      status: reportAccessGrants.status,
      userId: reportAccessGrants.userId,
      email: reportAccessGrants.email,
      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,
      assessmentProjectId: reportAccessGrants.assessmentProjectId,
      reportTemplateId: reportAccessGrants.reportTemplateId,
      reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,
      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,
      metadata: reportAccessGrants.metadata,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.id, grantId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
        or(
          eq(reportAccessGrants.userId, userId),
          eq(reportAccessGrants.email, email),
        ),
      ),
    )
    .limit(1);

  if (!grant || !isGrantCurrentlyActive(grant)) {
    return null;
  }

  if (grant.subjectType !== "comparison") {
    return null;
  }

  if (!grant.assessmentProjectId || !grant.reportTemplateVersionId) {
    return null;
  }

  const comparisonDefinition = readComparisonDefinition(grant.metadata);

  if (!comparisonDefinition) {
    return null;
  }

  const [data, reportTemplateVersion] = await Promise.all([
    getUserVsUserComparisonReport({
      tenantSlug: grant.tenantSlug,
      assessmentProjectId: grant.assessmentProjectId,
      reportTemplateVersionId: grant.reportTemplateVersionId,
      comparisonDefinition,
    }),
    getReportTemplateVersionForRender({
      reportTemplateVersionId: grant.reportTemplateVersionId,
    }),
  ]);

  if (!data || !reportTemplateVersion) {
    return null;
  }

  return {
    grant,
    data,
    reportTemplateVersion,
  };
}
