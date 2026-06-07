// features/comparison-reports/lib/resolve-questionnaire-dimension-categories.ts

import { inArray, isNull } from "drizzle-orm";

import { questionnaireDimensions } from "@/drizzle/schema/shared/questionnaire-dimensions";
import { controlDb } from "@/server/db/control-db";

type ResolveQuestionnaireDimensionCategoriesInput = {
  controlDb: typeof controlDb;
  dimensionIds: string[];
};

export async function resolveQuestionnaireDimensionCategories({
  controlDb,
  dimensionIds,
}: ResolveQuestionnaireDimensionCategoriesInput) {
  const uniqueDimensionIds = Array.from(new Set(dimensionIds)).filter(Boolean);

  if (!uniqueDimensionIds.length) {
    return new Map<string, string | null>();
  }

  const rows = await controlDb
    .select({
      id: questionnaireDimensions.id,
      category: questionnaireDimensions.category,
    })
    .from(questionnaireDimensions)
    .where(
      inArray(questionnaireDimensions.id, uniqueDimensionIds),
    );

  return new Map(rows.map((row) => [row.id, row.category ?? null]));
}