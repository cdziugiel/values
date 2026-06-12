import { and, eq, isNull, or } from "drizzle-orm";

import { reportAccessGrants } from "@/drizzle/schema";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

export type ReportAccessGuardResult =
  | {
      ok: true;
      isSuperAdmin: boolean;
      grant: {
        id: string;
        source: string;
        tenantSlug: string;
        assessmentSessionId: string | null;
        reportTemplateId: string;
        reportTemplateVersionId: string;
        projectQuestionnaireId: string | null;
        questionnaireVersionId: string | null;
      } | null;
    }
  | {
      ok: false;
      message: string;
    };

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function normalizeOptionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readGrantProjectQuestionnaireId(metadata: unknown) {
  const record = asRecord(metadata);
  const scope = asRecord(record.reportScope);

  return (
    normalizeOptionalString(record.projectQuestionnaireId) ??
    normalizeOptionalString(scope.projectQuestionnaireId)
  );
}

function readGrantQuestionnaireVersionId(metadata: unknown) {
  const record = asRecord(metadata);
  const scope = asRecord(record.reportScope);

  return (
    normalizeOptionalString(record.questionnaireVersionId) ??
    normalizeOptionalString(scope.questionnaireVersionId)
  );
}

function getUserRole(session: unknown) {
  const raw = session as any;

  return (
    raw?.user?.role ??
    raw?.user?.systemRole ??
    raw?.user?.appRole ??
    raw?.user?.type ??
    null
  );
}

function isSuperAdminSession(session: unknown) {
  const role = getUserRole(session);

  return (
    role === "SUPER_ADMIN" ||
    role === "super_admin" ||
    role === "superadmin"
  );
}

function isGrantCurrentlyValid(grant: {
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  const now = new Date();

  if (grant.validFrom && grant.validFrom > now) {
    return false;
  }

  if (grant.validUntil && grant.validUntil < now) {
    return false;
  }

  return true;
}

function isGrantInRequestedScope({
  grant,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  grant: {
    metadata: unknown;
  };
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const grantProjectQuestionnaireId = readGrantProjectQuestionnaireId(
    grant.metadata,
  );

  const grantQuestionnaireVersionId = readGrantQuestionnaireVersionId(
    grant.metadata,
  );

  /**
   * Jeżeli raport jest wywołany ze scope, grant musi pasować do tego scope.
   */
  if (projectQuestionnaireId) {
    return grantProjectQuestionnaireId === projectQuestionnaireId;
  }

  if (questionnaireVersionId) {
    return grantQuestionnaireVersionId === questionnaireVersionId;
  }

  /**
   * Jeżeli scope nie został przekazany, nie dopasowujemy grantów scoped,
   * żeby przypadkiem nie otworzyć raportu dla innego kwestionariusza.
   * To zostawia kompatybilność tylko dla starych, legacy grantów bez scope.
   */
  return !grantProjectQuestionnaireId && !grantQuestionnaireVersionId;
}

export async function assertCanViewMyAssessmentReport({
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
}): Promise<ReportAccessGuardResult> {
  if (!tenantSlug || !sessionId || !reportTemplateVersionId) {
    return {
      ok: false,
      message: "Brakuje danych wymaganych do sprawdzenia dostępu do raportu.",
    };
  }

  const session = await requireSession();
  const userId = session.user.id;
  const email = normalizeEmail(session.user.email);

  if (isSuperAdminSession(session)) {
    return {
      ok: true,
      isSuperAdmin: true,
      grant: null,
    };
  }

  const ownershipCondition = email
    ? or(eq(reportAccessGrants.userId, userId), eq(reportAccessGrants.email, email))
    : eq(reportAccessGrants.userId, userId);

  const candidateGrants = await controlDb.query.reportAccessGrants.findMany({
    where: and(
      eq(reportAccessGrants.tenantSlug, tenantSlug),
      eq(reportAccessGrants.assessmentSessionId, sessionId),
      eq(reportAccessGrants.reportTemplateVersionId, reportTemplateVersionId),
      eq(reportAccessGrants.status, "active"),
      ownershipCondition,
      isNull(reportAccessGrants.deletedAt),
    ),
    limit: 50,
  });

  const grant =
    candidateGrants.find((candidateGrant) => {
      if (!isGrantCurrentlyValid(candidateGrant)) {
        return false;
      }

      return isGrantInRequestedScope({
        grant: candidateGrant,
        projectQuestionnaireId,
        questionnaireVersionId,
      });
    }) ?? null;

  if (!grant) {
    return {
      ok: false,
      message: "Ten raport wymaga aktywnego dostępu.",
    };
  }

  const grantProjectQuestionnaireId = readGrantProjectQuestionnaireId(
    grant.metadata,
  );

  const grantQuestionnaireVersionId = readGrantQuestionnaireVersionId(
    grant.metadata,
  );

  return {
    ok: true,
    isSuperAdmin: false,
    grant: {
      id: grant.id,
      source: grant.source,
      tenantSlug: grant.tenantSlug,
      assessmentSessionId: grant.assessmentSessionId,
      reportTemplateId: grant.reportTemplateId,
      reportTemplateVersionId: grant.reportTemplateVersionId,
      projectQuestionnaireId: grantProjectQuestionnaireId,
      questionnaireVersionId: grantQuestionnaireVersionId,
    },
  };
}