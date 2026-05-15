import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { requirePermission } from "@/server/permissions/require-permission";
import { getAssessmentSessionReportHref } from "./assessment-session-report.queries";

import {
  questionnaireDimensions,
  questionnaireItemDimensionScores,
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
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { getTenantDb } from "@/server/db/tenant-db";
import { controlDb } from "@/server/db/control-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

export type AssessmentSessionResultScore = {
  id: string;
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
  updatedAt: Date;
};

type ResponseValue = {
  valueType: string;
  numberValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  jsonValue: unknown | null;
};

type OptionWithOptionalScore = {
  value: string | number | boolean;
  label?: string;
  score?: number | string | null;
};

export type AssessmentSessionResponseDiagnosticDimension = {
  scoreConfigId: string;
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  weight: string | number | null;
  reverseScored: boolean;
  numericScoreBeforeReverse: number | null;
  numericScoreAfterReverse: number | null;
  weightedScore: number | null;
};

export type AssessmentSessionResponseDiagnosticItem = {
  itemId: string;
  itemCode: string;
  itemText: string;
  itemType: string;
  required: boolean;
  orderIndex: number;

  questionnaireId: string;
  questionnaireName: string;
  questionnaireVersionId: string;
  questionnaireVersionName: string;

  pageId: string | null;
  pageTitle: string | null;
  pageOrderIndex: number | null;

  responseExists: boolean;
  responseValueType: string | null;
  responseDisplayValue: string;
  numericScore: number | null;
  contributesNumericScore: boolean;

  dimensions: AssessmentSessionResponseDiagnosticDimension[];
};

export type AssessmentSessionResultsData = {
  tenant: {
    id: string;
    slug: string;
    name?: string | null;
  };
  session: {
    id: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
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
  scores: AssessmentSessionResultScore[];
  responseDiagnostics: AssessmentSessionResponseDiagnosticItem[];
  reportHref: string | null;
};

function getDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ");

  return name || input.email || input.externalCode || "Respondent";
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

      const rawScore = raw.score;
      let score: number | null = null;

      if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
        score = rawScore;
      }

      if (typeof rawScore === "string" && rawScore.trim() !== "") {
        const parsed = Number(rawScore);
        score = Number.isFinite(parsed) ? parsed : null;
      }

      return {
        value: optionValue,
        label: typeof raw.label === "string" ? raw.label : undefined,
        score,
      };
    })
    .filter(Boolean) as OptionWithOptionalScore[];
}

function optionValueToString(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
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

function getResponseDisplayValue({
  itemType,
  options,
  response,
}: {
  itemType: string;
  options: unknown;
  response: ResponseValue | undefined;
}) {
  if (!response) {
    return "—";
  }

  if (itemType === "likert" || itemType === "number") {
    return response.numberValue === null ? "—" : String(response.numberValue);
  }

  if (itemType === "true_false") {
    if (typeof response.booleanValue !== "boolean") {
      return "—";
    }

    return response.booleanValue ? "Prawda" : "Fałsz";
  }

  if (itemType === "single_choice") {
    if (!response.textValue) {
      return "—";
    }

    return getOptionLabel({
      options,
      value: response.textValue,
    });
  }

  if (itemType === "multiple_choice") {
    if (!Array.isArray(response.jsonValue)) {
      return "—";
    }

    return response.jsonValue
      .map((value) =>
        getOptionLabel({
          options,
          value: String(value),
        }),
      )
      .join(", ");
  }

  if (itemType === "text") {
    return response.textValue || "—";
  }

  return "—";
}

function getResponseNumericScore({
  item,
  response,
}: {
  item: {
    type: string;
    options: unknown;
  };
  response: ResponseValue | undefined;
}) {
  if (!response) {
    return null;
  }

  if (item.type === "likert" || item.type === "number") {
    return typeof response.numberValue === "number" ? response.numberValue : null;
  }

  if (item.type === "true_false") {
    if (typeof response.booleanValue !== "boolean") {
      return null;
    }

    return response.booleanValue ? 1 : 0;
  }

  if (item.type === "single_choice") {
    if (!response.textValue) {
      return null;
    }

    const options = normalizeOptions(item.options);
    const selected = options.find(
      (option) => optionValueToString(option.value) === response.textValue,
    );

    return typeof selected?.score === "number" ? selected.score : null;
  }

  if (item.type === "multiple_choice") {
    if (!Array.isArray(response.jsonValue)) {
      return null;
    }

    const selectedValues = response.jsonValue.map(String);
    const options = normalizeOptions(item.options);

    const scores = selectedValues
      .map((selectedValue) => {
        const option = options.find(
          (candidate) => optionValueToString(candidate.value) === selectedValue,
        );

        return typeof option?.score === "number" ? option.score : null;
      })
      .filter((score): score is number => typeof score === "number");

    if (scores.length === 0) {
      return null;
    }

    const sum = scores.reduce((acc, score) => acc + score, 0);

    return sum / scores.length;
  }

  return null;
}

function itemCanContributeNumericScore(item: {
  type: string;
  options: unknown;
}) {
  if (item.type === "likert") {
    return true;
  }

  if (item.type === "number") {
    return true;
  }

  if (item.type === "true_false") {
    return true;
  }

  if (item.type === "single_choice" || item.type === "multiple_choice") {
    return normalizeOptions(item.options).some(
      (option) => typeof option.score === "number",
    );
  }

  return false;
}

function reverseScore({
  score,
  item,
}: {
  score: number;
  item: {
    type: string;
    scaleMin: number | null;
    scaleMax: number | null;
  };
}) {
  if (item.type === "likert") {
    const min = item.scaleMin ?? 1;
    const max = item.scaleMax ?? 5;

    return max + min - score;
  }

  if (item.type === "true_false") {
    return score === 1 ? 0 : 1;
  }

  return -score;
}

function round4(value: number) {
  return Number(value.toFixed(4));
}

export async function getAssessmentSessionResults({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}): Promise<AssessmentSessionResultsData | null> {
  if (!tenantSlug) {
    throw new Error("Missing tenantSlug in getAssessmentSessionResults.");
  }

  if (!sessionId) {
    throw new Error("Missing sessionId in getAssessmentSessionResults.");
  }

  const tenantContext = await requireTenantContext({ tenantSlug });
  const db = await getTenantDb(tenantContext);
  requirePermission(tenantContext, "assessment_result:read");
  const rows = await db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      sessionStartedAt: assessmentSessions.startedAt,
      sessionCompletedAt: assessmentSessions.completedAt,

      projectId: assessmentProjects.id,
      projectName: assessmentProjects.name,
      projectDescription: assessmentProjects.description,

      respondentId: respondents.id,
      respondentExternalCode: respondents.externalCode,

      respondentEmail: respondentIdentities.email,
      respondentFirstName: respondentIdentities.firstName,
      respondentLastName: respondentIdentities.lastName,
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
    .where(
      and(
        eq(assessmentSessions.id, sessionId),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(respondents.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

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
        eq(assessmentProjectQuestionnaires.assessmentProjectId, row.projectId),
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    )
    .orderBy(asc(assessmentProjectQuestionnaires.orderIndex));

  const questionnaireVersionIds = projectQuestionnaires.map(
    (item) => item.questionnaireVersionId,
  );

  const scores = await db
    .select({
      id: assessmentDimensionScores.id,
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
      updatedAt: assessmentDimensionScores.updatedAt,
    })
    .from(assessmentDimensionScores)
    .where(
      and(
        eq(assessmentDimensionScores.assessmentSessionId, sessionId),
        isNull(assessmentDimensionScores.deletedAt),
      ),
    )
    .orderBy(asc(assessmentDimensionScores.dimensionCode));

  let responseDiagnostics: AssessmentSessionResponseDiagnosticItem[] = [];

  if (questionnaireVersionIds.length > 0) {
    const itemRows = await controlDb
      .select({
        itemId: questionnaireItems.id,
        itemCode: questionnaireItems.code,
        itemText: questionnaireItems.text,
        itemType: questionnaireItems.type,
        required: questionnaireItems.required,
        orderIndex: questionnaireItems.orderIndex,
        scaleMin: questionnaireItems.scaleMin,
        scaleMax: questionnaireItems.scaleMax,
        options: questionnaireItems.options,

        questionnaireId: questionnaires.id,
        questionnaireName: questionnaires.name,
        questionnaireVersionId: questionnaireVersions.id,
        questionnaireVersionName: questionnaireVersions.name,

        pageId: questionnairePages.id,
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

    const itemIds = itemRows.map((item) => item.itemId);

    const responseRows =
      itemIds.length > 0
        ? await db
          .select({
            questionnaireItemId: assessmentResponses.questionnaireItemId,
            valueType: assessmentResponses.valueType,
            numberValue: assessmentResponses.numberValue,
            textValue: assessmentResponses.textValue,
            booleanValue: assessmentResponses.booleanValue,
            jsonValue: assessmentResponses.jsonValue,
          })
          .from(assessmentResponses)
          .where(
            and(
              eq(assessmentResponses.assessmentSessionId, sessionId),
              inArray(assessmentResponses.questionnaireItemId, itemIds),
              isNull(assessmentResponses.deletedAt),
            ),
          )
        : [];

    const responseByItemId = new Map<string, ResponseValue>();

    for (const response of responseRows) {
      responseByItemId.set(response.questionnaireItemId, {
        valueType: response.valueType,
        numberValue: response.numberValue,
        textValue: response.textValue,
        booleanValue: response.booleanValue,
        jsonValue: response.jsonValue,
      });
    }

    const dimensionRows =
      itemIds.length > 0
        ? await controlDb
          .select({
            scoreConfigId: questionnaireItemDimensionScores.id,
            itemId: questionnaireItemDimensionScores.questionnaireItemId,
            dimensionId:
              questionnaireItemDimensionScores.questionnaireDimensionId,
            weight: questionnaireItemDimensionScores.weight,
            reverseScored: questionnaireItemDimensionScores.reverseScored,
            dimensionCode: questionnaireDimensions.code,
            dimensionName: questionnaireDimensions.name,
          })
          .from(questionnaireItemDimensionScores)
          .innerJoin(
            questionnaireDimensions,
            eq(
              questionnaireDimensions.id,
              questionnaireItemDimensionScores.questionnaireDimensionId,
            ),
          )
          .where(
            and(
              inArray(questionnaireItemDimensionScores.questionnaireItemId, itemIds),
              isNull(questionnaireItemDimensionScores.deletedAt),
              isNull(questionnaireDimensions.deletedAt),
            ),
          )
        : [];

    const dimensionsByItemId = new Map<
      string,
      typeof dimensionRows
    >();

    for (const dimensionRow of dimensionRows) {
      const existing = dimensionsByItemId.get(dimensionRow.itemId) ?? [];
      existing.push(dimensionRow);
      dimensionsByItemId.set(dimensionRow.itemId, existing);
    }

    responseDiagnostics = itemRows.map((item) => {
      const response = responseByItemId.get(item.itemId);

      const numericScore = getResponseNumericScore({
        item: {
          type: item.itemType,
          options: item.options,
        },
        response,
      });

      const dimensions = (dimensionsByItemId.get(item.itemId) ?? []).map(
        (dimension) => {
          const numericScoreAfterReverse =
            numericScore === null
              ? null
              : dimension.reverseScored
                ? reverseScore({
                  score: numericScore,
                  item: {
                    type: item.itemType,
                    scaleMin: item.scaleMin,
                    scaleMax: item.scaleMax,
                  },
                })
                : numericScore;

          const weight = Number(dimension.weight ?? 1);
          const safeWeight = Number.isFinite(weight) ? weight : 1;

          return {
            scoreConfigId: dimension.scoreConfigId,
            dimensionId: dimension.dimensionId,
            dimensionCode: dimension.dimensionCode,
            dimensionName: dimension.dimensionName,
            weight: dimension.weight,
            reverseScored: dimension.reverseScored,
            numericScoreBeforeReverse: numericScore,
            numericScoreAfterReverse,
            weightedScore:
              numericScoreAfterReverse === null
                ? null
                : round4(numericScoreAfterReverse * safeWeight),
          };
        },
      );

      return {
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemText: item.itemText,
        itemType: item.itemType,
        required: item.required,
        orderIndex: item.orderIndex,

        questionnaireId: item.questionnaireId,
        questionnaireName: item.questionnaireName,
        questionnaireVersionId: item.questionnaireVersionId,
        questionnaireVersionName: item.questionnaireVersionName,

        pageId: item.pageId,
        pageTitle: item.pageTitle,
        pageOrderIndex: item.pageOrderIndex,

        responseExists: Boolean(response),
        responseValueType: response?.valueType ?? null,
        responseDisplayValue: getResponseDisplayValue({
          itemType: item.itemType,
          options: item.options,
          response,
        }),
        numericScore,
        contributesNumericScore: itemCanContributeNumericScore({
          type: item.itemType,
          options: item.options,
        }),

        dimensions,
      };
    });
  }
  const reportHref =
    row.sessionStatus === "completed"
      ? await getAssessmentSessionReportHref({
        tenantSlug,
        sessionId,
      })
      : null;
  return {
    tenant: {
      id: tenantContext.tenantId,
      slug: tenantContext.tenantSlug,
      name:
        "tenantName" in tenantContext
          ? String(tenantContext.tenantName ?? "")
          : null,
    },
    session: {
      id: row.sessionId,
      status: row.sessionStatus,
      startedAt: row.sessionStartedAt,
      completedAt: row.sessionCompletedAt,
    },
    project: {
      id: row.projectId,
      name: row.projectName,
      description: row.projectDescription,
    },
    respondent: {
      id: row.respondentId,
      email: row.respondentEmail,
      externalCode: row.respondentExternalCode,
      displayName: getDisplayName({
        firstName: row.respondentFirstName,
        lastName: row.respondentLastName,
        email: row.respondentEmail,
        externalCode: row.respondentExternalCode,
      }),
    },
    scores,
    responseDiagnostics,
    reportHref,
  };
}