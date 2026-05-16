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
        assessmentSessionId: string;
        reportTemplateId: string;
        reportTemplateVersionId: string;
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

export async function assertCanViewMyAssessmentReport({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
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

  const grant = await controlDb.query.reportAccessGrants.findFirst({
    where: and(
      eq(reportAccessGrants.tenantSlug, tenantSlug),
      eq(reportAccessGrants.assessmentSessionId, sessionId),
      eq(reportAccessGrants.reportTemplateVersionId, reportTemplateVersionId),
      eq(reportAccessGrants.status, "active"),
      ownershipCondition,
      isNull(reportAccessGrants.deletedAt),
    ),
  });

  if (!grant) {
    return {
      ok: false,
      message: "Ten raport wymaga aktywnego dostępu.",
    };
  }

  if (!isGrantCurrentlyValid(grant)) {
    return {
      ok: false,
      message: "Dostęp do raportu wygasł albo nie jest jeszcze aktywny.",
    };
  }

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
    },
  };
}