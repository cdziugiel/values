// features/report-access/api/my-report-access.queries.ts
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { resolveRespondentForCurrentUser } from "./report-access.queries";
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

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
}

function isComparisonGrant(row: {
  subjectType: string;
  reportTemplateKind: string;
  metadata: unknown;
}) {
  const metadata = asRecord(row.metadata);

  return (
    row.reportTemplateKind === "comparison" ||
    row.subjectType === "comparison" ||
    metadata.reportKind === "comparison" ||
    metadata.mode === "comparison"
  );
}

function isUsedComparisonGrant(row: {
  subjectType: string;
  reportTemplateKind: string;
  metadata: unknown;
}) {
  const metadata = asRecord(row.metadata);

  return Boolean(
    isComparisonGrant(row) &&
      metadata.creditStatus === "used" &&
      metadata.comparisonDefinition,
  );
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
  productId: string | null;
  metadata: unknown;
}) {
  if (row.status !== "active") {
    return null;
  }

  /**
   * Raport porównawczy user-user.
   *
   * Jeśli grant jest wykorzystany, prowadzi do gotowego raportu.
   * Jeśli grant jest niewykorzystany, prowadzi do konfiguratora porównania.
   */
  if (isComparisonGrant(row)) {
    if (isUsedComparisonGrant(row)) {
      return `/my/assessment/comparison-reports/grants/${row.id}`;
    }

    if (!row.productId || !row.reportTemplateVersionId) {
      return null;
    }

    return `/my/assessment/compare?product=${encodeURIComponent(
      row.productId,
    )}&reportTemplateVersionId=${encodeURIComponent(
      row.reportTemplateVersionId,
    )}`;
  }

  const metadata = asRecord(row.metadata);

  if (
    row.reportTemplateKind === "personal_composite" ||
    metadata.reportKind === "personal_composite"
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

  /**
   * Pobieramy:
   * 1. granty przypisane bezpośrednio do userId,
   * 2. granty przypisane do e-maila,
   * 3. granty przypisane do respondenta.
   *
   * Granty respondentów zostaną niżej zweryfikowane względem
   * respondenta zalogowanego użytkownika w konkretnym tenant DB.
   */
  const candidateRows = await controlDb
    .select({
      id: reportAccessGrants.id,

      source: reportAccessGrants.source,
      status: reportAccessGrants.status,

      tenantSlug: reportAccessGrants.tenantSlug,

      userId: reportAccessGrants.userId,
      email: reportAccessGrants.email,

      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,

      assessmentSessionId: reportAccessGrants.assessmentSessionId,

      reportTemplateId: reportAccessGrants.reportTemplateId,
      reportTemplateVersionId:
        reportAccessGrants.reportTemplateVersionId,

      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,

      createdAt: reportAccessGrants.createdAt,

      productId: reportAccessGrants.productId,
      productCode: reportAccessProducts.code,
      productName: reportAccessProducts.name,

      reportTemplateKind: reportTemplates.kind,
      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,

      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersion: reportTemplateVersions.version,

      metadata: reportAccessGrants.metadata,
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

          email
            ? eq(reportAccessGrants.email, email)
            : undefined,

          /**
           * To są na razie kandydaci.
           * Niżej sprawdzimy, czy subjectId rzeczywiście należy
           * do zalogowanego użytkownika w danym tenancie.
           */
          eq(reportAccessGrants.subjectType, "respondent"),
        ),
      ),
    )
    .orderBy(desc(reportAccessGrants.createdAt));

  /**
   * Rozwiązujemy respondenta tylko w tenantach, w których istnieją
   * kandydackie granty subjectType=respondent.
   */
  const respondentTenantSlugs = Array.from(
    new Set(
      candidateRows
        .filter(
          (row) =>
            row.subjectType === "respondent" &&
            Boolean(row.subjectId),
        )
        .map((row) => row.tenantSlug)
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        ),
    ),
  );

  const respondentContextResults = await Promise.all(
    respondentTenantSlugs.map(async (tenantSlug) => {
      const resolved = await resolveRespondentForCurrentUser({
        tenantSlug,
      });

      if (!resolved.ok) {
        return {
          ok: false as const,
          tenantSlug,
        };
      }

      return {
        ok: true as const,
        tenantSlug,
        respondentId: resolved.respondent.id,
      };
    }),
  );

  /**
   * respondentId jest lokalny dla konkretnego tenant DB,
   * dlatego klucz musi zawierać również tenantSlug.
   */
  const ownedRespondentSubjectKeys = new Set(
    respondentContextResults
      .filter(
        (
          result,
        ): result is Extract<
          (typeof respondentContextResults)[number],
          { ok: true }
        > => result.ok,
      )
      .map(
        (result) =>
          `${result.tenantSlug}:${result.respondentId}`,
      ),
  );

  const rows = candidateRows.filter((row) => {
    const directlyAssignedToUser =
      row.userId === session.user.id;

    const rowEmail = normalizeEmail(row.email);

    const directlyAssignedToEmail =
      Boolean(email) &&
      Boolean(rowEmail) &&
      rowEmail === email;

    const assignedToOwnedRespondent =
      row.subjectType === "respondent" &&
      Boolean(row.subjectId) &&
      ownedRespondentSubjectKeys.has(
        `${row.tenantSlug}:${row.subjectId}`,
      );

    return (
      directlyAssignedToUser ||
      directlyAssignedToEmail ||
      assignedToOwnedRespondent
    );
  });

  console.log("MY_REPORT_ACCESS_OWNERSHIP_RESOLUTION", {
    userId: session.user.id,
    email,
    respondentTenantSlugs,
    respondentContexts: respondentContextResults,
    candidateGrantIds: candidateRows.map((row) => row.id),
    visibleGrantIds: rows.map((row) => row.id),
    visibleCompositeGrants: rows
      .filter(
        (row) =>
          row.reportTemplateKind === "personal_composite",
      )
      .map((row) => ({
        id: row.id,
        tenantSlug: row.tenantSlug,
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        userId: row.userId,
        email: row.email,
      })),
  });

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


