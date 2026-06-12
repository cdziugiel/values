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
        eq(reportAccessGrants.subjectType, "respondent"),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
        or(
          or(
            eq(reportAccessGrants.userId, authSession.user.id),
            normalizeEmail(authSession.user.email)
                ? eq(reportAccessGrants.email, normalizeEmail(authSession.user.email)!)
                : undefined,
            ),
          email ? eq(reportAccessGrants.email, email) : undefined,
        ),
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

const selectedSessionIds = Array.isArray(frozenSelection.selectedSources)
  ? frozenSelection.selectedSources
      .map((source: any) => source?.assessmentSessionId ?? source?.sessionId)
      .filter((value: unknown): value is string => typeof value === "string")
  : [];

console.log("MY_COMPOSITE_REPORT_QUERY_SELECTED_SESSION_IDS", {
  tenantSlug,
  grantId,
  selectedSessionIdsCount: selectedSessionIds.length,
  selectedSessionIds,
});
if (selectedSessionIds.length === 0) {
  logNull("frozen_selection_has_no_selected_session_ids", {
    frozenSelection,
  });

  return null;
}

const tenantContext = await getMyAssessmentTenantDbBySlug(tenantSlug);


console.log("MY_COMPOSITE_REPORT_QUERY_TENANT_CONTEXT", {
  tenantSlug,
  grantId,
  hasTenantContext: Boolean(tenantContext),
  tenantId: tenantContext?.tenantId ?? null,
  tenantName: tenantContext?.tenantName ?? null,
});

if (!tenantContext) {
  logNull("tenant_context_not_found");
  return null;
}

const db = tenantContext.db;

  const respondentId = grant.subjectId;

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
        eq(respondentIdentities.respondentId, respondents.id),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .where(and(eq(respondents.id, respondentId), isNull(respondents.deletedAt)))
    .limit(1);
console.log("MY_COMPOSITE_REPORT_QUERY_SUBJECT", {
  tenantSlug,
  grantId,
  respondentId,
  hasSubject: Boolean(subject),
  subjectRespondentId: subject?.respondentId ?? null,
  subjectEmail: subject?.respondentEmail ?? null,
});
if (!subject) {
  logNull("respondent_subject_not_found", {
    respondentId,
  });

  return null;
}

  const rows = await db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      sessionCompletedAt: assessmentSessions.completedAt,

      projectId: assessmentProjects.id,
      projectName: assessmentProjects.name,
      projectDescription: assessmentProjects.description,

      sessionAssessmentProjectId: assessmentSessions.assessmentProjectId,

      snapshotId: assessmentResultSnapshots.id,
      snapshotPayload: assessmentResultSnapshots.payload,
      snapshotCreatedAt: assessmentResultSnapshots.createdAt,
    })
    .from(assessmentSessions)
    .innerJoin(
      assessmentProjects,
      eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
    )
    .innerJoin(
      assessmentResultSnapshots,
      eq(assessmentResultSnapshots.assessmentSessionId, assessmentSessions.id),
    )
    .where(
      and(
        eq(assessmentSessions.respondentId, respondentId),
        eq(assessmentSessions.status, "completed"),
        inArray(assessmentSessions.id, selectedSessionIds),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    );
console.log("MY_COMPOSITE_REPORT_QUERY_ROWS", {
  tenantSlug,
  grantId,
  respondentId,
  selectedSessionIds,
  rowsCount: rows.length,
  rows: rows.map((row) => ({
    sessionId: row.sessionId,
    sessionStatus: row.sessionStatus,
    sessionCompletedAt: row.sessionCompletedAt,
    projectId: row.projectId,
    projectName: row.projectName,
    snapshotId: row.snapshotId,
    snapshotCreatedAt: row.snapshotCreatedAt,
  })),
});


const frozenSourceBySessionId = new Map(
  Array.isArray(frozenSelection.selectedSources)
    ? frozenSelection.selectedSources
        .map((source: any) => {
          const sessionId = source?.assessmentSessionId ?? source?.sessionId;

          return sessionId ? [String(sessionId), source] : null;
        })
        .filter((entry): entry is [string, any] => Boolean(entry))
    : [],
);

const availableSources = rows.map((row, index) => {
  const questionnaireMeta = getSnapshotQuestionnaireMeta(row.snapshotPayload);
  const frozenSource = frozenSourceBySessionId.get(row.sessionId);

  const questionnaireId =
    frozenSource?.questionnaireId ??
    questionnaireMeta.questionnaireId ??
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
    questionnaireMeta.questionnaireCode ??
    `SOURCE_${index + 1}`;

  return {
    code,
    slot: frozenSource?.slot ?? code,

    assessmentProjectId: row.sessionAssessmentProjectId ?? null,
    assessmentProjectName: row.projectName ?? null,

    questionnaireId,
    questionnaireVersionId: questionnaireMeta.questionnaireVersionId,
    questionnaireCode,
    questionnaireName,

    assessmentSessionId: row.sessionId,
    assessmentResultSnapshotId: row.snapshotId,
    completedAt: row.sessionCompletedAt,
    frozenAt: row.snapshotCreatedAt,
    payload: row.snapshotPayload,
  };
});
console.log("MY_COMPOSITE_REPORT_QUERY_AVAILABLE_SOURCES", {
  tenantSlug,
  grantId,
  availableSourcesCount: availableSources.length,
  availableSources: availableSources.map((source) => ({
    slot: source.slot,
    code: source.code,
    assessmentSessionId: source.assessmentSessionId,
    assessmentResultSnapshotId: source.assessmentResultSnapshotId,
    questionnaireId: source.questionnaireId,
    questionnaireVersionId: source.questionnaireVersionId,
    questionnaireCode: source.questionnaireCode,
    questionnaireName: source.questionnaireName,
    hasPayload: Boolean(source.payload),
  })),
});
let resolvedSources = resolveCompositeSources({
  configuredSources,
  availableSources,
  sourceSelection: null,
  frozenSelection,
  assessmentProjectId: null,
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
  const availableBySessionId = new Map(
    availableSources.map((source: any) => [
      String(source.assessmentSessionId ?? ""),
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

    const sessionId =
      frozenSource?.assessmentSessionId ??
      frozenSource?.sessionId ??
      null;

    const availableSource =
      (sessionId ? availableBySessionId.get(String(sessionId)) : undefined) ??
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
    return null;
  }
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
    availableResolvedSources.map((source) => [source.questionnaireCode, source]),
  );

  const payload = {
    version: 1,
    reportKind: "personal_composite",
    tenantSlug,
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

    ...(availableResolvedSources[0]?.payload &&
    typeof availableResolvedSources[0].payload === "object"
      ? (availableResolvedSources[0].payload as Record<string, unknown>)
      : {}),
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