import { and, eq, isNull } from "drizzle-orm";

import {
  questionnaireDimensions,
  questionnaireItemDimensionScores,
  questionnaireItems,
  questionnairePages,
  questionnaireVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export type QuestionnaireVersionPublishingValidationResult = {
  valid: boolean;
  issues: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionsArray(value: unknown) {
  return Array.isArray(value);
}

function getNumberConfig(
  config: unknown,
  key: string,
  fallback: number | null = null,
) {
  if (!isObject(config)) {
    return fallback;
  }

  const value = config[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function getStringConfig(
  config: unknown,
  key: string,
  fallback: string | null = null,
) {
  if (!isObject(config)) {
    return fallback;
  }

  const value = config[key];

  return typeof value === "string" ? value : fallback;
}

function isScoredItemType(type: string) {
  return [
    "likert",
    "true_false",
    "single_choice",
    "multiple_choice",
    "number",
  ].includes(type);
}

function itemLabel(input: { code: string; text: string }) {
  const shortText =
    input.text.length > 80 ? `${input.text.slice(0, 80)}...` : input.text;

  return `${shortText} [${input.code}]`;
}

export async function validateQuestionnaireVersionForPublishing(
  versionId: string,
): Promise<QuestionnaireVersionPublishingValidationResult> {
  const issues: string[] = [];

  const version = await controlDb.query.questionnaireVersions.findFirst({
    where: and(
      eq(questionnaireVersions.id, versionId),
      isNull(questionnaireVersions.deletedAt),
    ),
  });

  if (!version) {
    return {
      valid: false,
      issues: ["Nie znaleziono wersji kwestionariusza."],
    };
  }

  if (version.status !== "draft") {
    issues.push(
      "Opublikować można tylko wersję roboczą. Ta wersja nie ma statusu draft.",
    );
  }

  const pages = await controlDb
    .select({
      id: questionnairePages.id,
      title: questionnairePages.title,
      orderIndex: questionnairePages.orderIndex,
    })
    .from(questionnairePages)
    .where(
      and(
        eq(questionnairePages.questionnaireVersionId, versionId),
        isNull(questionnairePages.deletedAt),
      ),
    );

  const items = await controlDb
    .select({
      id: questionnaireItems.id,
      code: questionnaireItems.code,
      questionnairePageId: questionnaireItems.questionnairePageId,
      type: questionnaireItems.type,
      text: questionnaireItems.text,
      required: questionnaireItems.required,
      scaleMin: questionnaireItems.scaleMin,
      scaleMax: questionnaireItems.scaleMax,
      scaleMinLabel: questionnaireItems.scaleMinLabel,
      scaleMaxLabel: questionnaireItems.scaleMaxLabel,
      options: questionnaireItems.options,
      responseConfig: questionnaireItems.responseConfig,
      orderIndex: questionnaireItems.orderIndex,
    })
    .from(questionnaireItems)
    .where(
      and(
        eq(questionnaireItems.questionnaireVersionId, versionId),
        isNull(questionnaireItems.deletedAt),
      ),
    );

  const dimensions = await controlDb
    .select({
      id: questionnaireDimensions.id,
      code: questionnaireDimensions.code,
      name: questionnaireDimensions.name,
    })
    .from(questionnaireDimensions)
    .where(
      and(
        eq(questionnaireDimensions.questionnaireVersionId, versionId),
        isNull(questionnaireDimensions.deletedAt),
      ),
    );

  if (items.length === 0) {
    issues.push("Wersja kwestionariusza nie ma żadnych aktywnych itemów.");
  }

  if (dimensions.length === 0) {
    issues.push("Wersja kwestionariusza nie ma żadnych aktywnych wymiarów.");
  }

  const itemsByPageId = new Map<string, number>();

  for (const item of items) {
    if (!item.questionnairePageId) {
      continue;
    }

    itemsByPageId.set(
      item.questionnairePageId,
      (itemsByPageId.get(item.questionnairePageId) ?? 0) + 1,
    );
  }

  for (const page of pages) {
    const count = itemsByPageId.get(page.id) ?? 0;

    if (count === 0) {
      issues.push(`Strona „${page.title}” nie ma żadnych aktywnych itemów.`);
    }
  }

  const itemDimensionRows = await controlDb
    .select({
      itemId: questionnaireItemDimensionScores.questionnaireItemId,
      dimensionId: questionnaireItemDimensionScores.questionnaireDimensionId,
    })
    .from(questionnaireItemDimensionScores)
    .where(isNull(questionnaireItemDimensionScores.deletedAt));

  const dimensionCountByItemId = new Map<string, number>();

  for (const row of itemDimensionRows) {
    dimensionCountByItemId.set(
      row.itemId,
      (dimensionCountByItemId.get(row.itemId) ?? 0) + 1,
    );
  }

  for (const item of items) {
    const label = itemLabel(item);

    if (!item.text.trim()) {
      issues.push(`Item ${label} nie ma treści.`);
    }

    if (isScoredItemType(item.type)) {
      const dimensionCount = dimensionCountByItemId.get(item.id) ?? 0;

      if (dimensionCount === 0) {
        issues.push(`Item scoringowy ${label} nie ma przypisanego wymiaru.`);
      }
    }

    if (item.type === "likert") {
      if (item.scaleMin === null || item.scaleMax === null) {
        issues.push(`Item Likerta ${label} nie ma ustawionego zakresu skali.`);
      } else if (item.scaleMin >= item.scaleMax) {
        issues.push(
          `Item Likerta ${label} ma niepoprawny zakres skali: minimum nie może być większe lub równe maksimum.`,
        );
      }

      const step = getNumberConfig(item.responseConfig, "step", 1);

      if (!step || step <= 0) {
        issues.push(`Item Likerta ${label} ma niepoprawny krok skali.`);
      }

      const display = getStringConfig(item.responseConfig, "display", "buttons");

      if (!["buttons", "radio", "slider"].includes(display ?? "")) {
        issues.push(
          `Item Likerta ${label} ma nieobsługiwany sposób wyświetlania.`,
        );
      }
    }

    if (item.type === "true_false") {
      if (!isOptionsArray(item.options) || item.options.length < 2) {
        issues.push(
          `Item prawda/fałsz ${label} powinien mieć dwie opcje odpowiedzi.`,
        );
      }
    }

    if (item.type === "single_choice" || item.type === "multiple_choice") {
      if (!isOptionsArray(item.options) || item.options.length < 2) {
        issues.push(
          `Item wyboru ${label} powinien mieć przynajmniej dwie opcje odpowiedzi.`,
        );
      }
    }

    if (item.type === "text") {
      const maxLength = getNumberConfig(item.responseConfig, "maxLength", 1000);

      if (!maxLength || maxLength <= 0) {
        issues.push(`Item tekstowy ${label} ma niepoprawny limit znaków.`);
      }
    }

    if (item.type === "number") {
      const min = getNumberConfig(item.responseConfig, "min", null);
      const max = getNumberConfig(item.responseConfig, "max", null);
      const step = getNumberConfig(item.responseConfig, "step", 1);

      if (min !== null && max !== null && min >= max) {
        issues.push(
          `Item liczbowy ${label} ma niepoprawny zakres: minimum nie może być większe lub równe maksimum.`,
        );
      }

      if (!step || step <= 0) {
        issues.push(`Item liczbowy ${label} ma niepoprawny krok.`);
      }
    }

    if (
      ![
        "likert",
        "true_false",
        "single_choice",
        "multiple_choice",
        "text",
        "number",
      ].includes(item.type)
    ) {
      issues.push(`Item ${label} ma nieobsługiwany typ: ${item.type}.`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}