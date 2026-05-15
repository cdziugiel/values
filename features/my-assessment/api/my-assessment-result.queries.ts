// features/my-assessment/api/my-assessment-result.queries.ts

import { and, eq, isNull } from "drizzle-orm";

import {
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
  assessmentResultSnapshots,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

async function getTenantDbBySlug(tenantSlug: string) {
  const rows = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      databaseName: tenantDatabaseConnections.databaseName,
      databaseUrlEncrypted: tenantDatabaseConnections.databaseUrlEncrypted,
      schemaVersion: tenantDatabaseConnections.schemaVersion,
    })
    .from(tenants)
    .innerJoin(
      tenantDatabaseConnections,
      eq(tenantDatabaseConnections.tenantId, tenants.id),
    )
    .where(
      and(
        eq(tenants.slug, tenantSlug),
        eq(tenants.status, "active"),
        isNull(tenants.deletedAt),
        eq(tenantDatabaseConnections.migrationStatus, "success"),
      ),
    )
    .limit(1);

  const connection = rows[0];

  if (!connection) {
    return null;
  }

  const databaseUrl = decryptSecret(connection.databaseUrlEncrypted);

  return {
    tenantSlug: connection.tenantSlug,
    db: getTenantDbByConnection({
      tenantId: connection.tenantId,
      databaseName: connection.databaseName,
      schemaVersion: Number(connection.schemaVersion ?? 0),
      databaseUrl,
    }),
  };
}

export async function getMyAssessmentCompletedResult({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  const authSession = await requireSession();
  const email = normalizeEmail(authSession.user.email);

  if (!email) {
    throw new Error("Konto użytkownika nie ma adresu e-mail.");
  }

  const tenant = await getTenantDbBySlug(tenantSlug);

  if (!tenant) {
    return null;
  }

  const ownershipRows = await tenant.db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      respondentEmail: respondentIdentities.email,
    })
    .from(assessmentSessions)
    .innerJoin(respondents, eq(respondents.id, assessmentSessions.respondentId))
    .innerJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, respondents.id),
    )
    .where(
      and(
        eq(assessmentSessions.id, sessionId),
        isNull(assessmentSessions.deletedAt),
        isNull(respondents.deletedAt),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .limit(1);

  const ownership = ownershipRows[0];

  if (!ownership) {
    return null;
  }

  if (normalizeEmail(ownership.respondentEmail) !== email) {
    throw new Error("Ta sesja badania nie należy do zalogowanego użytkownika.");
  }

  if (ownership.sessionStatus !== "completed") {
    throw new Error("Ta sesja nie została jeszcze zakończona.");
  }

  const snapshot =
    await tenant.db.query.assessmentResultSnapshots.findFirst({
      where: and(
        eq(assessmentResultSnapshots.assessmentSessionId, sessionId),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    });

  if (!snapshot) {
    return {
      tenantSlug: tenant.tenantSlug,
      sessionId,
      snapshot: null,
      payload: null,
    };
  }

  return {
    tenantSlug: tenant.tenantSlug,
    sessionId,
    snapshot,
    payload: snapshot.payload as any,
  };
}