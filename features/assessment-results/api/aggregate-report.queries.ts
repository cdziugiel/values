import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";

import {
  assessmentDimensionScores,
  assessmentProjects,
  assessmentSessions,
  assessmentResultSnapshots,
  clientOrganizations,
  clientUnits,
  respondents,
} from "@/drizzle/schema/tenant-schema";

import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";

type AggregateReportKind =
  | "project_aggregate"
  | "organization_aggregate"
  | "team_aggregate";

type AggregateStatus =
  | "ready"
  | "no_scores"
  | "below_minimum_n"
  | "unsupported_scope";

type ScoreRow = {
  assessmentSessionId: string;
  respondentId: string;
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireDimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  rawScore: number;
  weightedScore: number;
  meanScore: number;
  weightedMeanScore: number;
  normalizedScore: number | null;
  answeredItemsCount: number;
  expectedItemsCount: number;
  completeness: number;
};

type AggregatedDimension = {
  dimensionCode: string;
  dimensionName: string;
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireDimensionId: string;
  n: number;
  meanRawScore: number | null;
  meanWeightedScore: number | null;
  meanScore: number | null;
  meanWeightedMeanScore: number | null;
  meanNormalizedScore: number | null;
  medianWeightedMeanScore: number | null;
  stdDevWeightedMeanScore: number | null;
  minWeightedMeanScore: number | null;
  maxWeightedMeanScore: number | null;
  meanCompleteness: number | null;
};

export type AggregateReportData = {
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
  organization?: {
    id: string;
    name: string;
    industry: string | null;
    size: string | null;
  } | null;
  unit?: {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    clientOrganizationId: string;
    descendantUnitIds: string[];
    descendantUnitCount: number;
  } | null;
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
    status: AggregateStatus;
    canRender: boolean;
    warnings: string[];
    minimumN: number;
    nRespondents: number;
    nSessions: number;
    nScores: number;
  };
  payload: any;
};


type ClientUnitTreeRow = {
  id: string;
  parentId: string | null;
};


type CrossScoreSnapshotRow = {
  assessmentSessionId: string;
  respondentId: string;
  snapshotId: string;
  payload: unknown;
};

type CrossScoreObservation = {
  assessmentSessionId: string;
  respondentId: string;
  snapshotId: string;

  axis: string;
  axisCode: string;

  byAxis: string;
  byCode: string;

  valueKey: string;
  value: number;
};

type AggregatedCrossScore = {
  axis: string;
  axisCode: string;
  byAxis: string;
  byCode: string;

  valueKey: string;

  n: number;
  nRespondents: number;
  nSessions: number;

  meanWeightedMeanScore: number | null;
  medianWeightedMeanScore: number | null;
  stdDevWeightedMeanScore: number | null;
  minWeightedMeanScore: number | null;
  maxWeightedMeanScore: number | null;
};

type SnapshotResponseDimension = {
  dimensionCode?: string | null;
  dimensionCategory?: string | null;
  weight?: unknown;
};

type SnapshotResponse = {
  responseExists?: boolean | null;
  responseRawValue?: unknown;
  responseNumericValue?: unknown;
  dimensions?: SnapshotResponseDimension[] | null;
};

function stringOrFallback(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();

  return normalized || fallback;
}

function normalizeDimensionCode(value: unknown) {
  return stringOrFallback(value, "UNKNOWN").trim().toUpperCase();
}

function normalizeCategory(value: unknown) {
  return stringOrFallback(value, "__NO_CATEGORY__").trim();
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

function getResponseNumericValue(response: SnapshotResponse) {
  const explicit = numberOrNull(response.responseNumericValue);

  if (explicit !== null) {
    return explicit;
  }

  if (typeof response.responseRawValue === "number") {
    return response.responseRawValue;
  }

  return null;
}

function getResponseWeightForDimension(
  response: SnapshotResponse,
  category: string,
  code: string,
) {
  const dimensions = Array.isArray(response.dimensions)
    ? response.dimensions
    : [];

  const dimension = dimensions.find(
    (candidate) =>
      normalizeCategory(candidate.dimensionCategory) === category &&
      normalizeDimensionCode(candidate.dimensionCode) === code,
  );

  return numberOrNull(dimension?.weight) ?? 1;
}

function responseHasDimension(
  response: SnapshotResponse,
  category: string,
  code: string,
) {
  const dimensions = Array.isArray(response.dimensions)
    ? response.dimensions
    : [];

  return dimensions.some(
    (dimension) =>
      normalizeCategory(dimension.dimensionCategory) === category &&
      normalizeDimensionCode(dimension.dimensionCode) === code,
  );
}

function buildCrossScoresFromResponses(responses: SnapshotResponse[]) {
  const categories = new Map<string, Set<string>>();

  for (const response of responses) {
    const dimensions = Array.isArray(response.dimensions)
      ? response.dimensions
      : [];

    for (const dimension of dimensions) {
      const category = normalizeCategory(dimension.dimensionCategory);
      const code = normalizeDimensionCode(dimension.dimensionCode);

      categories.set(category, categories.get(category) ?? new Set());
      categories.get(category)?.add(code);
    }
  }

  const result: Record<
    string,
    Record<
      string,
      {
        by: Record<string, Record<string, any>>;
      }
    >
  > = {};

  for (const [primaryCategory, primaryCodes] of categories.entries()) {
    result[primaryCategory] ??= {};

    for (const primaryCode of primaryCodes) {
      result[primaryCategory][primaryCode] ??= {
        by: {},
      };

      for (const [filterCategory, filterCodes] of categories.entries()) {
        if (filterCategory === primaryCategory) {
          continue;
        }

        result[primaryCategory][primaryCode].by[filterCategory] ??= {};

        for (const filterCode of filterCodes) {
          const matchingResponses = responses.filter(
            (response) =>
              responseHasDimension(response, primaryCategory, primaryCode) &&
              responseHasDimension(response, filterCategory, filterCode),
          );

          const answeredResponses = matchingResponses.filter(
            (response) =>
              response.responseExists === true &&
              getResponseNumericValue(response) !== null,
          );

          let rawSum = 0;
          let weightedSum = 0;
          let weightSum = 0;

          for (const response of answeredResponses) {
            const numericValue = getResponseNumericValue(response);

            if (numericValue === null) {
              continue;
            }

            const weight = getResponseWeightForDimension(
              response,
              primaryCategory,
              primaryCode,
            );

            rawSum += numericValue;
            weightedSum += numericValue * weight;
            weightSum += weight;
          }

          const answeredItemsCount = answeredResponses.length;
          const itemsCount = matchingResponses.length;

          result[primaryCategory][primaryCode].by[filterCategory][filterCode] = {
            primaryCategory,
            primaryCode,
            filterCategory,
            filterCode,
            itemsCount,
            answeredItemsCount,
            rawSum,
            meanScore:
              answeredItemsCount > 0 ? rawSum / answeredItemsCount : null,
            weightedSum,
            weightedMeanScore:
              weightSum > 0 ? weightedSum / weightSum : null,
            weightSum,
            completeness:
              itemsCount > 0 ? answeredItemsCount / itemsCount : null,
          };
        }
      }
    }
  }

  return result;
}

function readCrossScoresRoot(payload: unknown) {
  const record = asRecord(payload);
  const analytics = asRecord(record.analytics);

  const directCrossScores = asRecord(record.crossScores);
  if (Object.keys(directCrossScores).length > 0) {
    return directCrossScores;
  }

  const analyticsCrossScores = asRecord(analytics.crossScores);
  if (Object.keys(analyticsCrossScores).length > 0) {
    return analyticsCrossScores;
  }

  const responses = Array.isArray(record.responses)
    ? (record.responses as SnapshotResponse[])
    : [];

  if (responses.length > 0) {
    return buildCrossScoresFromResponses(responses);
  }

  return {};
}

function readCrossScoreNumericValue(leaf: unknown) {
  const record = asRecord(leaf);

  const candidates = [
    "weightedMeanScore",
    "meanScore",
    "normalizedScore",
    "score",
    "rawScore",
  ];

  for (const key of candidates) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return {
        value,
        valueKey: key,
      };
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return {
          value: parsed,
          valueKey: key,
        };
      }
    }
  }

  return null;
}

function extractCrossScoreObservationsFromSnapshot(
  row: CrossScoreSnapshotRow,
): CrossScoreObservation[] {
  const root = readCrossScoresRoot(row.payload);
  const observations: CrossScoreObservation[] = [];

  for (const [axis, axisValuesUnknown] of Object.entries(root)) {
    const axisValues = asRecord(axisValuesUnknown);

    for (const [axisCode, axisNodeUnknown] of Object.entries(axisValues)) {
      const axisNode = asRecord(axisNodeUnknown);
      const by = asRecord(axisNode.by);

      for (const [byAxis, byAxisValuesUnknown] of Object.entries(by)) {
        const byAxisValues = asRecord(byAxisValuesUnknown);

        for (const [byCode, leafUnknown] of Object.entries(byAxisValues)) {
          const numeric = readCrossScoreNumericValue(leafUnknown);

          if (!numeric) {
            continue;
          }

          observations.push({
            assessmentSessionId: row.assessmentSessionId,
            respondentId: row.respondentId,
            snapshotId: row.snapshotId,

            axis,
            axisCode,

            byAxis,
            byCode,

            valueKey: numeric.valueKey,
            value: numeric.value,
          });
        }
      }
    }
  }

  return observations;
}

function aggregateCrossScoreObservations(
  observations: CrossScoreObservation[],
) {
  const groups = new Map<string, CrossScoreObservation[]>();

  function addToGroup(observation: CrossScoreObservation) {
    const key = [
      observation.axis,
      observation.axisCode,
      observation.byAxis,
      observation.byCode,
      observation.valueKey,
    ].join("::");

    const current = groups.get(key) ?? [];
    current.push(observation);
    groups.set(key, current);
  }

  for (const observation of observations) {
    addToGroup(observation);

    // Drugi kierunek: vMEME.AREA oraz AREA.vMEME.
    addToGroup({
      ...observation,
      axis: observation.byAxis,
      axisCode: observation.byCode,
      byAxis: observation.axis,
      byCode: observation.axisCode,
    });
  }

  const rows: AggregatedCrossScore[] = Array.from(groups.values()).map(
    (groupRows) => {
      const first = groupRows[0];
      const values = groupRows.map((row) => row.value);

      return {
        axis: first.axis,
        axisCode: first.axisCode,
        byAxis: first.byAxis,
        byCode: first.byCode,

        valueKey: first.valueKey,

        n: groupRows.length,
        nRespondents: new Set(groupRows.map((row) => row.respondentId)).size,
        nSessions: new Set(groupRows.map((row) => row.assessmentSessionId))
          .size,

        meanWeightedMeanScore: round(mean(values)),
        medianWeightedMeanScore: round(median(values)),
        stdDevWeightedMeanScore: round(stdDev(values)),
        minWeightedMeanScore: round(min(values)),
        maxWeightedMeanScore: round(max(values)),
      };
    },
  );

  rows.sort((a, b) =>
    [
      a.axis.localeCompare(b.axis),
      a.axisCode.localeCompare(b.axisCode),
      a.byAxis.localeCompare(b.byAxis),
      a.byCode.localeCompare(b.byCode),
    ].find((result) => result !== 0) ?? 0,
  );

  const tree: Record<string, any> = {};

  for (const row of rows) {
    tree[row.axis] ??= {};
    tree[row.axis][row.axisCode] ??= {};
    tree[row.axis][row.axisCode].by ??= {};
    tree[row.axis][row.axisCode].by[row.byAxis] ??= {};

    tree[row.axis][row.axisCode].by[row.byAxis][row.byCode] = {
      n: row.n,
      nRespondents: row.nRespondents,
      nSessions: row.nSessions,

      valueKey: row.valueKey,

      meanWeightedMeanScore: row.meanWeightedMeanScore,
      medianWeightedMeanScore: row.medianWeightedMeanScore,
      stdDevWeightedMeanScore: row.stdDevWeightedMeanScore,
      minWeightedMeanScore: row.minWeightedMeanScore,
      maxWeightedMeanScore: row.maxWeightedMeanScore,
    };
  }

const byPair: Record<string, AggregatedCrossScore[]> = {};
const availableAxes = new Set<string>();
const availablePairs = new Set<string>();

for (const row of rows) {
  availableAxes.add(row.axis);
  availableAxes.add(row.byAxis);
  availablePairs.add(`${row.axis}.${row.byAxis}`);

  const pairKey = `${row.axis}.${row.byAxis}`;
  byPair[pairKey] ??= [];
  byPair[pairKey].push(row);
}

const availableAxisCodes = Object.fromEntries(
  Array.from(availableAxes).map((axis) => [
    axis,
    Array.from(
      new Set(
        rows
          .filter((row) => row.axis === axis)
          .map((row) => row.axisCode),
      ),
    ).sort(),
  ]),
);

const availableByCodes = Object.fromEntries(
  Array.from(availablePairs).map((pair) => {
    const [axis, byAxis] = pair.split(".");

    return [
      pair,
      Array.from(
        new Set(
          rows
            .filter((row) => row.axis === axis && row.byAxis === byAxis)
            .map((row) => row.byCode),
        ),
      ).sort(),
    ];
  }),
);

return {
  rows,
  tree,
  byPair,
  debug: {
    availableAxes: Array.from(availableAxes).sort(),
    availablePairs: Array.from(availablePairs).sort(),
    availableAxisCodes,
    availableByCodes,
  },
};
}

function aggregateCrossScoresFromSnapshots(rows: CrossScoreSnapshotRow[]) {
  const observations = rows.flatMap((row) =>
    extractCrossScoreObservationsFromSnapshot(row),
  );

  const aggregated = aggregateCrossScoreObservations(observations);

  return {
    rows: aggregated.rows,
    tree: aggregated.tree,
    byPair: aggregated.byPair,
    debug: {
      snapshotCount: rows.length,
      observationCount: observations.length,
      aggregatedRowsCount: aggregated.rows.length,
      ...aggregated.debug,
    },
  };
}

function collectClientUnitDescendantIds({
  units,
  rootUnitId,
}: {
  units: ClientUnitTreeRow[];
  rootUnitId: string;
}) {
  const childrenByParentId = new Map<string, string[]>();

  for (const unit of units) {
    if (!unit.parentId) {
      continue;
    }

    const current = childrenByParentId.get(unit.parentId) ?? [];
    current.push(unit.id);
    childrenByParentId.set(unit.parentId, current);
  }

  const result = new Set<string>([rootUnitId]);
  const stack = [rootUnitId];

  while (stack.length > 0) {
    const currentId = stack.pop();

    if (!currentId) {
      continue;
    }

    const children = childrenByParentId.get(currentId) ?? [];

    for (const childId of children) {
      if (result.has(childId)) {
        continue;
      }

      result.add(childId);
      stack.push(childId);
    }
  }

  return Array.from(result);
}




export async function getOrganizationAggregateReport({
  tenantSlug,
  assessmentProjectId,
  clientOrganizationId,
  reportTemplateVersionId,
  previewMode = false,
}: {
  tenantSlug: string;
  assessmentProjectId: string;
  clientOrganizationId: string;
  reportTemplateVersionId: string;
  previewMode?: boolean;
}): Promise<AggregateReportData | null> {
  if (
    !tenantSlug ||
    !assessmentProjectId ||
    !clientOrganizationId ||
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
      config: reportTemplateVersions.config,
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

  if (!templateVersion) {
    return null;
  }

  if (templateVersion.reportTemplateKind !== "organization_aggregate") {
    return null;
  }

  const db = await getTenantDb(ctx);

  const [project] = await db
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
    .limit(1);

  if (!project) {
    return null;
  }

  const [organization] = await db
    .select({
      id: clientOrganizations.id,
      name: clientOrganizations.name,
      industry: clientOrganizations.industry,
      size: clientOrganizations.size,
    })
    .from(clientOrganizations)
    .where(
      and(
        eq(clientOrganizations.id, clientOrganizationId),
        isNull(clientOrganizations.deletedAt),
      ),
    )
    .limit(1);

  if (!organization) {
    return null;
  }

  const scoreRows = await db
    .select({
      assessmentSessionId: assessmentSessions.id,
      respondentId: assessmentSessions.respondentId,

      questionnaireId: assessmentDimensionScores.questionnaireId,
      questionnaireVersionId: assessmentDimensionScores.questionnaireVersionId,
      questionnaireDimensionId:
        assessmentDimensionScores.questionnaireDimensionId,

      dimensionCode: assessmentDimensionScores.dimensionCode,
      dimensionName: assessmentDimensionScores.dimensionName,

      rawScore: assessmentDimensionScores.rawScore,
      weightedScore: assessmentDimensionScores.weightedScore,
      meanScore: assessmentDimensionScores.meanScore,
      weightedMeanScore: assessmentDimensionScores.weightedMeanScore,
      normalizedScore: assessmentDimensionScores.normalizedScore,

      answeredItemsCount: assessmentDimensionScores.answeredItemsCount,
      expectedItemsCount: assessmentDimensionScores.expectedItemsCount,
      completeness: assessmentDimensionScores.completeness,
    })
    .from(assessmentDimensionScores)
    .innerJoin(
      assessmentSessions,
      eq(
        assessmentSessions.id,
        assessmentDimensionScores.assessmentSessionId,
      ),
    )
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentSessions.respondentId),
    )
    .where(
      and(
        eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
        eq(respondents.clientOrganizationId, clientOrganizationId),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.deletedAt),
        isNull(respondents.deletedAt),
        isNull(assessmentDimensionScores.deletedAt),
      ),
    );
const snapshotRows = await db
  .select({
    assessmentSessionId: assessmentSessions.id,
    respondentId: assessmentSessions.respondentId,
    snapshotId: assessmentResultSnapshots.id,
    payload: assessmentResultSnapshots.payload,
  })
  .from(assessmentResultSnapshots)
  .innerJoin(
    assessmentSessions,
    eq(
      assessmentSessions.id,
      assessmentResultSnapshots.assessmentSessionId,
    ),
  )
  .innerJoin(
    respondents,
    eq(respondents.id, assessmentSessions.respondentId),
  )
  .where(
    and(
      eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
      eq(respondents.clientOrganizationId, clientOrganizationId),
      eq(assessmentSessions.status, "completed"),
      isNull(assessmentSessions.deletedAt),
      isNull(respondents.deletedAt),
      isNull(assessmentResultSnapshots.deletedAt),
    ),
  );
  const rows = scoreRows.map((row) => ({
    ...row,
    rawScore: Number(row.rawScore),
    weightedScore: Number(row.weightedScore),
    meanScore: Number(row.meanScore),
    weightedMeanScore: Number(row.weightedMeanScore),
    normalizedScore:
      row.normalizedScore === null ? null : Number(row.normalizedScore),
    answeredItemsCount: Number(row.answeredItemsCount),
    expectedItemsCount: Number(row.expectedItemsCount),
    completeness: Number(row.completeness),
  }));

  const minimumN = readMinimumN(templateVersion.config, 5);

  const eligibility = buildAggregateEligibility({
    rows,
    minimumN,
  });

  const dimensionScores = aggregateDimensionScores(rows);
const crossScoreAggregation =
  aggregateCrossScoresFromSnapshots(snapshotRows);
  const payload = {
    version: 1,
    reportKind: "organization_aggregate",
    tenantSlug: ctx.tenantSlug,
    frozenAt: new Date().toISOString(),

    scope: {
      type: "client_organization_in_project",
      assessmentProjectId: project.id,
      clientOrganizationId: organization.id,
      label: `${organization.name} · ${project.name}`,
    },

    project: {
      id: project.id,
      name: project.name,
      description: project.description,
    },

    organization: {
      id: organization.id,
      name: organization.name,
      industry: organization.industry,
      size: organization.size,
    },

    aggregate: {
      status: eligibility.status,
      canRender: eligibility.canRender,
      warnings: eligibility.warnings,

      minimumN: eligibility.minimumN,
      nRespondents: eligibility.nRespondents,
      nSessions: eligibility.nSessions,
      nScores: eligibility.nScores,

      dimensionScores,
      crossScores: crossScoreAggregation.tree,
      crossScoreRows: crossScoreAggregation.rows,
      crossScorePairs: crossScoreAggregation.byPair,


    },
  };

  
  await writeTenantAuditLog({
    db,
    ctx,
    action: previewMode ? "report_previewed" : "report_viewed",
    entityType: "client_organization",
    entityId: organization.id,
    after: {
      assessmentProjectId,
      clientOrganizationId,
      reportTemplateVersionId,
      reportKind: "organization_aggregate",
      previewMode,
      eligibilityStatus: eligibility.status,
      nRespondents: eligibility.nRespondents,
      nSessions: eligibility.nSessions,
      nScores: eligibility.nScores,
    },
  });

  return {
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      name: "tenantName" in ctx ? String(ctx.tenantName ?? "") : null,
    },
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      industry: organization.industry,
      size: organization.size,
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



export async function getTeamAggregateReport({
  tenantSlug,
  assessmentProjectId,
  clientUnitId,
  reportTemplateVersionId,
  previewMode = false,
}: {
  tenantSlug: string;
  assessmentProjectId: string;
  clientUnitId: string;
  reportTemplateVersionId: string;
  previewMode?: boolean;
}): Promise<AggregateReportData | null> {
  if (
    !tenantSlug ||
    !assessmentProjectId ||
    !clientUnitId ||
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
      config: reportTemplateVersions.config,
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

  if (!templateVersion) {
    return null;
  }

  if (templateVersion.reportTemplateKind !== "team_aggregate") {
    return null;
  }

  const db = await getTenantDb(ctx);

  const [project] = await db
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
    .limit(1);

  if (!project) {
    return null;
  }

  const [rootUnit] = await db
    .select({
      id: clientUnits.id,
      clientOrganizationId: clientUnits.clientOrganizationId,
      parentId: clientUnits.parentId,
      name: clientUnits.name,
      type: clientUnits.type,
    })
    .from(clientUnits)
    .where(
      and(
        eq(clientUnits.id, clientUnitId),
        isNull(clientUnits.deletedAt),
      ),
    )
    .limit(1);

  if (!rootUnit) {
    return null;
  }

  const unitRows = await db
    .select({
      id: clientUnits.id,
      parentId: clientUnits.parentId,
    })
    .from(clientUnits)
    .where(
      and(
        eq(clientUnits.clientOrganizationId, rootUnit.clientOrganizationId),
        isNull(clientUnits.deletedAt),
      ),
    );

  const unitIds = collectClientUnitDescendantIds({
    units: unitRows,
    rootUnitId: rootUnit.id,
  });

  if (unitIds.length === 0) {
    return null;
  }

  const scoreRows = await db
    .select({
      assessmentSessionId: assessmentSessions.id,
      respondentId: assessmentSessions.respondentId,

      questionnaireId: assessmentDimensionScores.questionnaireId,
      questionnaireVersionId: assessmentDimensionScores.questionnaireVersionId,
      questionnaireDimensionId:
        assessmentDimensionScores.questionnaireDimensionId,

      dimensionCode: assessmentDimensionScores.dimensionCode,
      dimensionName: assessmentDimensionScores.dimensionName,

      rawScore: assessmentDimensionScores.rawScore,
      weightedScore: assessmentDimensionScores.weightedScore,
      meanScore: assessmentDimensionScores.meanScore,
      weightedMeanScore: assessmentDimensionScores.weightedMeanScore,
      normalizedScore: assessmentDimensionScores.normalizedScore,

      answeredItemsCount: assessmentDimensionScores.answeredItemsCount,
      expectedItemsCount: assessmentDimensionScores.expectedItemsCount,
      completeness: assessmentDimensionScores.completeness,
    })
    .from(assessmentDimensionScores)
    .innerJoin(
      assessmentSessions,
      eq(
        assessmentSessions.id,
        assessmentDimensionScores.assessmentSessionId,
      ),
    )
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentSessions.respondentId),
    )
    .where(
      and(
        eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
        inArray(respondents.clientUnitId, unitIds),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.deletedAt),
        isNull(respondents.deletedAt),
        isNull(assessmentDimensionScores.deletedAt),
      ),
    );
const snapshotRows = await db
  .select({
    assessmentSessionId: assessmentSessions.id,
    respondentId: assessmentSessions.respondentId,
    snapshotId: assessmentResultSnapshots.id,
    payload: assessmentResultSnapshots.payload,
  })
  .from(assessmentResultSnapshots)
  .innerJoin(
    assessmentSessions,
    eq(
      assessmentSessions.id,
      assessmentResultSnapshots.assessmentSessionId,
    ),
  )
  .innerJoin(
    respondents,
    eq(respondents.id, assessmentSessions.respondentId),
  )
  .where(
    and(
      eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
      inArray(respondents.clientUnitId, unitIds),
      eq(assessmentSessions.status, "completed"),
      isNull(assessmentSessions.deletedAt),
      isNull(respondents.deletedAt),
      isNull(assessmentResultSnapshots.deletedAt),
    ),
  );
  const rows = scoreRows.map((row) => ({
    ...row,
    rawScore: Number(row.rawScore),
    weightedScore: Number(row.weightedScore),
    meanScore: Number(row.meanScore),
    weightedMeanScore: Number(row.weightedMeanScore),
    normalizedScore:
      row.normalizedScore === null ? null : Number(row.normalizedScore),
    answeredItemsCount: Number(row.answeredItemsCount),
    expectedItemsCount: Number(row.expectedItemsCount),
    completeness: Number(row.completeness),
  }));

  const minimumN = readMinimumN(templateVersion.config, 5);

  const eligibility = buildAggregateEligibility({
    rows,
    minimumN,
  });

  const dimensionScores = aggregateDimensionScores(rows);
const crossScoreAggregation =
  aggregateCrossScoresFromSnapshots(snapshotRows);
  const payload = {
    version: 1,
    reportKind: "team_aggregate",
    tenantSlug: ctx.tenantSlug,
    frozenAt: new Date().toISOString(),

    scope: {
      type: "client_unit_in_project",
      assessmentProjectId: project.id,
      clientUnitId: rootUnit.id,
      includeDescendants: true,
      descendantUnitIds: unitIds,
      label: `${rootUnit.name} · ${project.name}`,
    },

    project: {
      id: project.id,
      name: project.name,
      description: project.description,
    },

    unit: {
      id: rootUnit.id,
      name: rootUnit.name,
      type: rootUnit.type,
      parentId: rootUnit.parentId,
      clientOrganizationId: rootUnit.clientOrganizationId,
      descendantUnitIds: unitIds,
      descendantUnitCount: unitIds.length,
    },

    team: {
      id: rootUnit.id,
      name: rootUnit.name,
      type: rootUnit.type,
      parentId: rootUnit.parentId,
      clientOrganizationId: rootUnit.clientOrganizationId,
      descendantUnitIds: unitIds,
      descendantUnitCount: unitIds.length,
    },

    aggregate: {
      status: eligibility.status,
      canRender: eligibility.canRender,
      warnings: eligibility.warnings,

      minimumN: eligibility.minimumN,
      nRespondents: eligibility.nRespondents,
      nSessions: eligibility.nSessions,
      nScores: eligibility.nScores,

      dimensionScores,
      crossScores: crossScoreAggregation.tree,
crossScoreRows: crossScoreAggregation.rows,
crossScorePairs: crossScoreAggregation.byPair,

    },
  };

  await writeTenantAuditLog({
    db,
    ctx,
    action: previewMode ? "report_previewed" : "report_viewed",
    entityType: "client_unit",
    entityId: rootUnit.id,
    after: {
      assessmentProjectId,
      clientUnitId: rootUnit.id,
      includedUnitIds: unitIds,
      reportTemplateVersionId,
      reportKind: "team_aggregate",
      previewMode,
      eligibilityStatus: eligibility.status,
      nRespondents: eligibility.nRespondents,
      nSessions: eligibility.nSessions,
      nScores: eligibility.nScores,
    },
  });

  return {
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      name: "tenantName" in ctx ? String(ctx.tenantName ?? "") : null,
    },
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
    },
    unit: {
      id: rootUnit.id,
      name: rootUnit.name,
      type: rootUnit.type,
      parentId: rootUnit.parentId,
      clientOrganizationId: rootUnit.clientOrganizationId,
      descendantUnitIds: unitIds,
      descendantUnitCount: unitIds.length,
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

function asRecord(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  return {};
}

function readMinimumN(config: unknown, fallback = 5) {
  const record = asRecord(config);
  const aggregation = asRecord(record.aggregation);
  const privacy = asRecord(record.privacy);

  const value =
    typeof aggregation.minimumN === "number"
      ? aggregation.minimumN
      : typeof privacy.minimumN === "number"
        ? privacy.minimumN
        : fallback;

  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
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

function aggregateDimensionScores(rows: ScoreRow[]) {
  const groups = new Map<string, ScoreRow[]>();

  for (const row of rows) {
    const key = [
      row.questionnaireId,
      row.questionnaireVersionId,
      row.questionnaireDimensionId,
      row.dimensionCode,
    ].join("::");

    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  const dimensions: AggregatedDimension[] = Array.from(groups.values()).map(
    (groupRows) => {
      const first = groupRows[0];

      const weightedMeanScores = groupRows.map(
        (row) => row.weightedMeanScore,
      );

      return {
        dimensionCode: first.dimensionCode,
        dimensionName: first.dimensionName,
        questionnaireId: first.questionnaireId,
        questionnaireVersionId: first.questionnaireVersionId,
        questionnaireDimensionId: first.questionnaireDimensionId,

        n: groupRows.length,

        meanRawScore: round(mean(groupRows.map((row) => row.rawScore))),
        meanWeightedScore: round(
          mean(groupRows.map((row) => row.weightedScore)),
        ),
        meanScore: round(mean(groupRows.map((row) => row.meanScore))),
        meanWeightedMeanScore: round(mean(weightedMeanScores)),
        meanNormalizedScore: round(
          mean(
            groupRows
              .map((row) => row.normalizedScore)
              .filter((value): value is number => value !== null),
          ),
        ),

        medianWeightedMeanScore: round(median(weightedMeanScores)),
        stdDevWeightedMeanScore: round(stdDev(weightedMeanScores)),
        minWeightedMeanScore: round(min(weightedMeanScores)),
        maxWeightedMeanScore: round(max(weightedMeanScores)),

        meanCompleteness: round(
          mean(groupRows.map((row) => row.completeness)),
        ),
      };
    },
  );

  dimensions.sort((a, b) => a.dimensionCode.localeCompare(b.dimensionCode));

  const byDimensionCode = Object.fromEntries(
    dimensions.map((dimension) => [dimension.dimensionCode, dimension]),
  );

  return {
    rows: dimensions,
    byDimensionCode,
  };
}

function buildAggregateEligibility({
  rows,
  minimumN,
}: {
  rows: ScoreRow[];
  minimumN: number;
}) {
  const respondentIds = new Set(rows.map((row) => row.respondentId));
  const sessionIds = new Set(rows.map((row) => row.assessmentSessionId));

  const nRespondents = respondentIds.size;
  const nSessions = sessionIds.size;
  const nScores = rows.length;

  if (nScores === 0) {
    return {
      status: "no_scores" as const,
      canRender: false,
      warnings: ["Brak wyników do agregacji."],
      minimumN,
      nRespondents,
      nSessions,
      nScores,
    };
  }

  if (nRespondents < minimumN) {
    return {
      status: "below_minimum_n" as const,
      canRender: false,
      warnings: [
        `Liczba respondentów (${nRespondents}) jest mniejsza niż wymagane minimum (${minimumN}).`,
      ],
      minimumN,
      nRespondents,
      nSessions,
      nScores,
    };
  }

  return {
    status: "ready" as const,
    canRender: true,
    warnings: [],
    minimumN,
    nRespondents,
    nSessions,
    nScores,
  };
}

export async function getProjectAggregateReport({
  tenantSlug,
  assessmentProjectId,
  reportTemplateVersionId,
  previewMode = false,
}: {
  tenantSlug: string;
  assessmentProjectId: string;
  reportTemplateVersionId: string;
  previewMode?: boolean;
}): Promise<AggregateReportData | null> {
  if (!tenantSlug || !assessmentProjectId || !reportTemplateVersionId) {
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
      config: reportTemplateVersions.config,
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

  if (!templateVersion) {
    return null;
  }

  if (templateVersion.reportTemplateKind !== "project_aggregate") {
    return null;
  }

  const db = await getTenantDb(ctx);

  const [project] = await db
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
    .limit(1);

  if (!project) {
    return null;
  }

  const scoreRows = await db
    .select({
      assessmentSessionId: assessmentSessions.id,
      respondentId: assessmentSessions.respondentId,

      questionnaireId: assessmentDimensionScores.questionnaireId,
      questionnaireVersionId: assessmentDimensionScores.questionnaireVersionId,
      questionnaireDimensionId: assessmentDimensionScores.questionnaireDimensionId,

      dimensionCode: assessmentDimensionScores.dimensionCode,
      dimensionName: assessmentDimensionScores.dimensionName,

      rawScore: assessmentDimensionScores.rawScore,
      weightedScore: assessmentDimensionScores.weightedScore,
      meanScore: assessmentDimensionScores.meanScore,
      weightedMeanScore: assessmentDimensionScores.weightedMeanScore,
      normalizedScore: assessmentDimensionScores.normalizedScore,

      answeredItemsCount: assessmentDimensionScores.answeredItemsCount,
      expectedItemsCount: assessmentDimensionScores.expectedItemsCount,
      completeness: assessmentDimensionScores.completeness,
    })
    .from(assessmentDimensionScores)
    .innerJoin(
      assessmentSessions,
      eq(
        assessmentSessions.id,
        assessmentDimensionScores.assessmentSessionId,
      ),
    )
    .where(
      and(
        eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentDimensionScores.deletedAt),
      ),
    );
const snapshotRows = await db
  .select({
    assessmentSessionId: assessmentSessions.id,
    respondentId: assessmentSessions.respondentId,
    snapshotId: assessmentResultSnapshots.id,
    payload: assessmentResultSnapshots.payload,
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
      eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
      eq(assessmentSessions.status, "completed"),
      isNull(assessmentSessions.deletedAt),
      isNull(assessmentResultSnapshots.deletedAt),
    ),
  );
  const rows = scoreRows.map((row) => ({
    ...row,
    rawScore: Number(row.rawScore),
    weightedScore: Number(row.weightedScore),
    meanScore: Number(row.meanScore),
    weightedMeanScore: Number(row.weightedMeanScore),
    normalizedScore:
      row.normalizedScore === null ? null : Number(row.normalizedScore),
    answeredItemsCount: Number(row.answeredItemsCount),
    expectedItemsCount: Number(row.expectedItemsCount),
    completeness: Number(row.completeness),
  }));

  const minimumN = readMinimumN(templateVersion.config, 5);

  const eligibility = buildAggregateEligibility({
    rows,
    minimumN,
  });

  const dimensionScores = aggregateDimensionScores(rows);
const crossScoreAggregation =
  aggregateCrossScoresFromSnapshots(snapshotRows);
  const payload = {
    version: 1,
    reportKind: "project_aggregate",
    tenantSlug: ctx.tenantSlug,
    frozenAt: new Date().toISOString(),

    scope: {
      type: "assessment_project",
      assessmentProjectId: project.id,
      label: project.name,
    },

    project: {
      id: project.id,
      name: project.name,
      description: project.description,
    },

    aggregate: {
      status: eligibility.status,
      canRender: eligibility.canRender,
      warnings: eligibility.warnings,

      minimumN: eligibility.minimumN,
      nRespondents: eligibility.nRespondents,
      nSessions: eligibility.nSessions,
      nScores: eligibility.nScores,

      dimensionScores,
    crossScores: crossScoreAggregation.tree,
    crossScoreRows: crossScoreAggregation.rows,
    crossScorePairs: crossScoreAggregation.byPair,


    },
  };

  await writeTenantAuditLog({
    db,
    ctx,
    action: previewMode ? "report_previewed" : "report_viewed",
    entityType: "assessment_project",
    entityId: project.id,
    after: {
      assessmentProjectId,
      reportTemplateVersionId,
      reportKind: "project_aggregate",
      previewMode,
      eligibilityStatus: eligibility.status,
      nRespondents: eligibility.nRespondents,
      nSessions: eligibility.nSessions,
      nScores: eligibility.nScores,
    },
  });

  return {
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      name: "tenantName" in ctx ? String(ctx.tenantName ?? "") : null,
    },
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
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