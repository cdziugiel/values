import { and, desc, eq, isNull, or } from "drizzle-orm";

import {
  assessmentSessions,
  comparisonShares,
  respondentIdentities,
} from "@/drizzle/schema/tenant-schema";

import { requireSession } from "@/server/auth/require-session";
import { getMyAssessmentRuntime } from "@/features/my-assessment/api/my-assessment-runtime";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function isTokenCurrentlyActive(input: {
  status: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
}) {
  if (input.status !== "active") return false;
  if (input.revokedAt) return false;

  const now = new Date();

  if (input.expiresAt && input.expiresAt < now) {
    return false;
  }

  return true;
}

export async function listMyComparisonShares({
  tenantSlug,
  includeInactive = false,
}: {
  tenantSlug: string;
  includeInactive?: boolean;
}) {
  const session = await requireSession();
  const email = normalizeEmail(session.user?.email);

  if (!session.user?.id || !email) {
    return [];
  }

  const runtime = await getMyAssessmentRuntime({
    userId: session.user.id,
    tenantSlug,
  });

  if (!runtime) {
    return [];
  }

  const rows = await runtime.db
    .select({
      id: comparisonShares.id,

      respondentId: comparisonShares.respondentId,
      assessmentSessionId: comparisonShares.assessmentSessionId,


      status: comparisonShares.status,
      label: comparisonShares.label,
      allowedScope: comparisonShares.allowedScope,

      expiresAt: comparisonShares.expiresAt,
      revokedAt: comparisonShares.revokedAt,
      lastUsedAt: comparisonShares.lastUsedAt,

      isSingleUse: comparisonShares.isSingleUse,
      metadata: comparisonShares.metadata,

      createdAt: comparisonShares.createdAt,
      updatedAt: comparisonShares.updatedAt,

      assessmentSessionStatus: assessmentSessions.status,
      assessmentSessionCompletedAt: assessmentSessions.completedAt,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
    })
    .from(comparisonShares)
    .innerJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, comparisonShares.respondentId),
    )
    .innerJoin(
      assessmentSessions,
      eq(assessmentSessions.id, comparisonShares.assessmentSessionId),
    )
    .where(
      and(
        eq(respondentIdentities.email, email),
        includeInactive ? undefined : eq(comparisonShares.status, "active"),
        isNull(comparisonShares.deletedAt),
        isNull(respondentIdentities.deletedAt),
        isNull(assessmentSessions.deletedAt),
      ),
    )
    .orderBy(desc(comparisonShares.createdAt));

  return rows
    .map((row) => ({
      ...row,
      isCurrentlyActive: isTokenCurrentlyActive({
        status: row.status,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
      }),
    }))
    .filter((row) => includeInactive || row.isCurrentlyActive);
}