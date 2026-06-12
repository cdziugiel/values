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


import type {
  FrozenCompositeSelection,
  PersonalCompositeSourceSelection,
} from "../types/personal-composite-selection.types";

export function getDisplayName(input: {
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

  selectionMode: "latest_completed" | "same_project" | "manual" | "frozen";
  candidateCount: number;

  assessmentProjectId: string | null;
  assessmentProjectName: string | null;

  assessmentSessionId: string | null;
  assessmentResultSnapshotId: string | null;

  questionnaireVersionId: string | null;

  completedAt: Date | null;
  frozenAt: Date | null;
  payload: unknown | null;

  candidates: Array<{
    assessmentProjectId: string | null;
    assessmentProjectName: string | null;
    assessmentSessionId: string;
    assessmentResultSnapshotId: string;
    questionnaireId: string | null;
    questionnaireVersionId: string | null;
    questionnaireCode: string | null;
    questionnaireName: string | null;
    completedAt: Date | null;
    frozenAt: Date | null;
  }>;
};

function asRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  return {};
}


export function getSnapshotQuestionnaireMeta(payload: unknown) {
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


type CompositeAvailableSource = {
  code: string;

  assessmentProjectId: string | null;
  assessmentProjectName: string | null;

  questionnaireId: string | null;
  questionnaireVersionId: string | null;
  questionnaireCode: string | null;
  questionnaireName: string | null;

  assessmentSessionId: string;
  assessmentResultSnapshotId: string;

  completedAt: Date | null;
  frozenAt: Date | null;

  payload: unknown;
};

function getTime(value: Date | string | null | undefined) {
  if (!value) return 0;

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function sortNewestFirst<T extends { completedAt: Date | null; frozenAt: Date | null }>(
  rows: T[],
) {
  return [...rows].sort((a, b) => {
    const completedDiff = getTime(b.completedAt) - getTime(a.completedAt);

    if (completedDiff !== 0) {
      return completedDiff;
    }

    return getTime(b.frozenAt) - getTime(a.frozenAt);
  });
}

function sourceCandidateDto(source: CompositeAvailableSource) {
  return {
    assessmentProjectId: source.assessmentProjectId,
    assessmentProjectName: source.assessmentProjectName,

    assessmentSessionId: source.assessmentSessionId,
    assessmentResultSnapshotId: source.assessmentResultSnapshotId,

    questionnaireId: source.questionnaireId,
    questionnaireVersionId: source.questionnaireVersionId,
    questionnaireCode: source.questionnaireCode,
    questionnaireName: source.questionnaireName,

    completedAt: source.completedAt,
    frozenAt: source.frozenAt,
  };
}

function groupByQuestionnaireId(sources: CompositeAvailableSource[]) {
  const grouped = new Map<string, CompositeAvailableSource[]>();

  for (const source of sources) {
    if (!source.questionnaireId) continue;

    const current = grouped.get(source.questionnaireId) ?? [];
    current.push(source);
    grouped.set(source.questionnaireId, current);
  }

  for (const [key, value] of grouped.entries()) {
    grouped.set(key, sortNewestFirst(value));
  }

  return grouped;
}

function resolveFrozenCompositeSources({
  configuredSources,
  availableSources,
  frozenSelection,
}: {
  configuredSources: CompositeSourceConfig[];
  availableSources: CompositeAvailableSource[];
  frozenSelection: FrozenCompositeSelection;
}): CompositeResolvedSource[] {
  const availableBySnapshotId = new Map(
    availableSources.map((source) => [
      source.assessmentResultSnapshotId,
      source,
    ]),
  );

  const frozenBySlot = new Map(
    frozenSelection.selectedSources.map((source) => [source.slot, source]),
  );

  return configuredSources.map((configuredSource) => {
    const frozen = frozenBySlot.get(configuredSource.slot);

    const matched = frozen
      ? availableBySnapshotId.get(frozen.assessmentResultSnapshotId)
      : null;

    return {
      ...configuredSource,
      available: Boolean(matched),

      selectionMode: "frozen",
      candidateCount: matched ? 1 : 0,

      assessmentProjectId:
        matched?.assessmentProjectId ?? frozen?.assessmentProjectId ?? null,
      assessmentProjectName:
        matched?.assessmentProjectName ?? frozen?.assessmentProjectName ?? null,

      assessmentSessionId:
        matched?.assessmentSessionId ?? frozen?.assessmentSessionId ?? null,
      assessmentResultSnapshotId:
        matched?.assessmentResultSnapshotId ??
        frozen?.assessmentResultSnapshotId ??
        null,

      questionnaireVersionId:
        matched?.questionnaireVersionId ?? frozen?.questionnaireVersionId ?? null,

      completedAt:
        matched?.completedAt ??
        (frozen?.completedAt ? new Date(frozen.completedAt) : null),
      frozenAt:
        matched?.frozenAt ?? (frozen?.frozenAt ? new Date(frozen.frozenAt) : null),

      payload: matched?.payload ?? null,

      candidates: matched ? [sourceCandidateDto(matched)] : [],
    };
  });
}

function resolveLatestCompletedCompositeSources({
  configuredSources,
  availableSources,
}: {
  configuredSources: CompositeSourceConfig[];
  availableSources: CompositeAvailableSource[];
}): CompositeResolvedSource[] {
  const byQuestionnaireId = groupByQuestionnaireId(availableSources);

  return configuredSources.map((configuredSource) => {
    const candidates = byQuestionnaireId.get(configuredSource.questionnaireId) ?? [];
    const matched = candidates[0] ?? null;

    return {
      ...configuredSource,
      available: Boolean(matched),

      selectionMode: "latest_completed",
      candidateCount: candidates.length,

      assessmentProjectId: matched?.assessmentProjectId ?? null,
      assessmentProjectName: matched?.assessmentProjectName ?? null,

      assessmentSessionId: matched?.assessmentSessionId ?? null,
      assessmentResultSnapshotId: matched?.assessmentResultSnapshotId ?? null,

      questionnaireVersionId: matched?.questionnaireVersionId ?? null,

      completedAt: matched?.completedAt ?? null,
      frozenAt: matched?.frozenAt ?? null,
      payload: matched?.payload ?? null,

      candidates: candidates.map(sourceCandidateDto),
    };
  });
}

function resolveSameProjectCompositeSources({
  configuredSources,
  availableSources,
  preferredAssessmentProjectId,
}: {
  configuredSources: CompositeSourceConfig[];
  availableSources: CompositeAvailableSource[];
  preferredAssessmentProjectId?: string | null;
}): CompositeResolvedSource[] {
  const requiredSources = configuredSources.filter((source) => source.required);

  const projectIds = Array.from(
    new Set(
      availableSources
        .map((source) => source.assessmentProjectId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const orderedProjectIds = preferredAssessmentProjectId
    ? [
        preferredAssessmentProjectId,
        ...projectIds.filter((id) => id !== preferredAssessmentProjectId),
      ]
    : projectIds;

  const viableProjectId =
    orderedProjectIds.find((projectId) =>
      requiredSources.every((configuredSource) =>
        availableSources.some(
          (source) =>
            source.assessmentProjectId === projectId &&
            source.questionnaireId === configuredSource.questionnaireId,
        ),
      ),
    ) ?? null;

  return configuredSources.map((configuredSource) => {
    const candidates = sortNewestFirst(
      availableSources.filter(
        (source) =>
          source.assessmentProjectId === viableProjectId &&
          source.questionnaireId === configuredSource.questionnaireId,
      ),
    );

    const matched = candidates[0] ?? null;

    return {
      ...configuredSource,
      available: Boolean(matched),

      selectionMode: "same_project",
      candidateCount: candidates.length,

      assessmentProjectId: matched?.assessmentProjectId ?? viableProjectId,
      assessmentProjectName: matched?.assessmentProjectName ?? null,

      assessmentSessionId: matched?.assessmentSessionId ?? null,
      assessmentResultSnapshotId: matched?.assessmentResultSnapshotId ?? null,

      questionnaireVersionId: matched?.questionnaireVersionId ?? null,

      completedAt: matched?.completedAt ?? null,
      frozenAt: matched?.frozenAt ?? null,
      payload: matched?.payload ?? null,

      candidates: candidates.map(sourceCandidateDto),
    };
  });
}

function resolveManualCompositeSources({
  configuredSources,
  availableSources,
  manual,
}: {
  configuredSources: CompositeSourceConfig[];
  availableSources: CompositeAvailableSource[];
  manual?: PersonalCompositeSourceSelection["manual"];
}): CompositeResolvedSource[] {
  const bySessionId = new Map(
    availableSources.map((source) => [source.assessmentSessionId, source]),
  );

  const groupedByQuestionnaireId = groupByQuestionnaireId(availableSources);

  return configuredSources.map((configuredSource) => {
    const selectedSessionId =
      manual?.bySlot?.[configuredSource.slot] ??
      manual?.byQuestionnaireId?.[configuredSource.questionnaireId] ??
      null;

    const candidates =
      groupedByQuestionnaireId.get(configuredSource.questionnaireId) ?? [];

    const matched = selectedSessionId
      ? bySessionId.get(selectedSessionId) ?? null
      : null;

    const validMatched =
      matched?.questionnaireId === configuredSource.questionnaireId
        ? matched
        : null;

    return {
      ...configuredSource,
      available: Boolean(validMatched),

      selectionMode: "manual",
      candidateCount: candidates.length,

      assessmentProjectId: validMatched?.assessmentProjectId ?? null,
      assessmentProjectName: validMatched?.assessmentProjectName ?? null,

      assessmentSessionId: validMatched?.assessmentSessionId ?? null,
      assessmentResultSnapshotId:
        validMatched?.assessmentResultSnapshotId ?? null,

      questionnaireVersionId: validMatched?.questionnaireVersionId ?? null,

      completedAt: validMatched?.completedAt ?? null,
      frozenAt: validMatched?.frozenAt ?? null,
      payload: validMatched?.payload ?? null,

      candidates: candidates.map(sourceCandidateDto),
    };
  });
}

export function resolveCompositeSources({
  configuredSources,
  availableSources,
  sourceSelection,
  frozenSelection,
  assessmentProjectId,
}: {
  configuredSources: CompositeSourceConfig[];
  availableSources: CompositeAvailableSource[];
  sourceSelection?: PersonalCompositeSourceSelection | null;
  frozenSelection?: FrozenCompositeSelection | null;
  assessmentProjectId?: string | null;
}) {
  if (frozenSelection) {
    return resolveFrozenCompositeSources({
      configuredSources,
      availableSources,
      frozenSelection,
    });
  }

  if (sourceSelection?.mode === "manual") {
    return resolveManualCompositeSources({
      configuredSources,
      availableSources,
      manual: sourceSelection.manual,
    });
  }

  if (sourceSelection?.mode === "same_project") {
    return resolveSameProjectCompositeSources({
      configuredSources,
      availableSources,
      preferredAssessmentProjectId:
        sourceSelection.assessmentProjectId ?? assessmentProjectId ?? null,
    });
  }

  return resolveLatestCompletedCompositeSources({
    configuredSources,
    availableSources,
  });
}

function buildFrozenCompositeSelection({
  mode,
  respondentId,
  reportTemplateVersionId,
  assessmentProjectId,
  resolvedSources,
}: {
  mode: "latest_completed" | "same_project" | "manual" | "frozen";
  respondentId: string;
  reportTemplateVersionId: string;
  assessmentProjectId?: string | null;
  resolvedSources: CompositeResolvedSource[];
}): FrozenCompositeSelection {
  return {
    mode: mode == "frozen"? 'latest_completed' : mode,
    frozenAt: new Date().toISOString(),
    respondentId,
    reportTemplateVersionId,
    assessmentProjectId: assessmentProjectId ?? null,
    selectedSources: resolvedSources
      .filter(
        (source) =>
          source.available &&
          source.assessmentSessionId &&
          source.assessmentResultSnapshotId,
      )
      .map((source) => ({
        slot: source.slot,
        label: source.label,
        questionnaireId: source.questionnaireId,
        questionnaireCode: source.questionnaireCode,
        questionnaireName: source.questionnaireName,
        required: source.required,

        assessmentProjectId: source.assessmentProjectId,
        assessmentProjectName: source.assessmentProjectName,

        assessmentSessionId: source.assessmentSessionId!,
        assessmentResultSnapshotId: source.assessmentResultSnapshotId!,

        questionnaireVersionId: source.questionnaireVersionId,

        completedAt: source.completedAt,
        frozenAt: source.frozenAt,
      })),
  };
}

function getDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function sortSourcesNewestFirst(
  sources: CompositeAvailableSource[],
): CompositeAvailableSource[] {
  return [...sources].sort((a, b) => {
    const completedDiff = getDateTime(b.completedAt) - getDateTime(a.completedAt);

    if (completedDiff !== 0) {
      return completedDiff;
    }

    return getDateTime(b.frozenAt) - getDateTime(a.frozenAt);
  });
}

function groupAvailableSourcesByQuestionnaireId(
  sources: CompositeAvailableSource[],
) {
  const grouped = new Map<string, CompositeAvailableSource[]>();

  for (const source of sources) {
    if (!source.questionnaireId) {
      continue;
    }

    const current = grouped.get(source.questionnaireId) ?? [];
    current.push(source);
    grouped.set(source.questionnaireId, current);
  }

  for (const [questionnaireId, group] of grouped.entries()) {
    grouped.set(questionnaireId, sortSourcesNewestFirst(group));
  }

  return grouped;
}

function groupAvailableSourcesByQuestionnaireCode(
  sources: CompositeAvailableSource[],
) {
  const grouped = new Map<string, CompositeAvailableSource[]>();

  for (const source of sources) {
    const code = source.questionnaireCode ?? source.code;

    if (!code) {
      continue;
    }

    const current = grouped.get(code) ?? [];
    current.push(source);
    grouped.set(code, current);
  }

  for (const [code, group] of grouped.entries()) {
    grouped.set(code, sortSourcesNewestFirst(group));
  }

  return grouped;
}

function stripSourcePayload(source: CompositeAvailableSource) {
  return {
    code: source.code,
    questionnaireId: source.questionnaireId,
    questionnaireVersionId: source.questionnaireVersionId,
    questionnaireCode: source.questionnaireCode,
    questionnaireName: source.questionnaireName,
    assessmentSessionId: source.assessmentSessionId,
    assessmentResultSnapshotId: source.assessmentResultSnapshotId,
    completedAt: source.completedAt,
    frozenAt: source.frozenAt,
  };
}

export function readPersonalCompositeSourceConfig(
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

export function buildCompositeEligibility({
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

type CompositeResponseDimension = {
  dimensionCode?: string | null;
  dimensionName?: string | null;
  dimensionCategory?: string | null;
  weight?: unknown;
};

type CompositeSnapshotResponse = {
  responseExists?: boolean | null;
  responseRawValue?: unknown;
  responseNumericValue?: unknown;
  itemId?: string | null;
  itemCode?: string | null;
  itemText?: string | null;
  dimensions?: CompositeResponseDimension[] | null;
};

type CompositeDimensionObservation = {
  sourceSlot: string;
  sourceLabel: string;
  questionnaireId: string;
  questionnaireCode: string;
  questionnaireName: string;

  assessmentSessionId: string;
  assessmentResultSnapshotId: string;

  itemId: string | null;
  itemCode: string | null;
  itemText: string | null;

  dimensionCode: string;
  dimensionName: string;
  dimensionCategory: string;

  value: number;
  weight: number;
  weightedValue: number;
};

function stringOrFallback(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();

  return normalized || fallback;
}

function normalizeCompositeDimensionCode(value: unknown) {
  return stringOrFallback(value, "UNKNOWN").trim().toUpperCase();
}

function normalizeCompositeDimensionCategory(value: unknown) {
  return stringOrFallback(value, "__NO_CATEGORY__").trim().toUpperCase();
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getCompositeResponseNumericValue(response: CompositeSnapshotResponse) {
  const explicit = numberOrNull(response.responseNumericValue);

  if (explicit !== null) {
    return explicit;
  }

  return numberOrNull(response.responseRawValue);
}

function getCompositeResponseWeight(
  dimension: CompositeResponseDimension,
) {
  return numberOrNull(dimension.weight) ?? 1;
}

function mean(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));

  if (clean.length === 0) {
    return null;
  }

  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function median(values: number[]) {
  const clean = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (clean.length === 0) {
    return null;
  }

  const middle = Math.floor(clean.length / 2);

  if (clean.length % 2 === 0) {
    return (clean[middle - 1] + clean[middle]) / 2;
  }

  return clean[middle];
}

function stdDev(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));

  if (clean.length < 2) {
    return null;
  }

  const avg = mean(clean);

  if (avg === null) {
    return null;
  }

  const variance =
    clean.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
    (clean.length - 1);

  return Math.sqrt(variance);
}

function min(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));

  return clean.length > 0 ? Math.min(...clean) : null;
}

function max(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));

  return clean.length > 0 ? Math.max(...clean) : null;
}

function round(value: number | null, digits = 4) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}


function extractCompositeDimensionObservationsFromSource(
  source: CompositeResolvedSource,
): CompositeDimensionObservation[] {
  if (!source.available || !source.payload) {
    return [];
  }

  const payload = asRecord(source.payload);
  const responses = Array.isArray(payload.responses)
    ? (payload.responses as CompositeSnapshotResponse[])
    : [];

  if (!source.assessmentSessionId || !source.assessmentResultSnapshotId) {
    return [];
  }

  const observations: CompositeDimensionObservation[] = [];

  for (const response of responses) {
    if (response.responseExists !== true) {
      continue;
    }

    const value = getCompositeResponseNumericValue(response);

    if (value === null) {
      continue;
    }

    const dimensions = Array.isArray(response.dimensions)
      ? response.dimensions
      : [];

    for (const dimension of dimensions) {
      const dimensionCode = normalizeCompositeDimensionCode(
        dimension.dimensionCode,
      );

      if (!dimensionCode || dimensionCode === "UNKNOWN") {
        continue;
      }

      const dimensionCategory = normalizeCompositeDimensionCategory(
        dimension.dimensionCategory,
      );

      const dimensionName =
        typeof dimension.dimensionName === "string" &&
        dimension.dimensionName.trim()
          ? dimension.dimensionName.trim()
          : dimensionCode;

      const weight = getCompositeResponseWeight(dimension);

      observations.push({
        sourceSlot: source.slot,
        sourceLabel: source.label,
        questionnaireId: source.questionnaireId,
        questionnaireCode: source.questionnaireCode,
        questionnaireName: source.questionnaireName,

        assessmentSessionId: source.assessmentSessionId,
        assessmentResultSnapshotId: source.assessmentResultSnapshotId,

        itemId: typeof response.itemId === "string" ? response.itemId : null,
        itemCode:
          typeof response.itemCode === "string" ? response.itemCode : null,
        itemText:
          typeof response.itemText === "string" ? response.itemText : null,

        dimensionCode,
        dimensionName,
        dimensionCategory,

        value,
        weight,
        weightedValue: value * weight,
      });
    }
  }

  return observations;
}

export function aggregateCompositeMergedDimensionScores(
  sources: CompositeResolvedSource[],
) {
  const observations = sources.flatMap((source) =>
    extractCompositeDimensionObservationsFromSource(source),
  );

  const groups = new Map<string, CompositeDimensionObservation[]>();

  for (const observation of observations) {
    const key = [
      observation.dimensionCategory,
      observation.dimensionCode,
    ].join("::");

    const current = groups.get(key) ?? [];
    current.push(observation);
    groups.set(key, current);
  }

  const rows = Array.from(groups.values()).map((groupRows) => {
    const first = groupRows[0];

    const values = groupRows.map((row) => row.value);
    const weightedValues = groupRows.map((row) => row.weightedValue);
    const weightSum = groupRows.reduce((sum, row) => sum + row.weight, 0);
    const rawSum = groupRows.reduce((sum, row) => sum + row.value, 0);
    const weightedSum = groupRows.reduce(
      (sum, row) => sum + row.weightedValue,
      0,
    );

    const sourceSlots = Array.from(
      new Set(groupRows.map((row) => row.sourceSlot)),
    );

    const questionnaireIds = Array.from(
      new Set(groupRows.map((row) => row.questionnaireId)),
    );

    const itemIds = Array.from(
      new Set(
        groupRows
          .map((row) => row.itemId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const itemCodes = Array.from(
      new Set(
        groupRows
          .map((row) => row.itemCode)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    return {
      dimensionCategory: first.dimensionCategory,
      dimensionCode: first.dimensionCode,
      dimensionName: first.dimensionName,

      nItems: groupRows.length,
      nUniqueItems: itemIds.length || itemCodes.length || groupRows.length,

      nSources: sourceSlots.length,
      sourceSlots,
      questionnaireIds,

      rawSum: round(rawSum),
      weightedSum: round(weightedSum),
      weightSum: round(weightSum),

      meanScore: round(mean(values)),
      weightedMeanScore:
        weightSum > 0 ? round(weightedSum / weightSum) : null,

      medianScore: round(median(values)),
      stdDevScore: round(stdDev(values)),
      minScore: round(min(values)),
      maxScore: round(max(values)),

      debug: {
        itemIds,
        itemCodes,
      },
    };
  });

  rows.sort((a, b) =>
    [
      a.dimensionCategory.localeCompare(b.dimensionCategory),
      a.dimensionCode.localeCompare(b.dimensionCode),
    ].find((result) => result !== 0) ?? 0,
  );

  const byDimensionKey = Object.fromEntries(
    rows.map((row) => [
      `${row.dimensionCategory}.${row.dimensionCode}`,
      row,
    ]),
  );

  const byDimensionCode: Record<string, any[]> = {};

  for (const row of rows) {
    byDimensionCode[row.dimensionCode] ??= [];
    byDimensionCode[row.dimensionCode].push(row);
  }

  const byCategory: Record<string, Record<string, any>> = {};

  for (const row of rows) {
    byCategory[row.dimensionCategory] ??= {};
    byCategory[row.dimensionCategory][row.dimensionCode] = row;
  }

  return {
    rows,
    byDimensionKey,
    byDimensionCode,
    byCategory,
    debug: {
      observationCount: observations.length,
      mergedDimensionCount: rows.length,
    },
  };
}

export function aggregateCompositeSourceDimensionScores(
  sources: CompositeResolvedSource[],
) {
  const result: Record<string, any> = {};

  for (const source of sources) {
    const merged = aggregateCompositeMergedDimensionScores([source]);

    result[source.slot] = {
      slot: source.slot,
      label: source.label,
      questionnaireId: source.questionnaireId,
      questionnaireCode: source.questionnaireCode,
      questionnaireName: source.questionnaireName,

      available: source.available,
      assessmentSessionId: source.assessmentSessionId,
      assessmentResultSnapshotId: source.assessmentResultSnapshotId,

      dimensionScores: merged,
    };
  }

  return result;
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
  } | null;
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
  assessmentProjectId = null,
  respondentId,
  reportTemplateVersionId,
  previewMode = false,
  sourceSelection = null,
  frozenSelection = null,
}: {
  tenantSlug: string;
  assessmentProjectId?: string | null;
  respondentId: string;
  reportTemplateVersionId: string;
  previewMode?: boolean;
  sourceSelection?: PersonalCompositeSourceSelection | null;
  frozenSelection?: FrozenCompositeSelection | null;
}): Promise<PersonalCompositeReportData | null> {

const pcrDebug = {
  tenantSlug,
  assessmentProjectId,
  respondentId,
  reportTemplateVersionId,
  previewMode,
  sourceSelectionMode: sourceSelection?.mode ?? null,
  hasFrozenSelection: Boolean(frozenSelection),
};

const logPcr = (step: string, extra: Record<string, unknown> = {}) => {
  console.log(`PCR_${step}`, {
    ...pcrDebug,
    ...extra,
  });
};

logPcr("HIT");
if (!tenantSlug || !respondentId || !reportTemplateVersionId) {
  logPcr("RETURN_NULL", {
    reason: "missing_required_input",
    hasTenantSlug: Boolean(tenantSlug),
    hasRespondentId: Boolean(respondentId),
    hasReportTemplateVersionId: Boolean(reportTemplateVersionId),
  });

  return null;
}

logPcr("BEFORE_REQUIRE_TENANT_CONTEXT");

let ctx: Awaited<ReturnType<typeof requireTenantContext>>;

try {
  ctx = await requireTenantContext({ tenantSlug });

  logPcr("AFTER_REQUIRE_TENANT_CONTEXT", {
    ctxTenantId: ctx.tenantId,
    ctxTenantSlug: ctx.tenantSlug,
    ctxUserId: ctx.userId,
    ctxRole: ctx.role,
    ctxPermissions: ctx.permissions,
  });
} catch (error) {
  const err = error as Error & {
    digest?: string;
    statusCode?: number;
  };

  logPcr("REQUIRE_TENANT_CONTEXT_THROWN", {
    name: err.name,
    message: err.message,
    digest: err.digest,
    statusCode: err.statusCode,
  });

  throw error;
}

logPcr("BEFORE_REQUIRE_PERMISSION", {
  permission: "report:read",
});

requirePermission(ctx, "report:read");

logPcr("AFTER_REQUIRE_PERMISSION", {
  permission: "report:read",
});

  const templateVersionStatusCondition = previewMode
    ? undefined
    : eq(reportTemplateVersions.status, "active");


logPcr("BEFORE_TEMPLATE_VERSION_QUERY");

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
logPcr("AFTER_TEMPLATE_VERSION_QUERY", {
  found: Boolean(templateVersion),
  templateVersionId: templateVersion?.id ?? null,
  reportTemplateId: templateVersion?.reportTemplateId ?? null,
  reportTemplateKind: templateVersion?.reportTemplateKind ?? null,
  reportTemplateStatus: templateVersion?.status ?? null,
});
if (!templateVersion || templateVersion.reportTemplateKind !== "personal_composite") {
  logPcr("RETURN_NULL", {
    reason: "missing_or_wrong_template_kind",
    found: Boolean(templateVersion),
    reportTemplateKind: templateVersion?.reportTemplateKind ?? null,
  });

  return null;
}

  const configuredSources = readPersonalCompositeSourceConfig(
    templateVersion.dataBindings,
  );
logPcr("AFTER_CONFIGURED_SOURCES", {
  configuredSourcesCount: configuredSources.length,
  configuredSources: configuredSources.map((source) => ({
    slot: source.slot,
    required: source.required,
    questionnaireId: source.questionnaireId,
    questionnaireCode: source.questionnaireCode,
  })),
});
  logPcr("BEFORE_GET_TENANT_DB");

const db = await getTenantDb(ctx);

logPcr("AFTER_GET_TENANT_DB", {
  hasDb: Boolean(db),
});
const project = assessmentProjectId
  ? (
      await db
        .select({
          id: assessmentProjects.id,
          name: assessmentProjects.name,
          description: assessmentProjects.description,
        })
        .from(assessmentProjects)
        .where(
          and(
            eq(assessmentProjects.id, assessmentProjectId),
            isNull(assessmentProjects.deletedAt),
          ),
        )
        .limit(1)
    )[0]
  : null;
logPcr("AFTER_PROJECT_QUERY", {
  assessmentProjectId,
  hasProject: Boolean(project),
  projectId: project?.id ?? null,
  projectName: project?.name ?? null,
});
if (assessmentProjectId && !project) {
  logPcr("RETURN_NULL", {
    reason: "assessment_project_not_found",
    assessmentProjectId,
  });

  return null;
}

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
logPcr("AFTER_SUBJECT_QUERY", {
  hasSubject: Boolean(subject),
  subjectRespondentId: subject?.respondentId ?? null,
  subjectEmail: subject?.respondentEmail ?? null,
});
if (!subject) {
  logPcr("RETURN_NULL", {
    reason: "subject_not_found",
    respondentId,
  });

  return null;
}


  const projectCondition = assessmentProjectId
  ? eq(assessmentSessions.assessmentProjectId, assessmentProjectId)
  : undefined;
logPcr("BEFORE_ROWS_QUERY", {
  hasAssessmentProjectCondition: Boolean(assessmentProjectId),
});
  const rows = await db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      sessionCompletedAt: assessmentSessions.completedAt,

      projectId: assessmentProjects.id,
      projectName: assessmentProjects.name,
      projectDescription: assessmentProjects.description,
sessionAssessmentProjectId: assessmentSessions.assessmentProjectId,

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
        projectCondition,
        eq(assessmentSessions.respondentId, respondentId),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(respondents.deletedAt),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSessions.completedAt));

logPcr("AFTER_ROWS_QUERY", {
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
const availableSources: CompositeAvailableSource[] = rows.map((row, index) => {
  const questionnaireMeta = getSnapshotQuestionnaireMeta(row.snapshotPayload);

  const code = questionnaireMeta.questionnaireCode ?? `SOURCE_${index + 1}`;

  return {
    code,

    assessmentProjectId: row.sessionAssessmentProjectId ?? null,
    assessmentProjectName: row.projectName ?? null,

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


logPcr("AFTER_AVAILABLE_SOURCES", {
  availableSourcesCount: availableSources.length,
  availableSources: availableSources.map((source) => ({
    code: source.code,
    questionnaireId: source.questionnaireId,
    questionnaireVersionId: source.questionnaireVersionId,
    questionnaireCode: source.questionnaireCode,
    questionnaireName: source.questionnaireName,
    assessmentSessionId: source.assessmentSessionId,
    assessmentProjectId: source.assessmentProjectId,
    completedAt: source.completedAt,
  })),
});

const resolvedSources = resolveCompositeSources({
  configuredSources,
  availableSources,
  sourceSelection,
  frozenSelection,
  assessmentProjectId,
});
logPcr("AFTER_RESOLVE_SOURCES", {
  resolvedSourcesCount: resolvedSources.length,
  resolvedSources: resolvedSources.map((source) => ({
    slot: source.slot,
    required: source.required,
    available: source.available,
    questionnaireId: source.questionnaireId,
    questionnaireCode: source.questionnaireCode,
    questionnaireName: source.questionnaireName,
    assessmentSessionId: source.assessmentSessionId ?? null,
  })),
});
const effectiveSelectionMode =
  frozenSelection?.mode ?? sourceSelection?.mode ?? "latest_completed";

const frozenCompositeSelection = buildFrozenCompositeSelection({
  mode:
    effectiveSelectionMode,
  respondentId,
  reportTemplateVersionId,
  assessmentProjectId,
  resolvedSources,
});

const availableSourcesByQuestionnaireId =
  groupAvailableSourcesByQuestionnaireId(availableSources);

const availableSourcesByQuestionnaireCode =
  groupAvailableSourcesByQuestionnaireCode(availableSources);


  const eligibility = buildCompositeEligibility({
    configuredSources,
    resolvedSources,
  });
logPcr("AFTER_ELIGIBILITY", {
  eligibilityStatus: eligibility.status,
  canRender: eligibility.canRender,
  warnings: eligibility.warnings,
  missingRequiredSources: eligibility.missingRequiredSources.map((source) => ({
    slot: source.slot,
    questionnaireId: source.questionnaireId,
    questionnaireCode: source.questionnaireCode,
  })),
  missingOptionalSources: eligibility.missingOptionalSources.map((source) => ({
    slot: source.slot,
    questionnaireId: source.questionnaireId,
    questionnaireCode: source.questionnaireCode,
  })),
});
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
scope: assessmentProjectId
  ? {
      type: "assessment_project",
      assessmentProjectId,
      label: project?.name ?? "Projekt",
    }
  : {
      type: "respondent",
      respondentId,
      label: "Moje badania publiczne",
    },
project: project
  ? {
      id: project.id,
      name: project.name,
      description: project.description,
    }
  : {
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
  sourceCount: resolvedSources?.length,
  availableSources: availableResolvedSources,

  bySlot: sourcesBySlot,
  availableBySlot: availableSourcesBySlot,
  availableByCode: availableSourcesByCode,
  dimensionScores: {
    merged: mergedDimensionScores,
    bySource: sourceDimensionScores,
  },
  selection: {
  mode: effectiveSelectionMode,
  frozen: frozenCompositeSelection,
  selectedSources: frozenCompositeSelection.selectedSources,
  
},
  
},

    sources: availableResolvedSources,

    primary: availableResolvedSources[0]?.payload ?? null,

    ...(availableResolvedSources[0]?.payload &&
      typeof availableResolvedSources[0].payload === "object"
      ? (availableResolvedSources[0].payload as Record<string, unknown>)
      : {}),
  };

  logPcr("BEFORE_AUDIT_LOG", {
  action: previewMode ? "report_previewed" : "report_viewed",
  entityType: "respondent",
  entityId: subject.respondentId,
  sourceSessionIds: availableResolvedSources
    .map((source) => source.assessmentSessionId)
    .filter(Boolean),
});

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

logPcr("AFTER_AUDIT_LOG");

  return {
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      name: "tenantName" in ctx ? String(ctx.tenantName ?? "") : null,
    },
project: project
  ? {
      id: project.id,
      name: project.name,
      description: project.description,
    }
  : null,
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