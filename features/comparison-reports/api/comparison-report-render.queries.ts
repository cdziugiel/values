import { and, eq, isNull } from "drizzle-orm";

import { assessmentProjects } from "@/drizzle/schema/tenant";
import { getMyAssessmentTenantDbBySlug } from "@/features/my-assessment/api/my-assessment-tenant-db";
import { controlDb } from "@/server/db/control-db";

import { buildComparisonDeltaRows } from "../lib/comparison-deltas";
import { resolveMySessionComparisonScores } from "../lib/resolve-my-session-comparison-scores";

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && !!item)
    : [];
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === "string" && !!value)),
  );
}

function getComparisonGroupSessionIds(group: {
  assessmentSessionId: string | null;
  assessmentSessionIds: string[];
}) {
  if (group.assessmentSessionIds.length > 0) {
    return group.assessmentSessionIds;
  }

  if (group.assessmentSessionId) {
    return [group.assessmentSessionId];
  }

  return [];
}

function getScoreKey(score: any) {
  return (
    score.questionnaireDimensionId ??
    score.dimensionId ??
    score.id ??
    score.code ??
    score.name ??
    null
  );
}

function getNumericScoreValue(score: any) {
  const candidates = [
    score.score,
    score.meanScore,
    score.weightedMeanScore,
    score.value,
    score.rawScore,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function averageScores(scoreGroups: any[][]) {
  const bucket = new Map<
    string,
    {
      base: any;
      values: number[];
      n: number;
    }
  >();

  for (const scores of scoreGroups) {
    for (const score of scores) {
      const key = getScoreKey(score);
      const value = getNumericScoreValue(score);

      if (!key || value === null) {
        continue;
      }

      const existing =
        bucket.get(String(key)) ??
        {
          base: score,
          values: [],
          n: 0,
        };

      existing.values.push(value);
      existing.n += 1;

      bucket.set(String(key), existing);
    }
  }

  return Array.from(bucket.values()).map((item) => {
    const mean =
      item.values.reduce((sum, value) => sum + value, 0) /
      Math.max(item.values.length, 1);

    return {
      ...item.base,

      score: mean,
      meanScore: mean,
      weightedMeanScore:
        item.base.weightedMeanScore === undefined ? undefined : mean,
      value: item.base.value === undefined ? undefined : mean,

      n: item.n,
    };
  });
}

export function readComparisonDefinition(metadata: unknown) {
  const record = asRecord(metadata);
  const definition = asRecord(record.comparisonDefinition);

  if (!definition.mode || !Array.isArray(definition.groups)) {
    return null;
  }

  const groups = asArray(definition.groups)
    .map((group) => {
      const row = asRecord(group);

      const assessmentSessionId =
        typeof row.assessmentSessionId === "string"
          ? row.assessmentSessionId
          : null;

      const assessmentSessionIds = asStringArray(row.assessmentSessionIds);

      return {
        key: typeof row.key === "string" ? row.key : "",
        label: typeof row.label === "string" ? row.label : "",
        subjectType:
          typeof row.subjectType === "string" ? row.subjectType : "",
        subjectId: typeof row.subjectId === "string" ? row.subjectId : "",

        respondentId:
          typeof row.respondentId === "string" ? row.respondentId : null,
        respondentIds: asStringArray(row.respondentIds),

        assessmentSessionId,
        assessmentSessionIds:
          assessmentSessionIds.length > 0
            ? assessmentSessionIds
            : assessmentSessionId
              ? [assessmentSessionId]
              : [],

        questionnaireVersionId:
          typeof row.questionnaireVersionId === "string"
            ? row.questionnaireVersionId
            : null,

        n: typeof row.n === "number" ? row.n : null,
      };
    })
    .filter((group) => group.key && getComparisonGroupSessionIds(group).length > 0);

  if (groups.length < 2) {
    return null;
  }

  return {
    mode: String(definition.mode),
    questionnaireId:
      typeof definition.questionnaireId === "string"
        ? definition.questionnaireId
        : null,
    questionnaireVersionId:
      typeof definition.questionnaireVersionId === "string"
        ? definition.questionnaireVersionId
        : null,
    groups,
  };
}

type GetUserVsUserComparisonReportInput = {
  tenantSlug: string;
  assessmentProjectId: string;
  reportTemplateVersionId: string;
  comparisonDefinition: NonNullable<
    ReturnType<typeof readComparisonDefinition>
  >;
};

async function resolveComparisonGroupScores({
  db,
  questionnaireVersionId,
  group,
}: {
  db: any;
  questionnaireVersionId: string;
  group: NonNullable<ReturnType<typeof readComparisonDefinition>>["groups"][number];
}) {
  const assessmentSessionIds = getComparisonGroupSessionIds(group);

  const results = await Promise.all(
    assessmentSessionIds.map((assessmentSessionId) =>
      resolveMySessionComparisonScores({
        db,
        controlDb,
        assessmentSessionId,
        questionnaireVersionId,
      }),
    ),
  );

  const visibleResults = results.filter(
    (result) => result.visibility.canShow && result.scores.length > 0,
  );

  const respondentIds = uniqueStrings(
    visibleResults.map((result) => result.respondentId),
  );

  const questionnaireIds = uniqueStrings(
    visibleResults.map((result) => result.questionnaireId),
  );

  const questionnaireVersionIds = uniqueStrings(
    visibleResults.map((result) => result.questionnaireVersionId),
  );

  const scores =
    visibleResults.length === 1
      ? visibleResults[0].scores
      : averageScores(visibleResults.map((result) => result.scores));

  return {
    key: group.key,
    label: group.label,
    subjectType: group.subjectType,
    subjectId: group.subjectId,

    respondentId:
      respondentIds.length === 1 ? respondentIds[0] : null,
    respondentIds,

    assessmentSessionId:
      assessmentSessionIds.length === 1 ? assessmentSessionIds[0] : null,
    assessmentSessionIds,

    questionnaireId:
      questionnaireIds.length === 1 ? questionnaireIds[0] : null,
    questionnaireVersionId:
      questionnaireVersionIds.length === 1
        ? questionnaireVersionIds[0]
        : questionnaireVersionId,

    scores,

    visibility: {
      canShow: visibleResults.length > 0 && scores.length > 0,
    },

    nRespondents: respondentIds.length,
    nSessions: visibleResults.length,
    nScores: scores.length,

    sourceResults: results,
  };
}

function buildBlockedResponse(input: {
  project: any;
  status: string;
  warnings: string[];
  nRespondents?: number;
  nSessions?: number;
  nScores?: number;
}) {
  return {
    reportTemplateId: null,
    reportTemplate: {
      versionStatus: "unknown",
    },
    project: input.project,
    eligibility: {
      canRender: false,
      status: input.status,
      warnings: input.warnings,
      nRespondents: input.nRespondents ?? 0,
      nSessions: input.nSessions ?? 0,
      nScores: input.nScores ?? 0,
      minimumN: 1,
    },
    payload: null,
  };
}

export async function getUserVsUserComparisonReport({
  tenantSlug,
  assessmentProjectId,
  reportTemplateVersionId,
  comparisonDefinition,
}: GetUserVsUserComparisonReportInput) {
  const tenant = await getMyAssessmentTenantDbBySlug(tenantSlug);

  if (!tenant) {
    return null;
  }

  const db = tenant.db;

  const questionnaireVersionId = comparisonDefinition.questionnaireVersionId;

  const [project] = await db
    .select({
      id: assessmentProjects.id,
      name: assessmentProjects.name,
      clientOrganizationId: assessmentProjects.clientOrganizationId,
    })
    .from(assessmentProjects)
    .where(
      and(
        eq(assessmentProjects.id, assessmentProjectId),
        isNull(assessmentProjects.deletedAt),
      ),
    )
    .limit(1);

  if (!questionnaireVersionId) {
    return buildBlockedResponse({
      project,
      status: "missing_questionnaire_version",
      warnings: ["Brakuje wersji kwestionariusza w konfiguracji porównania."],
    });
  }

  const leftGroup = comparisonDefinition.groups[0];
  const rightGroup = comparisonDefinition.groups[1];

  if (!leftGroup || !rightGroup) {
    return buildBlockedResponse({
      project,
      status: "missing_groups",
      warnings: ["Raport dopasowania wymaga dwóch obiektów porównania."],
    });
  }

  const leftSessionIds = getComparisonGroupSessionIds(leftGroup);
  const rightSessionIds = getComparisonGroupSessionIds(rightGroup);

  if (!leftSessionIds.length || !rightSessionIds.length) {
    return buildBlockedResponse({
      project,
      status: "missing_sessions",
      warnings: ["Brakuje identyfikatorów sesji dla porównywanych wyników."],
    });
  }

  const [left, right] = await Promise.all([
    resolveComparisonGroupScores({
      db,
      questionnaireVersionId,
      group: leftGroup,
    }),
    resolveComparisonGroupScores({
      db,
      questionnaireVersionId,
      group: rightGroup,
    }),
  ]);

  const warnings: string[] = [];

  if (!left.visibility.canShow) {
    warnings.push("Nie można wyświetlić pierwszego wyniku porównania.");
  }

  if (!right.visibility.canShow) {
    warnings.push("Nie można wyświetlić drugiego wyniku porównania.");
  }

  if (
    left.questionnaireId &&
    right.questionnaireId &&
    left.questionnaireId !== right.questionnaireId
  ) {
    warnings.push("Porównywane wyniki pochodzą z różnych kwestionariuszy.");
  }

  const rows =
    warnings.length === 0
      ? buildComparisonDeltaRows({
          leftScores: left.scores,
          rightScores: right.scores,
        })
      : [];

  const canRender = warnings.length === 0 && rows.length > 0;

  const payload = {
    version: 1,
    reportKind: "comparison",
    tenantSlug,
    frozenAt: new Date().toISOString(),

    project: project
      ? {
          id: project.id,
          name: project.name,
          clientOrganizationId: project.clientOrganizationId,
        }
      : null,

    comparison: {
      mode: comparisonDefinition.mode,
      questionnaireId: comparisonDefinition.questionnaireId,
      questionnaireVersionId: comparisonDefinition.questionnaireVersionId,

      left: {
        key: leftGroup.key,
        label: leftGroup.label || "Pierwszy wynik",
        subjectType: leftGroup.subjectType,
        subjectId: leftGroup.subjectId,

        respondentId: left.respondentId,
        respondentIds: left.respondentIds,

        assessmentSessionId: left.assessmentSessionId,
        assessmentSessionIds: left.assessmentSessionIds,

        scores: left.scores,
        questionnaireId: left.questionnaireId,
        questionnaireVersionId: left.questionnaireVersionId,

        nRespondents: left.nRespondents,
        nSessions: left.nSessions,
        nScores: left.nScores,
      },

      right: {
        key: rightGroup.key,
        label: rightGroup.label || "Drugi wynik",
        subjectType: rightGroup.subjectType,
        subjectId: rightGroup.subjectId,

        respondentId: right.respondentId,
        respondentIds: right.respondentIds,

        assessmentSessionId: right.assessmentSessionId,
        assessmentSessionIds: right.assessmentSessionIds,

        scores: right.scores,
        questionnaireId: right.questionnaireId,
        questionnaireVersionId: right.questionnaireVersionId,

        nRespondents: right.nRespondents,
        nSessions: right.nSessions,
        nScores: right.nScores,
      },

      rows,

      metadata: {
        generatedAt: new Date().toISOString(),
        warnings,
      },
    },
  };

  return {
    reportTemplateId: null,
    reportTemplate: {
      versionStatus: "active",
    },
    project,
    comparison: payload.comparison,
    eligibility: {
      canRender,
      status: canRender ? "ready" : "blocked",
      warnings,
      nRespondents: left.nRespondents + right.nRespondents,
      nSessions: left.nSessions + right.nSessions,
      nScores: left.scores.length + right.scores.length,
      minimumN: 1,
    },
    payload,
  };
}