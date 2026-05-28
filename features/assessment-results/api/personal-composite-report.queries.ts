// features/report-builder/api/personal-composite-report.queries.ts
import { and, desc, eq, isNull } from "drizzle-orm";

import {
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";

import {
  assessmentProjects,
  assessmentResultSnapshots,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";

import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";

function getDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ");

  return fullName || input.email || input.externalCode || "Respondent";
}



function normalizeSourceCode(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();

  return normalized || fallback;
}

function getSnapshotSourceCode(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallback;
  }

  const record = payload as Record<string, any>;

  return normalizeSourceCode(
    record.reportCode ??
    record.questionnaireCode ??
    record.questionnaire?.code ??
    record.session?.questionnaireCode ??
    record.projectQuestionnaire?.questionnaireCode,
    fallback,
  );
}


type CompositeSourceConfig = {
  slot: string;
  label: string;
  questionnaireId: string;
  questionnaireCode: string;
  questionnaireName: string;
  required: boolean;
};

type CompositeResolvedSource = CompositeSourceConfig & {
  available: boolean;
  assessmentSessionId: string | null;
  assessmentResultSnapshotId: string | null;
  completedAt: Date | null;
  frozenAt: Date | null;
  payload: unknown | null;
};

function asRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  return {};
}


function getSnapshotQuestionnaireMeta(payload: unknown) {
  const record = asRecord(payload);

  const questionnaires = Array.isArray(record.questionnaires)
    ? record.questionnaires
    : [];

  const firstQuestionnaire = asRecord(questionnaires[0]);

  const directQuestionnaire = asRecord(record.questionnaire);
  const session = asRecord(record.session);
  const projectQuestionnaire = asRecord(record.projectQuestionnaire);

  const questionnaireId =
    typeof firstQuestionnaire.questionnaireId === "string"
      ? firstQuestionnaire.questionnaireId
      : typeof directQuestionnaire.id === "string"
        ? directQuestionnaire.id
        : typeof session.questionnaireId === "string"
          ? session.questionnaireId
          : typeof projectQuestionnaire.questionnaireId === "string"
            ? projectQuestionnaire.questionnaireId
            : null;

  const questionnaireVersionId =
    typeof firstQuestionnaire.questionnaireVersionId === "string"
      ? firstQuestionnaire.questionnaireVersionId
      : typeof directQuestionnaire.versionId === "string"
        ? directQuestionnaire.versionId
        : typeof session.questionnaireVersionId === "string"
          ? session.questionnaireVersionId
          : typeof projectQuestionnaire.questionnaireVersionId === "string"
            ? projectQuestionnaire.questionnaireVersionId
            : null;

  const questionnaireCode = normalizeSourceCode(
    firstQuestionnaire.questionnaireCode ??
      directQuestionnaire.code ??
      session.questionnaireCode ??
      projectQuestionnaire.questionnaireCode ??
      record.questionnaireCode,
    "",
  );

  const questionnaireName =
    typeof firstQuestionnaire.questionnaireName === "string"
      ? firstQuestionnaire.questionnaireName
      : typeof directQuestionnaire.name === "string"
        ? directQuestionnaire.name
        : typeof projectQuestionnaire.questionnaireName === "string"
          ? projectQuestionnaire.questionnaireName
          : questionnaireCode || null;

  return {
    questionnaireId,
    questionnaireVersionId,
    questionnaireCode: questionnaireCode || null,
    questionnaireName,
  };
}

function readPersonalCompositeSourceConfig(
  dataBindings: unknown,
): CompositeSourceConfig[] {
  const bindings = asRecord(dataBindings);
  const sources = asRecord(bindings.sources);
  const personalReports = sources.personalReports;

  if (!Array.isArray(personalReports)) {
    return [];
  }

  return personalReports
    .map((item) => {
      const source = asRecord(item);

      return {
        slot: typeof source.slot === "string" ? source.slot : "",
        label: typeof source.label === "string" ? source.label : "",
        questionnaireId:
          typeof source.questionnaireId === "string"
            ? source.questionnaireId
            : "",
        questionnaireCode: normalizeSourceCode(source.questionnaireCode, ""),
        questionnaireName:
          typeof source.questionnaireName === "string"
            ? source.questionnaireName
            : "",
        required: Boolean(source.required),
      };
    })
    .filter(
      (source) =>
        source.slot && source.questionnaireId && source.questionnaireCode,
    );
}

function buildCompositeEligibility({
  configuredSources,
  resolvedSources,
}: {
  configuredSources: CompositeSourceConfig[];
  resolvedSources: CompositeResolvedSource[];
}) {
  if (configuredSources.length === 0) {
    return {
      status: "no_sources_configured" as const,
      canRender: false,
      warnings: ["Nie skonfigurowano źródeł raportu złożonego."],
      missingRequiredSources: [],
      missingOptionalSources: [],
    };
  }

  const missingRequiredSources = resolvedSources.filter(
    (source) => source.required && !source.available,
  );

  const missingOptionalSources = resolvedSources.filter(
    (source) => !source.required && !source.available,
  );

  if (missingRequiredSources.length > 0) {
    return {
      status: "missing_required_sources" as const,
      canRender: false,
      warnings: [
        "Brakuje wymaganych źródeł do wygenerowania raportu złożonego.",
      ],
      missingRequiredSources,
      missingOptionalSources,
    };
  }

  return {
    status: "ready" as const,
    canRender: true,
    warnings:
      missingOptionalSources.length > 0
        ? ["Niektóre opcjonalne źródła nie są dostępne."]
        : [],
    missingRequiredSources,
    missingOptionalSources,
  };
}

export type PersonalCompositeReportData = {
  tenant: {
    id: string;
    slug: string;
    name: string | null;
  };
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  respondent: {
    id: string;
    displayName: string;
    email: string | null;
    externalCode: string | null;
  };
  reportTemplateId: string;
  reportTemplateVersionId: string;
  reportTemplate: {
    id: string;
    code: string;
    name: string;
    kind: string;
    versionStatus: string;
  };
  eligibility: {
    status:
    | "ready"
    | "missing_required_sources"
    | "no_sources_configured";
    canRender: boolean;
    warnings: string[];
    missingRequiredSources: CompositeResolvedSource[];
    missingOptionalSources: CompositeResolvedSource[];
  };
  payload: any;
};

export async function getPersonalCompositeReport({
  tenantSlug,
  assessmentProjectId,
  respondentId,
  reportTemplateVersionId,
  previewMode = false,
}: {
  tenantSlug: string;
  assessmentProjectId: string;
  respondentId: string;
  reportTemplateVersionId: string;
  previewMode?: boolean;
}): Promise<PersonalCompositeReportData | null> {
  if (
    !tenantSlug ||
    !assessmentProjectId ||
    !respondentId ||
    !reportTemplateVersionId
  ) {
    return null;
  }

  const ctx = await requireTenantContext({ tenantSlug });
  requirePermission(ctx, "report:read");

  const templateVersionStatusCondition = previewMode
    ? undefined
    : eq(reportTemplateVersions.status, "active");

  const [templateVersion] = await ctx.controlDb
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
        eq(reportTemplateVersions.id, reportTemplateVersionId),
        templateVersionStatusCondition,
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .limit(1);

  if (!templateVersion || templateVersion.reportTemplateKind !== "personal_composite") {
    return null;
  }

  const configuredSources = readPersonalCompositeSourceConfig(
    templateVersion.dataBindings,
  );

  const db = await getTenantDb(ctx);
  const [subject] = await db
    .select({
      projectId: assessmentProjects.id,
      projectName: assessmentProjects.name,
      projectDescription: assessmentProjects.description,

      respondentId: respondents.id,
      respondentExternalCode: respondents.externalCode,

      respondentEmail: respondentIdentities.email,
      respondentFirstName: respondentIdentities.firstName,
      respondentLastName: respondentIdentities.lastName,
    })
    .from(respondents)
    .innerJoin(
      assessmentProjects,
      eq(assessmentProjects.id, assessmentProjectId),
    )
    .leftJoin(
      respondentIdentities,
      and(
        eq(respondentIdentities.respondentId, respondents.id),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .where(
      and(
        eq(respondents.id, respondentId),
        isNull(respondents.deletedAt),
        isNull(assessmentProjects.deletedAt),
      ),
    )
    .limit(1);

  if (!subject) {
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

      respondentId: respondents.id,
      respondentExternalCode: respondents.externalCode,

      respondentEmail: respondentIdentities.email,
      respondentFirstName: respondentIdentities.firstName,
      respondentLastName: respondentIdentities.lastName,

      snapshotId: assessmentResultSnapshots.id,
      snapshotPayload: assessmentResultSnapshots.payload,
      snapshotCreatedAt: assessmentResultSnapshots.createdAt,
    })
    .from(assessmentSessions)
    .innerJoin(
      assessmentProjects,
      eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
    )
    .innerJoin(respondents, eq(respondents.id, assessmentSessions.respondentId))
    .leftJoin(
      respondentIdentities,
      and(
        eq(respondentIdentities.respondentId, respondents.id),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .innerJoin(
      assessmentResultSnapshots,
      eq(assessmentResultSnapshots.assessmentSessionId, assessmentSessions.id),
    )
    .where(
      and(
        eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
        eq(assessmentSessions.respondentId, respondentId),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(respondents.deletedAt),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSessions.completedAt));


const availableSources = rows.map((row, index) => {
  const questionnaireMeta = getSnapshotQuestionnaireMeta(row.snapshotPayload);

  const code =
    questionnaireMeta.questionnaireCode ?? `SOURCE_${index + 1}`;

  return {
    code,
    questionnaireId: questionnaireMeta.questionnaireId,
    questionnaireVersionId: questionnaireMeta.questionnaireVersionId,
    questionnaireCode: questionnaireMeta.questionnaireCode,
    questionnaireName: questionnaireMeta.questionnaireName,

    assessmentSessionId: row.sessionId,
    assessmentResultSnapshotId: row.snapshotId,
    completedAt: row.sessionCompletedAt,
    frozenAt: row.snapshotCreatedAt,
    payload: row.snapshotPayload,
  };
});

const availableSourceByQuestionnaireId = new Map(
  availableSources
    .filter((source) => source.questionnaireId)
    .map((source) => [source.questionnaireId as string, source]),
);

const availableSourceByCode = new Map(
  availableSources
    .filter((source) => source.questionnaireCode || source.code)
    .map((source) => [source.questionnaireCode ?? source.code, source]),
);

  const resolvedSources: CompositeResolvedSource[] = configuredSources.map(
    (configuredSource) => {
      const matched =
  availableSourceByQuestionnaireId.get(configuredSource.questionnaireId) ??
  availableSourceByCode.get(configuredSource.questionnaireCode);

      return {
        ...configuredSource,
        available: Boolean(matched),
        assessmentSessionId: matched?.assessmentSessionId ?? null,
        assessmentResultSnapshotId:
          matched?.assessmentResultSnapshotId ?? null,
        completedAt: matched?.completedAt ?? null,
        frozenAt: matched?.frozenAt ?? null,
        payload: matched?.payload ?? null,
      };
    },
  );

  const eligibility = buildCompositeEligibility({
    configuredSources,
    resolvedSources,
  });

  const availableResolvedSources = resolvedSources.filter(
    (source) => source.available,
  );

  const sourcesBySlot = Object.fromEntries(
    resolvedSources.map((source) => [source.slot, source]),
  );

  const availableSourcesBySlot = Object.fromEntries(
    availableResolvedSources.map((source) => [source.slot, source]),
  );

  const availableSourcesByCode = Object.fromEntries(
    availableResolvedSources.map((source) => [
      source.questionnaireCode,
      source,
    ]),
  );

  const payload = {
    version: 1,
    reportKind: "personal_composite",
    tenantSlug: ctx.tenantSlug,
    frozenAt: new Date().toISOString(),

    project: {
      id: subject.projectId,
      name: subject.projectName,
      description: subject.projectDescription,
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
  sourceCount: resolvedSources?.length,
  availableSources: availableResolvedSources,

  bySlot: sourcesBySlot,
  availableBySlot: availableSourcesBySlot,
  availableByCode: availableSourcesByCode,

  
},

    sources: availableResolvedSources,

    primary: availableResolvedSources[0]?.payload ?? null,

    ...(availableResolvedSources[0]?.payload &&
      typeof availableResolvedSources[0].payload === "object"
      ? (availableResolvedSources[0].payload as Record<string, unknown>)
      : {}),
  };

  await writeTenantAuditLog({
    db,
    ctx,
    action: previewMode ? "report_previewed" : "report_viewed",
    entityType: "respondent",
    entityId: subject.respondentId,
    after: {
      assessmentProjectId,
      reportTemplateVersionId,
      accessMode: "tenant_partner",
      reportKind: "personal_composite",
      previewMode,
      eligibilityStatus: eligibility.status,
      sourceSessionIds: availableResolvedSources
        .map((source) => source.assessmentSessionId)
        .filter(Boolean),
      missingRequiredSourceCodes: eligibility.missingRequiredSources.map(
        (source) => source.questionnaireCode,
      ),
    },
  });

  return {
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      name: "tenantName" in ctx ? String(ctx.tenantName ?? "") : null,
    },
    project: {
      id: subject.projectId,
      name: subject.projectName,
      description: subject.projectDescription,
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
    reportTemplateId: templateVersion.reportTemplateId,
    reportTemplateVersionId,
    reportTemplate: {
      id: templateVersion.reportTemplateId,
      code: templateVersion.reportTemplateCode,
      name: templateVersion.reportTemplateName,
      kind: templateVersion.reportTemplateKind,
      versionStatus: templateVersion.status,
    },
    eligibility,
    payload,
  };
}