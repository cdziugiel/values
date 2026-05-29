import { and, desc, eq, isNull, or } from "drizzle-orm";

import {
  reportAccessGrants,
  reportAccessProducts,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function isCurrentlyActive({
  status,
  validFrom,
  validUntil,
}: {
  status: string;
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  if (status !== "active") {
    return false;
  }

  const now = new Date();

  if (validFrom && validFrom > now) {
    return false;
  }

  if (validUntil && validUntil < now) {
    return false;
  }

  return true;
}

function buildReportHref(row: {
  id: string;
  status: string;
  tenantSlug: string;
  assessmentSessionId: string | null;
  subjectType: string;
  subjectId: string | null;
  reportTemplateKind: string;
  reportTemplateVersionId: string;
}) {
  if (row.status !== "active") {
    return null;
  }

  if (
    row.reportTemplateKind === "personal_composite" ||
    row.subjectType === "respondent"
  ) {
    return `/my/reports/composite/grants/${row.id}?tenant=${encodeURIComponent(
      row.tenantSlug,
    )}`;
  }

  if (!row.assessmentSessionId) {
    return null;
  }

  return (
    `/my/assessment/sessions/${row.assessmentSessionId}` +
    `/report/${row.reportTemplateVersionId}` +
    `?tenant=${encodeURIComponent(row.tenantSlug)}`
  );
}

export async function getMyReportAccesses() {
  const session = await requireSession();
  const email = normalizeEmail(session.user.email);

  const rows = await controlDb
    .select({
      id: reportAccessGrants.id,

      source: reportAccessGrants.source,
      status: reportAccessGrants.status,

      tenantSlug: reportAccessGrants.tenantSlug,

      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,

      assessmentSessionId: reportAccessGrants.assessmentSessionId,

      reportTemplateId: reportAccessGrants.reportTemplateId,
      reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,

      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,

      createdAt: reportAccessGrants.createdAt,

      productId: reportAccessProducts.id,
      productCode: reportAccessProducts.code,
      productName: reportAccessProducts.name,

      reportTemplateKind: reportTemplates.kind,
      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,

      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersion: reportTemplateVersions.version,
    })
    .from(reportAccessGrants)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportAccessGrants.reportTemplateId),
    )
    .innerJoin(
      reportTemplateVersions,
      eq(
        reportTemplateVersions.id,
        reportAccessGrants.reportTemplateVersionId,
      ),
    )
    .leftJoin(
      reportAccessProducts,
      eq(reportAccessProducts.id, reportAccessGrants.productId),
    )
    .where(
      and(
        isNull(reportAccessGrants.deletedAt),
        isNull(reportTemplates.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
        or(
          eq(reportAccessGrants.userId, session.user.id),
          email ? eq(reportAccessGrants.email, email) : undefined,
        ),
      ),
    )
    .orderBy(desc(reportAccessGrants.createdAt));

  return rows.map((row) => {
    const active = isCurrentlyActive({
      status: row.status,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
    });

    return {
      ...row,
      isCurrentlyActive: active,
      reportHref: active ? buildReportHref(row) : null,
    };
  });
}