// features/public-assessment/api/assessment-response.actions.ts
"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { tenantDatabaseConnections, tenants } from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentResponses,
  assessmentSessions,
  respondentIdentities,
  respondents,
  tenantAuditLog,
} from "@/drizzle/schema/tenant-schema";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";
import { decryptSecret } from "@/server/security/encryption";

export type SaveAssessmentResponsesState = {
  status: "idle" | "success" | "error";
  message: string;
};

type AssessmentResponseValuePayload =
  | {
    valueType: "number";
    numberValue: number;
    textValue: null;
    booleanValue: null;
    jsonValue: null;
  }
  | {
    valueType: "boolean";
    numberValue: null;
    textValue: null;
    booleanValue: boolean;
    jsonValue: null;
  }
  | {
    valueType: "text";
    numberValue: null;
    textValue: string;
    booleanValue: null;
    jsonValue: null;
  }
  | {
    valueType: "json";
    numberValue: null;
    textValue: null;
    booleanValue: null;
    jsonValue: string[];
  };

function parseBooleanValue(value: string) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function parseResponseFormKey(key: string) {
  const [, questionnaireId, questionnaireVersionId, itemId, itemCode, itemType] =
    key.split(":");

  if (
    !questionnaireId ||
    !questionnaireVersionId ||
    !itemId ||
    !itemCode ||
    !itemType
  ) {
    return null;
  }

  return {
    questionnaireId,
    questionnaireVersionId,
    itemId,
    itemCode,
    itemType,
  };
}

function buildResponseValue({
  itemType,
  values,
}: {
  itemType: string;
  values: FormDataEntryValue[];
}): AssessmentResponseValuePayload | null {
  if (itemType === "likert" || itemType === "number") {
    const rawValue = String(values[0] ?? "");
    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed)) {
      return null;
    }

    return {
      valueType: "number",
      numberValue: parsed,
      textValue: null,
      booleanValue: null,
      jsonValue: null,
    };
  }

  if (itemType === "true_false") {
    const parsed = parseBooleanValue(String(values[0] ?? ""));

    if (parsed === null) {
      return null;
    }

    return {
      valueType: "boolean",
      numberValue: null,
      textValue: null,
      booleanValue: parsed,
      jsonValue: null,
    };
  }

  if (itemType === "single_choice") {
    const rawValue = String(values[0] ?? "").trim();

    if (!rawValue) {
      return null;
    }

    return {
      valueType: "text",
      numberValue: null,
      textValue: rawValue,
      booleanValue: null,
      jsonValue: null,
    };
  }

  if (itemType === "multiple_choice") {
    const selectedValues = values
      .map((value) => String(value))
      .map((value) => value.trim())
      .filter(Boolean);

    if (selectedValues.length === 0) {
      return null;
    }

    return {
      valueType: "json",
      numberValue: null,
      textValue: null,
      booleanValue: null,
      jsonValue: selectedValues,
    };
  }

  if (itemType === "text") {
    const rawValue = String(values[0] ?? "").trim();

    if (!rawValue) {
      return null;
    }

    return {
      valueType: "text",
      numberValue: null,
      textValue: rawValue,
      booleanValue: null,
      jsonValue: null,
    };
  }

  return null;
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

  const db = getTenantDbByConnection({
    tenantId: connection.tenantId,
    databaseName: connection.databaseName,
    schemaVersion: Number(connection.schemaVersion ?? 0),
    databaseUrl,
  });

  return {
    db,
    tenantSlug: connection.tenantSlug,
  };
}

async function resolveMyAssessmentSessionForSaving({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  const authSession = await requireSession();
  const email = normalizeEmail(authSession.user.email);

  if (!email) {
    return {
      ok: false as const,
      message: "Konto użytkownika nie ma adresu e-mail.",
    };
  }

  const tenant = await getTenantDbBySlug(tenantSlug);

  if (!tenant) {
    return {
      ok: false as const,
      message: "Nie znaleziono tenanta badania.",
    };
  }

  const rows = await tenant.db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
      respondentId: assessmentSessions.respondentId,
      projectRespondentId: assessmentSessions.projectRespondentId,
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

  const session = rows[0];

  if (!session) {
    return {
      ok: false as const,
      message: "Nie znaleziono sesji badania.",
    };
  }

  if (normalizeEmail(session.respondentEmail) !== email) {
    return {
      ok: false as const,
      message: "Ta sesja badania nie należy do zalogowanego użytkownika.",
    };
  }

  return {
    ok: true as const,
    db: tenant.db,
    tenantSlug: tenant.tenantSlug,
    actorUserId: authSession.user.id,
    session,
  };
}

export async function saveAssessmentResponsesAction(
  _previousState: SaveAssessmentResponsesState,
  formData: FormData,
): Promise<SaveAssessmentResponsesState> {

  const token = String(formData.get("token") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const mode = String(formData.get("mode") ?? "token");
  const tenantSlug = String(formData.get("tenantSlug") ?? "");

  if (!sessionId) {
    return {
      status: "error",
      message: "Brak danych sesji.",
    };
  }

  if (mode === "my-assessment") {
    if (!tenantSlug) {
      return {
        status: "error",
        message: "Brakuje tenanta badania.",
      };
    }

    const resolved = await resolveMyAssessmentSessionForSaving({
      tenantSlug,
      sessionId,
    });

    if (!resolved.ok) {
      return {
        status: "error",
        message: resolved.message,
      };
    }

    const { db, session, actorUserId } = resolved;

    if (session.sessionStatus !== "in_progress") {
      return {
        status: "error",
        message: "Ta sesja nie jest aktywna.",
      };
    }

    const responseEntries = Array.from(formData.entries()).filter(([key]) =>
      key.startsWith("response:"),
    );

    const groupedResponseEntries = new Map<string, FormDataEntryValue[]>();

    for (const [key, value] of responseEntries) {
      const values = groupedResponseEntries.get(key) ?? [];
      values.push(value);
      groupedResponseEntries.set(key, values);
    }

    if (groupedResponseEntries.size === 0) {
      return {
        status: "error",
        message: "Brak odpowiedzi do zapisania.",
      };
    }

    const now = new Date();

    for (const [key, values] of groupedResponseEntries.entries()) {
      const parsedKey = parseResponseFormKey(key);

      if (!parsedKey) {
        continue;
      }

      const parsedValue = buildResponseValue({
        itemType: parsedKey.itemType,
        values,
      });

      if (!parsedValue) {
        continue;
      }

      const existing = await db.query.assessmentResponses.findFirst({
        where: and(
          eq(assessmentResponses.assessmentSessionId, session.sessionId),
          eq(assessmentResponses.questionnaireItemId, parsedKey.itemId),
        ),
      });

      if (existing) {
        await db
          .update(assessmentResponses)
          .set({
            valueType: parsedValue.valueType,
            numberValue: parsedValue.numberValue,
            textValue: parsedValue.textValue,
            booleanValue: parsedValue.booleanValue,
            jsonValue: parsedValue.jsonValue,
            deletedAt: null,
            updatedAt: now,
          })
          .where(eq(assessmentResponses.id, existing.id));
      } else {
        await db.insert(assessmentResponses).values({
          assessmentSessionId: session.sessionId,
          questionnaireId: parsedKey.questionnaireId,
          questionnaireVersionId: parsedKey.questionnaireVersionId,
          questionnaireItemId: parsedKey.itemId,
          itemCode: parsedKey.itemCode,
          valueType: parsedValue.valueType,
          numberValue: parsedValue.numberValue,
          textValue: parsedValue.textValue,
          booleanValue: parsedValue.booleanValue,
          jsonValue: parsedValue.jsonValue,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await db.insert(tenantAuditLog).values({
      actorUserId,
      actorRole: "RESPONDENT",
      action: "assessment_responses_saved",
      entityType: "assessment_session",
      entityId: session.sessionId,
      after: {
        responseCount: groupedResponseEntries.size,
        mode: "my-assessment",
      },
    });

    revalidatePath(`/my/assessment/sessions/${sessionId}`);

    return {
      status: "success",
      message: "Odpowiedzi zostały zapisane.",
    };
  }

  const tokenHash = hashAssessmentAccessToken(token);

  const activeTenantConnections = await controlDb
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
        eq(tenants.status, "active"),
        isNull(tenants.deletedAt),
        eq(tenantDatabaseConnections.migrationStatus, "success"),
      ),
    );

  for (const connection of activeTenantConnections) {
    let databaseUrl: string;

    try {
      databaseUrl = decryptSecret(connection.databaseUrlEncrypted);
    } catch {
      continue;
    }

    const db = getTenantDbByConnection({
      tenantId: connection.tenantId,
      databaseName: connection.databaseName,
      schemaVersion: Number(connection.schemaVersion ?? 0),
      databaseUrl,
    });

    const sessionRows = await db
      .select({
        sessionId: assessmentSessions.id,
        sessionStatus: assessmentSessions.status,
        accessLinkId: assessmentAccessLinks.id,
        assessmentProjectId: assessmentSessions.assessmentProjectId,
        respondentId: assessmentSessions.respondentId,
        projectRespondentId: assessmentSessions.projectRespondentId,
      })
      .from(assessmentSessions)
      .innerJoin(
        assessmentAccessLinks,
        eq(assessmentAccessLinks.id, assessmentSessions.accessLinkId),
      )
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentAccessLinks.tokenHash, tokenHash),
          eq(assessmentAccessLinks.status, "active"),
          isNull(assessmentSessions.deletedAt),
          isNull(assessmentAccessLinks.deletedAt),
        ),
      )
      .limit(1);

    const session = sessionRows[0];

    if (!session) {
      continue;
    }

    if (session.sessionStatus !== "in_progress") {
      return {
        status: "error",
        message: "Ta sesja nie jest aktywna.",
      };
    }

    const responseEntries = Array.from(formData.entries()).filter(([key]) =>
      key.startsWith("response:"),
    );

    const groupedResponseEntries = new Map<string, FormDataEntryValue[]>();

    for (const [key, value] of responseEntries) {
      const values = groupedResponseEntries.get(key) ?? [];
      values.push(value);
      groupedResponseEntries.set(key, values);
    }

    if (groupedResponseEntries.size === 0) {
      return {
        status: "error",
        message: "Brak odpowiedzi do zapisania.",
      };
    }

    const now = new Date();

    for (const [key, values] of groupedResponseEntries.entries()) {
      const parsedKey = parseResponseFormKey(key);

      if (!parsedKey) {
        continue;
      }

      const parsedValue = buildResponseValue({
        itemType: parsedKey.itemType,
        values,
      });

      if (!parsedValue) {
        continue;
      }

      const existing = await db.query.assessmentResponses.findFirst({
        where: and(
          eq(assessmentResponses.assessmentSessionId, session.sessionId),
          eq(assessmentResponses.questionnaireItemId, parsedKey.itemId),
        ),
      });

      if (existing) {
        await db
          .update(assessmentResponses)
          .set({
            valueType: parsedValue.valueType,
            numberValue: parsedValue.numberValue,
            textValue: parsedValue.textValue,
            booleanValue: parsedValue.booleanValue,
            jsonValue: parsedValue.jsonValue,
            deletedAt: null,
            updatedAt: now,
          })
          .where(eq(assessmentResponses.id, existing.id));
      } else {
        await db.insert(assessmentResponses).values({
          assessmentSessionId: session.sessionId,
          questionnaireId: parsedKey.questionnaireId,
          questionnaireVersionId: parsedKey.questionnaireVersionId,
          questionnaireItemId: parsedKey.itemId,
          itemCode: parsedKey.itemCode,
          valueType: parsedValue.valueType,
          numberValue: parsedValue.numberValue,
          textValue: parsedValue.textValue,
          booleanValue: parsedValue.booleanValue,
          jsonValue: parsedValue.jsonValue,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await db.insert(tenantAuditLog).values({
      actorUserId: null,
      actorRole: "PUBLIC_RESPONDENT",
      action: "assessment_responses_saved",
      entityType: "assessment_session",
      entityId: session.sessionId,
      after: {
        responseCount: groupedResponseEntries.size,
      },
    });

    revalidatePath(`/a/${token}/session/${sessionId}`);

    return {
      status: "success",
      message: "Odpowiedzi zostały zapisane.",
    };
  }

  return {
    status: "error",
    message: "Nie znaleziono aktywnej sesji badania.",
  };
}