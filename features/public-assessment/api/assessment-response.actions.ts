"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { tenantDatabaseConnections, tenants } from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentResponses,
  assessmentSessions,
  tenantAuditLog,
} from "@/drizzle/schema/tenant-schema";
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

export async function saveAssessmentResponsesAction(
  _previousState: SaveAssessmentResponsesState,
  formData: FormData,
): Promise<SaveAssessmentResponsesState> {
  const token = String(formData.get("token") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!token || !sessionId) {
    return {
      status: "error",
      message: "Brak danych sesji.",
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