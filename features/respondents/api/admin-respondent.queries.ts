// @humanet-respondent-directory-v1
// features/respondents/api/admin-respondent.queries.ts

import {
  and,
  count,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";

import {
  questionnaireVersions,
  questionnaires,
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
  assessmentProjects,
  assessmentResponses,
  assessmentResultSnapshots,
  assessmentSessions,
  clientOrganizations,
  clientUnits,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { writeSystemAuditLog } from "@/server/audit/write-system-audit-log";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";

import {
  deriveAdminQuestionnaireRuns,
  type AdminProgressResponseInput,
  type AdminProgressSessionInput,
  type AdminProgressSnapshotInput,
  type DerivedAdminQuestionnaireRun,
} from "../lib/admin-respondent-progress";
import type {
  AdminRespondentDirectoryData,
  AdminRespondentListItem,
  AdminRespondentQuestionnaireRun,
  AdminRespondentTenantReadError,
} from "../types/admin-respondent.types";

type TenantRespondentRow = {
  respondentId: string;
  externalCode: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  organizationName: string | null;
  unitName: string | null;
  createdAt: Date;
};

type TenantPayload = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  respondents: TenantRespondentRow[];
  sessions: AdminProgressSessionInput[];
  runs: DerivedAdminQuestionnaireRun[];
};

function safeTenantError(
  connection: {
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
  },
  message: string,
): AdminRespondentTenantReadError {
  return {
    tenantId: connection.tenantId,
    tenantSlug: connection.tenantSlug,
    tenantName: connection.tenantName,
    message,
  };
}

function shortId(value: string) {
  return value.length <= 8 ? value : value.slice(0, 8);
}

export async function listAdminRespondents(): Promise<AdminRespondentDirectoryData> {
  const admin = await requireSuperAdmin();

  const connections = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      databaseName: tenantDatabaseConnections.databaseName,
      databaseUrlEncrypted:
        tenantDatabaseConnections.databaseUrlEncrypted,
      migrationStatus: tenantDatabaseConnections.migrationStatus,
      schemaVersion: tenantDatabaseConnections.schemaVersion,
    })
    .from(tenants)
    .leftJoin(
      tenantDatabaseConnections,
      and(
        eq(tenantDatabaseConnections.tenantId, tenants.id),
        isNull(tenantDatabaseConnections.deletedAt),
      ),
    )
    .where(isNull(tenants.deletedAt));

  const payloads: TenantPayload[] = [];
  const tenantErrors: AdminRespondentTenantReadError[] = [];

  for (const connection of connections) {
    if (!connection.databaseName || !connection.databaseUrlEncrypted) {
      tenantErrors.push(
        safeTenantError(
          connection,
          "Brak skonfigurowanej bazy danych tenanta.",
        ),
      );
      continue;
    }

    if (connection.migrationStatus !== "success") {
      tenantErrors.push(
        safeTenantError(
          connection,
          `Baza tenanta nie jest gotowa (${connection.migrationStatus ?? "brak statusu"}).`,
        ),
      );
      continue;
    }

    try {
      const databaseUrl = decryptSecret(
        connection.databaseUrlEncrypted,
      );

      const db = getTenantDbByConnection({
        tenantId: connection.tenantId,
        databaseName: connection.databaseName,
        schemaVersion: Number(connection.schemaVersion ?? 0),
        databaseUrl,
      });

      /**
       * Audit zapisujemy PRZED odczytem tenant DB. Dzięki temu samo wejście
       * SUPER_ADMIN w zakres danych respondenta jest rejestrowane również
       * wtedy, gdy późniejszy odczyt bazy zakończy się błędem.
       * Nie zapisujemy PII ani danych psychometrycznych.
       */
      await writeSystemAuditLog({
        actorUserId: admin.id,
        tenantId: connection.tenantId,
        actorRole: "SUPER_ADMIN",
        action: "super_admin_tenant_respondents_read",
        entityType: "tenant",
        entityId: connection.tenantId,
        after: {
          scope: "admin_respondent_directory",
        },
      });

      const [
        respondentRows,
        sessionRows,
        responseRows,
        snapshotRows,
      ] = await Promise.all([
        db
          .select({
            respondentId: respondents.id,
            externalCode: respondents.externalCode,
            email: respondentIdentities.email,
            firstName: respondentIdentities.firstName,
            lastName: respondentIdentities.lastName,
            organizationName: clientOrganizations.name,
            unitName: clientUnits.name,
            createdAt: respondents.createdAt,
          })
          .from(respondents)
          .leftJoin(
            respondentIdentities,
            and(
              eq(respondentIdentities.respondentId, respondents.id),
              isNull(respondentIdentities.deletedAt),
            ),
          )
          .leftJoin(
            clientOrganizations,
            eq(clientOrganizations.id, respondents.clientOrganizationId),
          )
          .leftJoin(
            clientUnits,
            eq(clientUnits.id, respondents.clientUnitId),
          )
          .where(isNull(respondents.deletedAt)),

        db
          .select({
            sessionId: assessmentSessions.id,
            respondentId: assessmentSessions.respondentId,
            projectId: assessmentSessions.assessmentProjectId,
            projectName: assessmentProjects.name,
            sessionStatus: assessmentSessions.status,
            startedAt: assessmentSessions.startedAt,
            completedAt: assessmentSessions.completedAt,
          })
          .from(assessmentSessions)
          .leftJoin(
            assessmentProjects,
            eq(
              assessmentProjects.id,
              assessmentSessions.assessmentProjectId,
            ),
          )
          .where(isNull(assessmentSessions.deletedAt)),

        db
          .select({
            sessionId: assessmentResponses.assessmentSessionId,
            questionnaireId: assessmentResponses.questionnaireId,
            questionnaireVersionId:
              assessmentResponses.questionnaireVersionId,
            responseCount: count(assessmentResponses.id),
          })
          .from(assessmentResponses)
          .innerJoin(
            assessmentSessions,
            eq(
              assessmentSessions.id,
              assessmentResponses.assessmentSessionId,
            ),
          )
          .where(
            and(
              isNull(assessmentResponses.deletedAt),
              isNull(assessmentSessions.deletedAt),
            ),
          )
          .groupBy(
            assessmentResponses.assessmentSessionId,
            assessmentResponses.questionnaireId,
            assessmentResponses.questionnaireVersionId,
          ),

        db
          .select({
            sessionId:
              assessmentResultSnapshots.assessmentSessionId,
            questionnaireId:
              assessmentResultSnapshots.questionnaireId,
            questionnaireVersionId:
              assessmentResultSnapshots.questionnaireVersionId,
            createdAt: assessmentResultSnapshots.createdAt,
          })
          .from(assessmentResultSnapshots)
          .innerJoin(
            assessmentSessions,
            eq(
              assessmentSessions.id,
              assessmentResultSnapshots.assessmentSessionId,
            ),
          )
          .where(
            and(
              isNull(assessmentResultSnapshots.deletedAt),
              isNull(assessmentSessions.deletedAt),
            ),
          ),
      ]);

      const sessions: AdminProgressSessionInput[] =
        sessionRows.map((row) => ({
          sessionId: row.sessionId,
          respondentId: row.respondentId,
          projectId: row.projectId,
          projectName: row.projectName ?? null,
          sessionStatus: row.sessionStatus,
          startedAt: row.startedAt ?? null,
          completedAt: row.completedAt ?? null,
        }));

      const responses: AdminProgressResponseInput[] =
        responseRows.map((row) => ({
          sessionId: row.sessionId,
          questionnaireId: row.questionnaireId ?? null,
          questionnaireVersionId: row.questionnaireVersionId,
          responseCount: Number(row.responseCount ?? 0),
        }));

      const snapshots: AdminProgressSnapshotInput[] =
        snapshotRows.map((row) => ({
          sessionId: row.sessionId,
          questionnaireId: row.questionnaireId ?? null,
          questionnaireVersionId: row.questionnaireVersionId ?? null,
          createdAt: row.createdAt ?? null,
        }));

      const runs = deriveAdminQuestionnaireRuns({
        sessions,
        responses,
        snapshots,
      });

      payloads.push({
        tenantId: connection.tenantId,
        tenantSlug: connection.tenantSlug,
        tenantName: connection.tenantName,
        respondents: respondentRows.map((row) => ({
          respondentId: row.respondentId,
          externalCode: row.externalCode ?? null,
          email: row.email ?? null,
          firstName: row.firstName ?? null,
          lastName: row.lastName ?? null,
          organizationName: row.organizationName ?? null,
          unitName: row.unitName ?? null,
          createdAt: row.createdAt,
        })),
        sessions,
        runs,
      });
    } catch {
      tenantErrors.push(
        safeTenantError(
          connection,
          "Nie udało się bezpiecznie odczytać danych tego tenanta.",
        ),
      );
    }
  }

  const questionnaireVersionIds = Array.from(
    new Set(
      payloads.flatMap((payload) =>
        payload.runs.map((run) => run.questionnaireVersionId),
      ),
    ),
  );

  const questionnaireMetaRows =
    questionnaireVersionIds.length > 0
      ? await controlDb
          .select({
            questionnaireId: questionnaires.id,
            questionnaireCode: questionnaires.code,
            questionnaireName: questionnaires.name,
            questionnaireVersionId: questionnaireVersions.id,
            questionnaireVersion: questionnaireVersions.version,
          })
          .from(questionnaireVersions)
          .innerJoin(
            questionnaires,
            eq(
              questionnaires.id,
              questionnaireVersions.questionnaireId,
            ),
          )
          .where(
            inArray(
              questionnaireVersions.id,
              questionnaireVersionIds,
            ),
          )
      : [];

  const questionnaireMetaByVersionId = new Map(
    questionnaireMetaRows.map((row) => [
      row.questionnaireVersionId,
      row,
    ]),
  );

  const directoryRows: AdminRespondentListItem[] = [];

  for (const payload of payloads) {
    const runsByRespondentId = new Map<
      string,
      AdminRespondentQuestionnaireRun[]
    >();

    for (const run of payload.runs) {
      const meta =
        questionnaireMetaByVersionId.get(
          run.questionnaireVersionId,
        ) ?? null;

      const current =
        runsByRespondentId.get(run.respondentId) ?? [];

      current.push({
        projectId: run.projectId,
        projectName: run.projectName,
        questionnaireId:
          run.questionnaireId ?? meta?.questionnaireId ?? null,
        questionnaireVersionId: run.questionnaireVersionId,
        questionnaireCode: meta?.questionnaireCode ?? null,
        questionnaireName:
          meta?.questionnaireName ??
          `Kwestionariusz ${shortId(run.questionnaireVersionId)}`,
        questionnaireVersion:
          meta?.questionnaireVersion ?? null,
        status: run.status,
        responseCount: run.responseCount,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      });

      runsByRespondentId.set(run.respondentId, current);
    }

    const sessionIdsByRespondentId = new Map<string, Set<string>>();

    for (const session of payload.sessions) {
      const current =
        sessionIdsByRespondentId.get(session.respondentId) ??
        new Set<string>();

      current.add(session.sessionId);
      sessionIdsByRespondentId.set(session.respondentId, current);
    }

    for (const respondent of payload.respondents) {
      const questionnaireRuns = (
        runsByRespondentId.get(respondent.respondentId) ?? []
      ).sort((a, b) => {
        const aTime =
          a.completedAt?.getTime() ??
          a.startedAt?.getTime() ??
          0;
        const bTime =
          b.completedAt?.getTime() ??
          b.startedAt?.getTime() ??
          0;

        return bTime - aTime;
      });

      directoryRows.push({
        tenantId: payload.tenantId,
        tenantSlug: payload.tenantSlug,
        tenantName: payload.tenantName,
        respondentId: respondent.respondentId,
        externalCode: respondent.externalCode,
        email: respondent.email,
        firstName: respondent.firstName,
        lastName: respondent.lastName,
        organizationName: respondent.organizationName,
        unitName: respondent.unitName,
        createdAt: respondent.createdAt,
        sessionsCount:
          sessionIdsByRespondentId.get(respondent.respondentId)?.size ??
          0,
        questionnaireRuns,
      });
    }
  }

  directoryRows.sort((a, b) => {
    const tenantComparison = a.tenantName.localeCompare(
      b.tenantName,
      "pl",
      { sensitivity: "base", numeric: true },
    );

    if (tenantComparison !== 0) return tenantComparison;

    const aName =
      [a.lastName, a.firstName].filter(Boolean).join(" ") ||
      a.email ||
      a.externalCode ||
      "";
    const bName =
      [b.lastName, b.firstName].filter(Boolean).join(" ") ||
      b.email ||
      b.externalCode ||
      "";

    return aName.localeCompare(bName, "pl", {
      sensitivity: "base",
      numeric: true,
    });
  });

  return {
    respondents: directoryRows,
    tenantErrors,
    tenantCount: connections.length,
    readableTenantCount: payloads.length,
    generatedAt: new Date(),
  };
}
