// features/report-access/api/my-composite-report.queries.ts
import { and, eq, inArray, isNull, or } from "drizzle-orm";

import {
  reportAccessGrants,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";
import {
  assessmentProjects,
  assessmentResultSnapshots,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { getMyAssessmentTenantDbBySlug } from "@/features/my-assessment/api/my-assessment-tenant-db";
import { resolveRespondentForCurrentUser } from "./report-access.queries";
import {
  aggregateCompositeMergedDimensionScores,
  aggregateCompositeSourceDimensionScores,
  buildCompositeEligibility,
  getDisplayName,
  getSnapshotQuestionnaireMeta,
  readPersonalCompositeSourceConfig,
  resolveCompositeSources,
} from "@/features/assessment-results/api/personal-composite-report.queries";

import type { FrozenCompositeSelection } from "@/features/assessment-results/types/personal-composite-selection.types";

function buildFrozenSourceKey({
  tenantSlug,
  assessmentSessionId,
  projectQuestionnaireId,
}: {
  tenantSlug: string;
  assessmentSessionId: string;
  projectQuestionnaireId?: string | null;
}) {
  return [
    tenantSlug,
    assessmentSessionId,
    projectQuestionnaireId ?? "",
  ].join("::");
}

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readFrozenSelection(metadata: unknown): FrozenCompositeSelection | null {
  const record = asRecord(metadata);
  const selection = record.compositeSelection;

  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    return null;
  }

  return selection as FrozenCompositeSelection;
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
  if (status !== "active") return false;

  const now = new Date();

  if (validFrom && validFrom > now) return false;
  if (validUntil && validUntil < now) return false;

  return true;
}

export async function getMyPersonalCompositeReportByGrantForCurrentUser({
  tenantSlug,
  grantId,
}: {
  tenantSlug: string;
  grantId: string;
}) {

  const logNull = (reason: string, extra: Record<string, unknown> = {}) => {
    console.log("MY_COMPOSITE_REPORT_QUERY_RETURN_NULL", {
      reason,
      tenantSlug,
      grantId,
      ...extra,
    });
  };
  const authSession = await requireSession();
  const email = normalizeEmail(authSession.user.email);

  const [grant] = await controlDb
    .select({
      id: reportAccessGrants.id,
      tenantSlug: reportAccessGrants.tenantSlug,

      status: reportAccessGrants.status,
      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,

      userId: reportAccessGrants.userId,
      email: reportAccessGrants.email,

      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,

      reportTemplateId: reportAccessGrants.reportTemplateId,
      reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,

      metadata: reportAccessGrants.metadata,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.id, grantId),
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    )
    .limit(1);
  console.log("MY_COMPOSITE_REPORT_QUERY_GRANT", {
    tenantSlug,
    grantId,
    found: Boolean(grant),
    grantUserId: grant?.userId ?? null,
    grantEmail: grant?.email ?? null,
    subjectType: grant?.subjectType ?? null,
    subjectId: grant?.subjectId ?? null,
    reportTemplateId: grant?.reportTemplateId ?? null,
    reportTemplateVersionId: grant?.reportTemplateVersionId ?? null,
    status: grant?.status ?? null,
    validFrom: grant?.validFrom ?? null,
    validUntil: grant?.validUntil ?? null,
    metadataKeys:
      grant?.metadata && typeof grant.metadata === "object"
        ? Object.keys(grant.metadata as Record<string, unknown>)
        : null,
  });
  if (!grant) {
    logNull("grant_not_found_or_not_owned_by_current_user");
    return null;
  }


  const grantEmail = normalizeEmail(grant.email);

  const directlyOwnedByUser =
    Boolean(grant.userId) &&
    grant.userId === authSession.user.id;

  const directlyOwnedByEmail =
    Boolean(email) &&
    Boolean(grantEmail) &&
    email === grantEmail;

  let ownedByRespondent = false;

  if (
    grant.subjectType === "respondent" &&
    grant.subjectId
  ) {
    const resolved = await resolveRespondentForCurrentUser({
      tenantSlug,
    });

    ownedByRespondent =
      resolved.ok &&
      resolved.respondent.id === grant.subjectId;

    console.log("MY_COMPOSITE_REPORT_QUERY_OWNERSHIP", {
      grantId,
      tenantSlug,
      directlyOwnedByUser,
      directlyOwnedByEmail,
      ownedByRespondent,
      grantSubjectId: grant.subjectId,
      resolvedRespondentId: resolved.ok
        ? resolved.respondent.id
        : null,
    });
  }

  if (
    !directlyOwnedByUser &&
    !directlyOwnedByEmail &&
    !ownedByRespondent
  ) {
    logNull("grant_not_owned_by_current_user", {
      grantUserId: grant.userId,
      grantEmail,
      subjectType: grant.subjectType,
      subjectId: grant.subjectId,
    });

    return null;
  }

  if (
    !isCurrentlyActive({
      status: grant.status,
      validFrom: grant.validFrom,
      validUntil: grant.validUntil,
    })
  ) {
    return null;
  }

  if (!grant.subjectId) {
    logNull("missing_subject_id", {
      grant,
    });

    return null;
  }

  if (!grant.reportTemplateVersionId) {
    logNull("missing_report_template_version_id", {
      grant,
    });

    return null;
  }

  const respondentId = grant.subjectId;

const tenantContext =
  await getMyAssessmentTenantDbBySlug(tenantSlug);

console.log("MY_COMPOSITE_REPORT_QUERY_ANCHOR_TENANT", {
  tenantSlug,
  grantId,
  hasTenantContext: Boolean(tenantContext),
  respondentId,
});

if (!tenantContext) {
  logNull("anchor_tenant_context_not_found");
  return null;
}

const db = tenantContext.db;

const [subject] = await db
  .select({
    respondentId: respondents.id,
    respondentExternalCode: respondents.externalCode,

    respondentEmail: respondentIdentities.email,
    respondentFirstName: respondentIdentities.firstName,
    respondentLastName: respondentIdentities.lastName,
  })
  .from(respondents)
  .leftJoin(
    respondentIdentities,
    and(
      eq(
        respondentIdentities.respondentId,
        respondents.id,
      ),
      isNull(respondentIdentities.deletedAt),
    ),
  )
  .where(
    and(
      eq(respondents.id, respondentId),
      isNull(respondents.deletedAt),
    ),
  )
  .limit(1);

console.log("MY_COMPOSITE_REPORT_QUERY_SUBJECT", {
  tenantSlug,
  grantId,
  respondentId,
  hasSubject: Boolean(subject),
  subjectRespondentId:
    subject?.respondentId ?? null,
  subjectEmail:
    subject?.respondentEmail ?? null,
});

if (!subject) {
  logNull("respondent_subject_not_found", {
    respondentId,
  });

  return null;
}
  const frozenSelection = readFrozenSelection(grant.metadata);

  console.log("MY_COMPOSITE_REPORT_QUERY_FROZEN_SELECTION", {
    tenantSlug,
    grantId,
    hasFrozenSelection: Boolean(frozenSelection),
    mode: frozenSelection?.mode ?? null,
    selectedSourcesCount: Array.isArray(frozenSelection?.selectedSources)
      ? frozenSelection.selectedSources.length
      : null,
    selectedSources: Array.isArray(frozenSelection?.selectedSources)
      ? frozenSelection.selectedSources.map((source: any) => ({
        slot: source?.slot ?? null,
        questionnaireId: source?.questionnaireId ?? null,
        questionnaireCode: source?.questionnaireCode ?? null,
        assessmentSessionId: source?.assessmentSessionId ?? null,
      }))
      : null,
  });

  
  if (!frozenSelection) {
    logNull("missing_frozen_selection_in_grant_metadata", {
      metadata:
        grant.metadata && typeof grant.metadata === "object"
          ? grant.metadata
          : null,
    });

    return null;
  }


  const [templateVersion] = await controlDb
    .select({
      id: reportTemplateVersions.id,
      reportTemplateId: reportTemplateVersions.reportTemplateId,
      status: reportTemplateVersions.status,
      dataBindings: reportTemplateVersions.dataBindings,

      reportTemplateKind: reportTemplates.kind,
      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .where(
      and(
        eq(reportTemplateVersions.id, grant.reportTemplateVersionId),
        eq(reportTemplateVersions.status, "active"),
        eq(reportTemplates.status, "active"),
        eq(reportTemplates.kind, "personal_composite"),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .limit(1);

  if (!templateVersion) {
    return null;
  }

  const configuredSources = readPersonalCompositeSourceConfig(
    templateVersion.dataBindings,
  );


const frozenSources = Array.isArray(frozenSelection.selectedSources)
  ? frozenSelection.selectedSources
  : [];

if (frozenSources.length === 0) {
  logNull("frozen_selection_has_no_selected_sources", {
    frozenSelection,
  });

  return null;
}

const frozenSourcesByTenant = new Map<string, any[]>();

for (const source of frozenSources) {
  const sourceTenantSlug = String(
    source?.tenantSlug ?? tenantSlug,
  ).trim();

  const assessmentSessionId = String(
    source?.assessmentSessionId ??
      source?.sessionId ??
      "",
  ).trim();

  if (!sourceTenantSlug || !assessmentSessionId) {
    continue;
  }

  const existing =
    frozenSourcesByTenant.get(sourceTenantSlug) ?? [];

  existing.push({
    ...source,
    tenantSlug: sourceTenantSlug,
    assessmentSessionId,
  });

  frozenSourcesByTenant.set(
    sourceTenantSlug,
    existing,
  );
}

if (frozenSourcesByTenant.size === 0) {
  logNull("frozen_selection_has_no_valid_tenant_sources", {
    frozenSources,
  });

  return null;
}

console.log("MY_COMPOSITE_REPORT_QUERY_FROZEN_SOURCES", {
  grantId,
  anchorTenantSlug: tenantSlug,
  sources: frozenSources.map((source: any) => ({
    tenantSlug: source?.tenantSlug ?? tenantSlug,
    slot: source?.slot ?? null,
    assessmentSessionId:
      source?.assessmentSessionId ??
      source?.sessionId ??
      null,
    projectQuestionnaireId:
      source?.projectQuestionnaireId ?? null,
    snapshotId:
      source?.assessmentResultSnapshotId ??
      source?.snapshotId ??
      null,
  })),
});

const tenantSourceResults = await Promise.all(
  Array.from(frozenSourcesByTenant.entries()).map(
    async ([sourceTenantSlug, tenantSources]) => {
      const resolved =
        await resolveRespondentForCurrentUser({
          tenantSlug: sourceTenantSlug,
        });

      if (!resolved.ok) {
        return {
          ok: false as const,
          tenantSlug: sourceTenantSlug,
          message: resolved.message,
          rows: [],
        };
      }

      const selectedSessionIds = Array.from(
        new Set(
          tenantSources
            .map((source: any) =>
              String(
                source?.assessmentSessionId ??
                  source?.sessionId ??
                  "",
              ).trim(),
            )
            .filter(Boolean),
        ),
      );

      if (selectedSessionIds.length === 0) {
        return {
          ok: true as const,
          tenantSlug: sourceTenantSlug,
          respondentId: resolved.respondent.id,
          tenantContext: resolved.tenant,
          rows: [],
        };
      }



      const rows = await resolved.tenant.db
        .select({
          sessionId: assessmentSessions.id,
          sessionStatus: assessmentSessions.status,
          sessionCompletedAt:
            assessmentSessions.completedAt,

          sessionAssessmentProjectId:
            assessmentSessions.assessmentProjectId,

          projectId: assessmentProjects.id,
          projectName: assessmentProjects.name,
          projectDescription:
            assessmentProjects.description,

          snapshotId: assessmentResultSnapshots.id,

          snapshotProjectQuestionnaireId:
            assessmentResultSnapshots.projectQuestionnaireId,

          snapshotQuestionnaireId:
            assessmentResultSnapshots.questionnaireId,

          snapshotQuestionnaireVersionId:
            assessmentResultSnapshots.questionnaireVersionId,

          snapshotPayload:
            assessmentResultSnapshots.payload,

          snapshotCreatedAt:
            assessmentResultSnapshots.createdAt,
        })
        .from(assessmentSessions)
        .innerJoin(
          assessmentProjects,
          eq(
            assessmentProjects.id,
            assessmentSessions.assessmentProjectId,
          ),
        )
        .innerJoin(
          assessmentResultSnapshots,
          eq(
            assessmentResultSnapshots.assessmentSessionId,
            assessmentSessions.id,
          ),
        )
        .where(
          and(
            eq(
              assessmentSessions.respondentId,
              resolved.respondent.id,
            ),
            inArray(
              assessmentSessions.id,
              selectedSessionIds,
            ),
            isNull(assessmentSessions.deletedAt),
            isNull(assessmentProjects.deletedAt),
            isNull(
              assessmentResultSnapshots.deletedAt,
            ),
          ),
        );

const scopedRows = rows.filter((row) =>
  tenantSources.some((source: any) => {
    const sourceSnapshotId =
      String(
        source?.assessmentResultSnapshotId ??
          source?.snapshotId ??
          "",
      ).trim() || null;

    if (sourceSnapshotId) {
      return sourceSnapshotId === row.snapshotId;
    }

    const sourceSessionId = String(
      source?.assessmentSessionId ??
        source?.sessionId ??
        "",
    ).trim();

    if (!sourceSessionId || sourceSessionId !== row.sessionId) {
      return false;
    }

    const sourceProjectQuestionnaireId =
      String(
        source?.projectQuestionnaireId ?? "",
      ).trim() || null;

    if (sourceProjectQuestionnaireId) {
      return (
        sourceProjectQuestionnaireId ===
        row.snapshotProjectQuestionnaireId
      );
    }

    const sourceQuestionnaireVersionId =
      String(
        source?.questionnaireVersionId ?? "",
      ).trim() || null;

    if (sourceQuestionnaireVersionId) {
      return (
        sourceQuestionnaireVersionId ===
        row.snapshotQuestionnaireVersionId
      );
    }

    const snapshotsForSession = rows.filter(
      (candidate) => candidate.sessionId === sourceSessionId,
    );

    return snapshotsForSession.length === 1;
  }),
);

      return {
        ok: true as const,
        tenantSlug: sourceTenantSlug,
        respondentId: resolved.respondent.id,
        tenantContext: resolved.tenant,
        rows: scopedRows,
      };
    },
  ),
);

const failedTenantContexts =
  tenantSourceResults.filter(
    (
      result,
    ): result is Extract<
      (typeof tenantSourceResults)[number],
      { ok: false }
    > => !result.ok,
  );

console.log("MY_COMPOSITE_REPORT_QUERY_TENANT_SOURCES", {
  grantId,

  tenantContexts: tenantSourceResults.map((result) => ({
    ok: result.ok,
    tenantSlug: result.tenantSlug,
    rowsCount: result.rows.length,
    message: result.ok ? null : result.message,
  })),
});

const multiTenantRows = tenantSourceResults.flatMap(
  (result) =>
    result.ok
      ? result.rows.map((row) => ({
          ...row,
          tenantSlug: result.tenantSlug,
          respondentId: result.respondentId,
        }))
      : [],
);

if (multiTenantRows.length === 0) {
  logNull("no_frozen_source_snapshots_found", {
    failedTenantContexts,
    frozenSources,
  });

  return null;
}

const frozenSourceByKey = new Map<string, any>();

for (const source of frozenSources) {
  const sourceTenantSlug = String(
    source?.tenantSlug ?? tenantSlug,
  ).trim();

  const assessmentSessionId = String(
    source?.assessmentSessionId ??
      source?.sessionId ??
      "",
  ).trim();

  if (!sourceTenantSlug || !assessmentSessionId) {
    continue;
  }

  frozenSourceByKey.set(
    buildFrozenSourceKey({
      tenantSlug: sourceTenantSlug,
      assessmentSessionId,
      projectQuestionnaireId:
        source?.projectQuestionnaireId ?? null,
    }),
    source,
  );
}

const availableSources = multiTenantRows
  .map((row, index) => {
    const exactKey = buildFrozenSourceKey({
      tenantSlug: row.tenantSlug,
      assessmentSessionId: row.sessionId,
      projectQuestionnaireId:
        row.snapshotProjectQuestionnaireId ??
        null,
    });

    let frozenSource =
      frozenSourceByKey.get(exactKey) ?? null;

    if (!frozenSource) {
      frozenSource =
        frozenSources.find((source: any) => {
          const sourceTenantSlug = String(
            source?.tenantSlug ?? tenantSlug,
          ).trim();

          const sourceSessionId = String(
            source?.assessmentSessionId ??
              source?.sessionId ??
              "",
          ).trim();

          const sourceSnapshotId = String(
            source?.assessmentResultSnapshotId ??
              source?.snapshotId ??
              "",
          ).trim();

          return (
            sourceTenantSlug === row.tenantSlug &&
            sourceSessionId === row.sessionId &&
            (!sourceSnapshotId ||
              sourceSnapshotId === row.snapshotId)
          );
        }) ?? null;
    }

    if (!frozenSource) {
      return null;
    }

    const questionnaireMeta =
      getSnapshotQuestionnaireMeta(
        row.snapshotPayload,
      );

    const questionnaireId =
      frozenSource?.questionnaireId ??
      row.snapshotQuestionnaireId ??
      questionnaireMeta.questionnaireId ??
      null;

    const questionnaireVersionId =
      frozenSource?.questionnaireVersionId ??
      row.snapshotQuestionnaireVersionId ??
      questionnaireMeta.questionnaireVersionId ??
      null;

    const questionnaireCode =
      frozenSource?.questionnaireCode ??
      questionnaireMeta.questionnaireCode ??
      null;

    const questionnaireName =
      frozenSource?.questionnaireName ??
      questionnaireMeta.questionnaireName ??
      null;

    const code =
      frozenSource?.slot ??
      questionnaireCode ??
      `SOURCE_${index + 1}`;

    return {
      code,
      slot: frozenSource?.slot ?? code,

      tenantSlug: row.tenantSlug,

      assessmentProjectId:
        row.sessionAssessmentProjectId ?? null,

      assessmentProjectName:
        row.projectName ?? null,

      questionnaireId,
      questionnaireVersionId,
      questionnaireCode,
      questionnaireName,

      assessmentSessionId: row.sessionId,

      projectQuestionnaireId:
        row.snapshotProjectQuestionnaireId ??
        null,

      assessmentResultSnapshotId:
        row.snapshotId,

      completedAt:
        row.snapshotCreatedAt ??
        row.sessionCompletedAt ??
        null,

      frozenAt: row.snapshotCreatedAt,
      payload: row.snapshotPayload,
    };
  })
  .filter(
    (
      source,
    ): source is NonNullable<typeof source> =>
      Boolean(source),
  );

console.log("MY_COMPOSITE_REPORT_QUERY_AVAILABLE_SOURCES", {
  grantId,
  availableSourcesCount: availableSources.length,

  availableSources: availableSources.map(
    (source) => ({
      tenantSlug: source.tenantSlug,
      slot: source.slot,
      assessmentSessionId:
        source.assessmentSessionId,
      projectQuestionnaireId:
        source.projectQuestionnaireId,
      assessmentResultSnapshotId:
        source.assessmentResultSnapshotId,
      questionnaireId: source.questionnaireId,
      questionnaireVersionId:
        source.questionnaireVersionId,
      questionnaireCode:
        source.questionnaireCode,
      questionnaireName:
        source.questionnaireName,
      hasPayload: Boolean(source.payload),
    }),
  ),
});



  
  let resolvedSources = resolveCompositeSources({
    configuredSources,
    availableSources,
    sourceSelection: null,
    frozenSelection,
    assessmentProjectId: null,
  });
resolvedSources = resolvedSources.map((source: any) => {
  const matchedAvailableSource =
    availableSources.find((availableSource: any) => {
      if (
        source.assessmentResultSnapshotId &&
        availableSource.assessmentResultSnapshotId ===
          source.assessmentResultSnapshotId
      ) {
        return true;
      }

      if (
        source.slot &&
        availableSource.slot === source.slot
      ) {
        return true;
      }

      return (
        source.assessmentSessionId &&
        availableSource.assessmentSessionId ===
          source.assessmentSessionId &&
        (
          !source.projectQuestionnaireId ||
          availableSource.projectQuestionnaireId ===
            source.projectQuestionnaireId
        )
      );
    }) ?? null;

  return {
    ...source,

    tenantSlug:
      source.tenantSlug ??
      matchedAvailableSource?.tenantSlug ??
      null,

    projectQuestionnaireId:
      source.projectQuestionnaireId ??
      matchedAvailableSource?.projectQuestionnaireId ??
      null,

    assessmentResultSnapshotId:
      source.assessmentResultSnapshotId ??
      matchedAvailableSource?.assessmentResultSnapshotId ??
      null,

    payload:
      source.payload ??
      matchedAvailableSource?.payload ??
      null,
  };
});

  console.log("MY_COMPOSITE_REPORT_QUERY_RESOLVED_SOURCES", {
    tenantSlug,
    grantId,
    resolvedSourcesCount: resolvedSources.length,
    resolvedSources: resolvedSources.map((source) => ({
      slot: source.slot,
      required: source.required,
      available: source.available,
      questionnaireId: source.questionnaireId,
      questionnaireCode: source.questionnaireCode,
      questionnaireName: source.questionnaireName,
      assessmentSessionId: source.assessmentSessionId ?? null,
      assessmentResultSnapshotId: source.assessmentResultSnapshotId ?? null,
    })),
  });


  const needsFrozenSelectionFallback =
    resolvedSources.some((source: any) => source.required && !source.available) &&
    availableSources.length > 0 &&
    Array.isArray(frozenSelection.selectedSources);

  if (needsFrozenSelectionFallback) {
const availableByKey = new Map(
  availableSources.map((source: any) => [
    buildFrozenSourceKey({
      tenantSlug: source.tenantSlug,
      assessmentSessionId:
        source.assessmentSessionId,
      projectQuestionnaireId:
        source.projectQuestionnaireId ?? null,
    }),
    source,
  ]),
);



    const availableBySlot = new Map(
      availableSources.map((source: any) => [
        String(source.slot ?? source.code ?? ""),
        source,
      ]),
    );

    const frozenBySlot = new Map(
      frozenSelection.selectedSources.map((source: any) => [
        String(source.slot ?? ""),
        source,
      ]),
    );

    resolvedSources = configuredSources.map((configuredSource: any, index) => {
      const slot = String(configuredSource.slot ?? `source_${index + 1}`);
      const frozenSource = frozenBySlot.get(slot);

const sourceTenantSlug = String(
  frozenSource?.tenantSlug ?? tenantSlug,
).trim();

const sessionId =
  frozenSource?.assessmentSessionId ??
  frozenSource?.sessionId ??
  null;

const projectQuestionnaireId =
  frozenSource?.projectQuestionnaireId ?? null;

const sourceKey =
  sourceTenantSlug && sessionId
    ? buildFrozenSourceKey({
        tenantSlug: sourceTenantSlug,
        assessmentSessionId: String(sessionId),
        projectQuestionnaireId,
      })
    : null;

const availableSource =
  (sourceKey
    ? availableByKey.get(sourceKey)
    : undefined) ??
  availableBySlot.get(slot);

      return {
        ...configuredSource,

        slot,
        required: Boolean(configuredSource.required),
        available: Boolean(availableSource),

        assessmentSessionId: availableSource?.assessmentSessionId ?? sessionId,
        assessmentResultSnapshotId:
          availableSource?.assessmentResultSnapshotId ?? null,

        assessmentProjectId: availableSource?.assessmentProjectId ?? null,
        assessmentProjectName: availableSource?.assessmentProjectName ?? null,

        questionnaireId:
          configuredSource.questionnaireId ??
          availableSource?.questionnaireId ??
          frozenSource?.questionnaireId ??
          null,

        questionnaireVersionId:
          availableSource?.questionnaireVersionId ??
          frozenSource?.questionnaireVersionId ??
          null,

        questionnaireCode:
          configuredSource.questionnaireCode ??
          availableSource?.questionnaireCode ??
          frozenSource?.questionnaireCode ??
          null,

        questionnaireName:
          configuredSource.questionnaireName ??
          availableSource?.questionnaireName ??
          frozenSource?.questionnaireName ??
          null,

        completedAt:
          availableSource?.completedAt ??
          frozenSource?.completedAt ??
          null,

        frozenAt: availableSource?.frozenAt ?? null,
        payload: availableSource?.payload ?? null,

        candidates: [],
        tenantSlug:
  availableSource?.tenantSlug ??
  sourceTenantSlug ??
  null,

projectQuestionnaireId:
  availableSource?.projectQuestionnaireId ??
  projectQuestionnaireId ??
  null,
      };
    });

    console.log("MY_COMPOSITE_REPORT_QUERY_RESOLVED_SOURCES_FALLBACK", {
      tenantSlug,
      grantId,
      resolvedSources: resolvedSources.map((source: any) => ({
        slot: source.slot,
        required: source.required,
        available: source.available,
        questionnaireId: source.questionnaireId,
        questionnaireCode: source.questionnaireCode,
        assessmentSessionId: source.assessmentSessionId,
        assessmentResultSnapshotId: source.assessmentResultSnapshotId,
        hasPayload: Boolean(source.payload),
      })),
    });
  }
  const eligibility = buildCompositeEligibility({
    configuredSources,
    resolvedSources,
  });
  console.log("MY_COMPOSITE_REPORT_QUERY_ELIGIBILITY", {
    tenantSlug,
    grantId,
    status: eligibility.status,
    canRender: eligibility.canRender,
    missingRequiredSources: eligibility.missingRequiredSources.map((source) => ({
      slot: source.slot,
      questionnaireId: source.questionnaireId,
      questionnaireCode: source.questionnaireCode,
    })),
  });

  if (!eligibility.canRender) {
    logNull("eligibility_cannot_render", {
      eligibility,
    });

    return null;
  }
  const availableResolvedSources = resolvedSources.filter(
    (source) => source.available,
  );

  const mergedDimensionScores =
    aggregateCompositeMergedDimensionScores(availableResolvedSources);

  const sourceDimensionScores =
    aggregateCompositeSourceDimensionScores(availableResolvedSources);

  const sourcesBySlot = Object.fromEntries(
    resolvedSources.map((source) => [source.slot, source]),
  );

  const availableSourcesBySlot = Object.fromEntries(
    availableResolvedSources.map((source) => [source.slot, source]),
  );

const availableSourcesByCode = Object.fromEntries(
  availableResolvedSources
    .filter(
      (source) =>
        typeof source.questionnaireCode === "string" &&
        source.questionnaireCode.length > 0,
    )
    .map((source) => [
      source.questionnaireCode,
      source,
    ]),
);

  const primaryPayload =
  availableResolvedSources[0]?.payload &&
  typeof availableResolvedSources[0].payload === "object"
    ? (availableResolvedSources[0].payload as Record<string, unknown>)
    : {};

  const payload = {
      ...primaryPayload,

  version: 1,
  reportKind: "personal_composite",
  tenantSlug,

  tenantSlugs: Array.from(
    new Set(
      availableResolvedSources
        .map((source: any) => source.tenantSlug)
        .filter(Boolean),
    ),
  ),

  frozenAt: new Date().toISOString(),
    scope: {
      type: "respondent",
      respondentId,
      label: "Moje badania publiczne",
    },

    project: {
      id: null,
      name: "Moje badania publiczne",
      description: null,
    },

    respondent: {
      id: subject.respondentId,
      email: subject.respondentEmail,
      externalCode: subject.respondentExternalCode,
      displayName: getDisplayName({
        firstName: subject.respondentFirstName,
        lastName: subject.respondentLastName,
        email: subject.respondentEmail,
        externalCode: subject.respondentExternalCode,
      }),
    },

    composite: {
      status: eligibility.status,
      canRender: eligibility.canRender,
      warnings: eligibility.warnings,

      configuredSourceCount: configuredSources.length,
      availableSourceCount: availableResolvedSources.length,

      requiredSources: resolvedSources.filter((source) => source.required),
      optionalSources: resolvedSources.filter((source) => !source.required),

      missingRequiredSources: eligibility.missingRequiredSources,
      missingOptionalSources: eligibility.missingOptionalSources,

      sources: resolvedSources,
      sourceCount: resolvedSources.length,
      availableSources: availableResolvedSources,

      bySlot: sourcesBySlot,
      availableBySlot: availableSourcesBySlot,
      availableByCode: availableSourcesByCode,

      dimensionScores: {
        merged: mergedDimensionScores,
        bySource: sourceDimensionScores,
      },

      selection: {
        mode: frozenSelection.mode,
        frozen: frozenSelection,
        selectedSources: frozenSelection.selectedSources,
      },
    },

    sources: availableResolvedSources,

    primary: availableResolvedSources[0]?.payload ?? null,


  };

  return {
    tenant: {
      id: tenantContext.tenantId,
      slug: tenantContext.tenantSlug,
      name: tenantContext.tenantName,
    },
    project: null,
    respondent: payload.respondent,
    reportTemplateId: templateVersion.reportTemplateId,
    reportTemplateVersionId: grant.reportTemplateVersionId,
    reportTemplate: {
      id: templateVersion.reportTemplateId,
      code: templateVersion.reportTemplateCode,
      name: templateVersion.reportTemplateName,
      kind: templateVersion.reportTemplateKind,
      versionStatus: templateVersion.status,
    },
    eligibility,
    payload,
    grant: {
      id: grant.id,
      validFrom: grant.validFrom,
      validUntil: grant.validUntil,
    },
  };
}