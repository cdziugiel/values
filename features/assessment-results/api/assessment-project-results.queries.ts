import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireItems,
  questionnairePages,
  questionnaires,
  questionnaireVersions,
} from "@/drizzle/schema";
import {
  assessmentDimensionScores,
  assessmentProjectQuestionnaires,
  assessmentProjects,
  assessmentResponses,
  assessmentSessions,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

type OptionWithOptionalScore = {
  value: string | number | boolean;
  label?: string;
  score?: number | string | null;
};

export type AssessmentProjectDimensionAggregate = {
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  sessionsCount: number;
  averageRawScore: number | null;
  averageWeightedScore: number | null;
  averageMeanScore: number | null;
  averageWeightedMeanScore: number | null;
  averageCompleteness: number | null;
};

export type AssessmentProjectCategoricalAggregateOption = {
  value: string;
  label: string;
  count: number;
  percentage: number | null;
};

export type AssessmentProjectCategoricalAggregate = {
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
  itemId: string;
  itemCode: string;
  itemText: string;
  itemType: string;
  pageTitle: string | null;
  totalAnswersCount: number;
  options: AssessmentProjectCategoricalAggregateOption[];
};

export type AssessmentProjectResultsData = {
  tenant: {
    id: string;
    slug: string;
    name: string | null;
  };
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
  };
  summary: {
    sessionsCount: number;
    completedSessionsCount: number;
    inProgressSessionsCount: number;
    notStartedSessionsCount: number;
  };
  dimensionAggregates: AssessmentProjectDimensionAggregate[];
  categoricalAggregates: AssessmentProjectCategoricalAggregate[];
};

function round4(value: number) {
  return Number(value.toFixed(4));
}

function optionValueToString(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function normalizeOptions(value: unknown): OptionWithOptionalScore[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((option) => {
      if (typeof option !== "object" || option === null) {
        return null;
      }

      const raw = option as Record<string, unknown>;
      const optionValue = raw.value;

      if (
        typeof optionValue !== "string" &&
        typeof optionValue !== "number" &&
        typeof optionValue !== "boolean"
      ) {
        return null;
      }

      return {
        value: optionValue,
        label: typeof raw.label === "string" ? raw.label : undefined,
        score:
          typeof raw.score === "number" || typeof raw.score === "string"
            ? raw.score
            : null,
      };
    })
    .filter(Boolean) as OptionWithOptionalScore[];
}

function optionHasScore(option: OptionWithOptionalScore) {
  if (typeof option.score === "number" && Number.isFinite(option.score)) {
    return true;
  }

  if (typeof option.score === "string" && option.score.trim() !== "") {
    return Number.isFinite(Number(option.score));
  }

  return false;
}

function itemIsCategoricalWithoutScore(item: {
  itemType: string;
  options: unknown;
}) {
  if (
    item.itemType !== "single_choice" &&
    item.itemType !== "multiple_choice"
  ) {
    return false;
  }

  const options = normalizeOptions(item.options);

  if (options.length === 0) {
    return false;
  }

  return !options.some(optionHasScore);
}

function getOptionLabel({
  options,
  value,
}: {
  options: unknown;
  value: string;
}) {
  const normalizedOptions = normalizeOptions(options);

  const option = normalizedOptions.find(
    (candidate) => optionValueToString(candidate.value) === value,
  );

  return option?.label ?? value;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return round4(values.reduce((acc, value) => acc + value, 0) / values.length);
}

export async function getAssessmentProjectResults({
  tenantSlug,
  assessmentProjectId,
}: {
  tenantSlug: string;
  assessmentProjectId: string;
}): Promise<AssessmentProjectResultsData | null> {
  if (!tenantSlug) {
    throw new Error("Missing tenantSlug in getAssessmentProjectResults.");
  }

  if (!assessmentProjectId) {
    throw new Error("Missing assessmentProjectId in getAssessmentProjectResults.");
  }

  const tenantContext = await requireTenantContext({ tenantSlug });
  const db = await getTenantDb(tenantContext);

  const project = await db.query.assessmentProjects.findFirst({
    where: and(
      eq(assessmentProjects.id, assessmentProjectId),
      isNull(assessmentProjects.deletedAt),
    ),
  });

  if (!project) {
    return null;
  }

  const sessions = await db
    .select({
      id: assessmentSessions.id,
      status: assessmentSessions.status,
    })
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
        isNull(assessmentSessions.deletedAt),
      ),
    );

  const sessionIds = sessions.map((session) => session.id);
  const completedSessionIds = sessions
    .filter((session) => session.status === "completed")
    .map((session) => session.id);

  const projectQuestionnaires = await db
    .select({
      questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
      orderIndex: assessmentProjectQuestionnaires.orderIndex,
    })
    .from(assessmentProjectQuestionnaires)
    .where(
      and(
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          assessmentProjectId,
        ),
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    )
    .orderBy(asc(assessmentProjectQuestionnaires.orderIndex));

  const questionnaireVersionIds = projectQuestionnaires.map(
    (item) => item.questionnaireVersionId,
  );

  let dimensionAggregates: AssessmentProjectDimensionAggregate[] = [];
  let categoricalAggregates: AssessmentProjectCategoricalAggregate[] = [];

  if (completedSessionIds.length > 0) {
    const scoreRows = await db
      .select({
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
        completeness: assessmentDimensionScores.completeness,
        assessmentSessionId: assessmentDimensionScores.assessmentSessionId,
      })
      .from(assessmentDimensionScores)
      .where(
        and(
          inArray(
            assessmentDimensionScores.assessmentSessionId,
            completedSessionIds,
          ),
          isNull(assessmentDimensionScores.deletedAt),
        ),
      );

    const versionMetaRows =
      questionnaireVersionIds.length > 0
        ? await controlDb
            .select({
              questionnaireId: questionnaires.id,
              questionnaireName: questionnaires.name,
              questionnaireVersionId: questionnaireVersions.id,
              questionnaireVersionName: questionnaireVersions.name,
            })
            .from(questionnaireVersions)
            .innerJoin(
              questionnaires,
              eq(questionnaires.id, questionnaireVersions.questionnaireId),
            )
            .where(
              and(
                inArray(questionnaireVersions.id, questionnaireVersionIds),
                isNull(questionnaireVersions.deletedAt),
                isNull(questionnaires.deletedAt),
              ),
            )
        : [];

    const versionMetaById = new Map(
      versionMetaRows.map((row) => [row.questionnaireVersionId, row]),
    );

    const dimensionMap = new Map<
      string,
      {
        questionnaireId: string;
        questionnaireVersionId: string;
        questionnaireName: string;
        questionnaireVersionName: string;
        dimensionId: string;
        dimensionCode: string;
        dimensionName: string;
        sessionIds: Set<string>;
        rawScores: number[];
        weightedScores: number[];
        meanScores: number[];
        weightedMeanScores: number[];
        completenessValues: number[];
      }
    >();

    for (const score of scoreRows) {
      const key = `${score.questionnaireVersionId}:${score.questionnaireDimensionId}`;
      const versionMeta = versionMetaById.get(score.questionnaireVersionId);

      const aggregate =
        dimensionMap.get(key) ??
        {
          questionnaireId: score.questionnaireId,
          questionnaireVersionId: score.questionnaireVersionId,
          questionnaireName: versionMeta?.questionnaireName ?? "—",
          questionnaireVersionName: versionMeta?.questionnaireVersionName ?? "—",
          dimensionId: score.questionnaireDimensionId,
          dimensionCode: score.dimensionCode,
          dimensionName: score.dimensionName,
          sessionIds: new Set<string>(),
          rawScores: [],
          weightedScores: [],
          meanScores: [],
          weightedMeanScores: [],
          completenessValues: [],
        };

      aggregate.sessionIds.add(score.assessmentSessionId);
      aggregate.rawScores.push(Number(score.rawScore));
      aggregate.weightedScores.push(Number(score.weightedScore));
      aggregate.meanScores.push(Number(score.meanScore));
      aggregate.weightedMeanScores.push(Number(score.weightedMeanScore));
      aggregate.completenessValues.push(Number(score.completeness));

      dimensionMap.set(key, aggregate);
    }

    dimensionAggregates = Array.from(dimensionMap.values())
      .map((aggregate) => ({
        questionnaireId: aggregate.questionnaireId,
        questionnaireVersionId: aggregate.questionnaireVersionId,
        questionnaireName: aggregate.questionnaireName,
        questionnaireVersionName: aggregate.questionnaireVersionName,
        dimensionId: aggregate.dimensionId,
        dimensionCode: aggregate.dimensionCode,
        dimensionName: aggregate.dimensionName,
        sessionsCount: aggregate.sessionIds.size,
        averageRawScore: average(aggregate.rawScores),
        averageWeightedScore: average(aggregate.weightedScores),
        averageMeanScore: average(aggregate.meanScores),
        averageWeightedMeanScore: average(aggregate.weightedMeanScores),
        averageCompleteness: average(aggregate.completenessValues),
      }))
      .sort((a, b) => {
        const questionnaireCompare = a.questionnaireName.localeCompare(
          b.questionnaireName,
          "pl",
        );

        if (questionnaireCompare !== 0) {
          return questionnaireCompare;
        }

        return a.dimensionCode.localeCompare(b.dimensionCode, "pl");
      });
  }

  if (questionnaireVersionIds.length > 0 && sessionIds.length > 0) {
    const itemRows = await controlDb
      .select({
        itemId: questionnaireItems.id,
        itemCode: questionnaireItems.code,
        itemText: questionnaireItems.text,
        itemType: questionnaireItems.type,
        options: questionnaireItems.options,
        orderIndex: questionnaireItems.orderIndex,

        questionnaireId: questionnaires.id,
        questionnaireName: questionnaires.name,
        questionnaireVersionId: questionnaireVersions.id,
        questionnaireVersionName: questionnaireVersions.name,

        pageTitle: questionnairePages.title,
        pageOrderIndex: questionnairePages.orderIndex,
      })
      .from(questionnaireItems)
      .innerJoin(
        questionnaireVersions,
        eq(questionnaireVersions.id, questionnaireItems.questionnaireVersionId),
      )
      .innerJoin(
        questionnaires,
        eq(questionnaires.id, questionnaireVersions.questionnaireId),
      )
      .leftJoin(
        questionnairePages,
        and(
          eq(questionnairePages.id, questionnaireItems.questionnairePageId),
          eq(
            questionnairePages.questionnaireVersionId,
            questionnaireItems.questionnaireVersionId,
          ),
          isNull(questionnairePages.deletedAt),
        ),
      )
      .where(
        and(
          inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
          isNull(questionnaireItems.deletedAt),
          isNull(questionnaireVersions.deletedAt),
          isNull(questionnaires.deletedAt),
        ),
      )
      .orderBy(
        asc(questionnaires.name),
        asc(questionnaireVersions.name),
        asc(questionnairePages.orderIndex),
        asc(questionnaireItems.orderIndex),
      );

    const categoricalItems = itemRows.filter(itemIsCategoricalWithoutScore);
    const categoricalItemIds = categoricalItems.map((item) => item.itemId);

    if (categoricalItemIds.length > 0) {
      const responseRows = await db
        .select({
          questionnaireItemId: assessmentResponses.questionnaireItemId,
          textValue: assessmentResponses.textValue,
          jsonValue: assessmentResponses.jsonValue,
        })
        .from(assessmentResponses)
        .where(
          and(
            inArray(assessmentResponses.assessmentSessionId, sessionIds),
            inArray(assessmentResponses.questionnaireItemId, categoricalItemIds),
            isNull(assessmentResponses.deletedAt),
          ),
        );

      const responsesByItemId = new Map<
        string,
        {
          textValue: string | null;
          jsonValue: unknown | null;
        }[]
      >();

      for (const response of responseRows) {
        const existing = responsesByItemId.get(response.questionnaireItemId) ?? [];
        existing.push({
          textValue: response.textValue,
          jsonValue: response.jsonValue,
        });
        responsesByItemId.set(response.questionnaireItemId, existing);
      }

      categoricalAggregates = categoricalItems.map((item) => {
        const counts = new Map<string, number>();
        const responses = responsesByItemId.get(item.itemId) ?? [];

        for (const response of responses) {
          if (item.itemType === "single_choice" && response.textValue) {
            counts.set(
              response.textValue,
              (counts.get(response.textValue) ?? 0) + 1,
            );
          }

          if (
            item.itemType === "multiple_choice" &&
            Array.isArray(response.jsonValue)
          ) {
            for (const value of response.jsonValue) {
              const key = String(value);
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
          }
        }

        const totalAnswersCount = Array.from(counts.values()).reduce(
          (acc, count) => acc + count,
          0,
        );

        return {
          questionnaireId: item.questionnaireId,
          questionnaireVersionId: item.questionnaireVersionId,
          questionnaireName: item.questionnaireName,
          questionnaireVersionName: item.questionnaireVersionName,
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemText: item.itemText,
          itemType: item.itemType,
          pageTitle: item.pageTitle,
          totalAnswersCount,
          options: Array.from(counts.entries())
            .map(([value, count]) => ({
              value,
              label: getOptionLabel({
                options: item.options,
                value,
              }),
              count,
              percentage:
                totalAnswersCount > 0 ? round4(count / totalAnswersCount) : null,
            }))
            .sort((a, b) => b.count - a.count),
        };
      });
    }
  }

  return {
    tenant: {
      id: tenantContext.tenantId,
      slug: tenantContext.tenantSlug,
      name:
        "tenantName" in tenantContext
          ? String(tenantContext.tenantName ?? "")
          : null,
    },
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
    },
    summary: {
      sessionsCount: sessions.length,
      completedSessionsCount: sessions.filter(
        (session) => session.status === "completed",
      ).length,
      inProgressSessionsCount: sessions.filter(
        (session) => session.status === "in_progress",
      ).length,
      notStartedSessionsCount: sessions.filter(
        (session) => session.status === "not_started",
      ).length,
    },
    dimensionAggregates,
    categoricalAggregates,
  };
}