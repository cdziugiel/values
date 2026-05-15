// features/my-assessment/api/my-assessment-session.actions.ts
"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";

import {
  assessmentSessions,
  respondentIdentities,
  respondents,
  tenantAuditLog,
} from "@/drizzle/schema/tenant-schema";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";

export type MyAssessmentSessionActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function ok(message: string): MyAssessmentSessionActionState {
  return {
    status: "success",
    message,
  };
}

function fail(error: unknown): MyAssessmentSessionActionState {
  return {
    status: "error",
    message:
      error instanceof Error
        ? error.message
        : "Operacja nie powiodła się.",
  };
}

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

async function resolveOwnedSession({
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
    throw new Error("Nie znaleziono tenanta badania.");
  }

  const rows = await tenant.db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
      respondentId: assessmentSessions.respondentId,
      respondentEmail: respondentIdentities.email,
      respondentArchivedAt: assessmentSessions.respondentArchivedAt,
    })
    .from(assessmentSessions)
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentSessions.respondentId),
    )
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

  const session = rows[0];

  if (!session) {
    throw new Error("Nie znaleziono sesji badania.");
  }

  if (normalizeEmail(session.respondentEmail) !== email) {
    throw new Error("Ta sesja badania nie należy do zalogowanego użytkownika.");
  }

  return {
    db: tenant.db,
    tenantSlug: tenant.tenantSlug,
    actorUserId: authSession.user.id,
    session,
  };
}

export async function cancelMyAssessmentSessionAction(
  _previousState: MyAssessmentSessionActionState,
  formData: FormData,
): Promise<MyAssessmentSessionActionState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!tenantSlug || !sessionId) {
    return {
      status: "error",
      message: "Brakuje danych sesji.",
    };
  }

  try {
    const { db, actorUserId, session } = await resolveOwnedSession({
      tenantSlug,
      sessionId,
    });

    if (
      session.sessionStatus !== "not_started" &&
      session.sessionStatus !== "in_progress"
    ) {
      throw new Error("Anulować można tylko badanie rozpoczęte lub nierozpoczęte.");
    }

    const now = new Date();

    await db
      .update(assessmentSessions)
      .set({
        status: "cancelled",
        cancelledAt: now,
        respondentArchivedAt: now,
        updatedAt: now,
        updatedBy: actorUserId,
      })
      .where(eq(assessmentSessions.id, sessionId));

    await db.insert(tenantAuditLog).values({
      actorUserId,
      actorRole: "RESPONDENT",
      action: "assessment_session_cancelled_by_respondent",
      entityType: "assessment_session",
      entityId: sessionId,
      before: {
        status: session.sessionStatus,
      },
      after: {
        status: "cancelled",
        cancelledAt: now.toISOString(),
        respondentArchivedAt: now.toISOString(),
      },
    });

    revalidatePath("/my/assessment");

    return ok("Badanie zostało anulowane.");
  } catch (error) {
    return fail(error);
  }
}

export async function archiveMyCompletedAssessmentSessionAction(
  _previousState: MyAssessmentSessionActionState,
  formData: FormData,
): Promise<MyAssessmentSessionActionState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!tenantSlug || !sessionId) {
    return {
      status: "error",
      message: "Brakuje danych sesji.",
    };
  }

  try {
    const { db, actorUserId, session } = await resolveOwnedSession({
      tenantSlug,
      sessionId,
    });

    if (session.sessionStatus !== "completed") {
      throw new Error("Archiwizować można tylko zakończone badanie.");
    }

    const now = new Date();

    await db
      .update(assessmentSessions)
      .set({
        respondentArchivedAt: now,
        updatedAt: now,
        updatedBy: actorUserId,
      })
      .where(eq(assessmentSessions.id, sessionId));

    await db.insert(tenantAuditLog).values({
      actorUserId,
      actorRole: "RESPONDENT",
      action: "assessment_session_archived_by_respondent",
      entityType: "assessment_session",
      entityId: sessionId,
      after: {
        respondentArchivedAt: now.toISOString(),
      },
    });

    revalidatePath("/my/assessment");

    return ok("Badanie zostało przeniesione do archiwum.");
  } catch (error) {
    return fail(error);
  }
}