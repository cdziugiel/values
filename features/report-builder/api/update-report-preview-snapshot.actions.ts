"use server";

import {
  and,
  eq,
  gt,
  isNull,
} from "drizzle-orm";

import { reportPreviewSnapshots } from "@/drizzle/schema";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";

import { getReportTemplateVersionForRender } from "./report-render.queries";

import { renderReportDocument } from "../lib/report-template-renderer";

type ScorePatch = {
  dimensionCategory: string;
  dimensionCode: string;
  value: number | null;
};

type CrossScorePatch = {
  primaryCategory: string;
  primaryCode: string;
  filterCategory: string;
  filterCode: string;
  value: number | null;
};

type UpdateSyntheticReportPreviewInput = {
  reportTemplateVersionId: string;
  previewSnapshotId: string;
  scores: ScorePatch[];
  crossScores: CrossScorePatch[];
};

type UpdateSyntheticReportPreviewResult =
  | {
      success: true;
      html: string;
      savedAt: string;
      visiblePagesCount: number;
    }
  | {
      success: false;
      message: string;
    };


function metricValue(
  metric: unknown,
): number | null {
  if (!isRecord(metric)) {
    return null;
  }

  return (
    normalizeNumber(
      metric.weightedMeanScore,
    ) ??
    normalizeNumber(metric.meanScore) ??
    normalizeNumber(
      metric.normalizedScore,
    ) ??
    normalizeNumber(
      metric.weightedScore,
    ) ??
    normalizeNumber(metric.rawScore)
  );
}

function isRecord(
  value: unknown,
): value is Record<string, any> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function normalizeCategory(value: string) {
  return value.trim();
}

function normalizeNumber(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return null;
}

function buildMetric(value: number | null) {
  return {
    rawScore: value,
    weightedScore: value,
    meanScore: value,
    weightedMeanScore: value,
    normalizedScore: value,
    completeness: value === null ? null : 1,
  };
}

function setCrossScore(input: {
  crossScores: Record<string, any>;
  primaryCategory: string;
  primaryCode: string;
  filterCategory: string;
  filterCode: string;
  value: number | null;
}) {
  const {
    crossScores,
    primaryCategory,
    primaryCode,
    filterCategory,
    filterCode,
    value,
  } = input;

  crossScores[primaryCategory] ??= {};

  crossScores[primaryCategory][primaryCode] ??= {
    by: {},
  };

  crossScores[primaryCategory][primaryCode].by ??= {};

  crossScores[primaryCategory][primaryCode].by[
    filterCategory
  ] ??= {};

  crossScores[primaryCategory][primaryCode].by[
    filterCategory
  ][filterCode] = buildMetric(value);
}

export async function updateSyntheticReportPreviewAction(
  input: UpdateSyntheticReportPreviewInput,
): Promise<UpdateSyntheticReportPreviewResult> {
  const user = await requireSuperAdmin();

  try {
    if (
      !input.reportTemplateVersionId ||
      !input.previewSnapshotId
    ) {
      return {
        success: false,
        message:
          "Brakuje identyfikatora raportu lub snapshotu.",
      };
    }

    if (
      input.scores.length > 1000 ||
      input.crossScores.length > 10000
    ) {
      return {
        success: false,
        message:
          "Konfiguracja podglądu jest zbyt duża.",
      };
    }

    const preview =
      await controlDb.query.reportPreviewSnapshots.findFirst(
        {
          where: and(
            eq(
              reportPreviewSnapshots.id,
              input.previewSnapshotId,
            ),
            eq(
              reportPreviewSnapshots
                .reportTemplateVersionId,
              input.reportTemplateVersionId,
            ),
            eq(
              reportPreviewSnapshots.createdBy,
              user.id,
            ),
            gt(
              reportPreviewSnapshots.expiresAt,
              new Date(),
            ),
            isNull(
              reportPreviewSnapshots.deletedAt,
            ),
          ),
          columns: {
            id: true,
            payload: true,
          },
        },
      );

    if (!preview) {
      return {
        success: false,
        message:
          "Snapshot nie istnieje, wygasł albo nie należy do tego użytkownika.",
      };
    }

    const existingPayload = isRecord(preview.payload)
      ? preview.payload
      : {};

    const existingScores = Array.isArray(
      existingPayload.scores,
    )
      ? existingPayload.scores
      : [];

    const scorePatchByPath = new Map(
      input.scores.map((score) => [
        [
          normalizeCategory(
            score.dimensionCategory,
          ),
          normalizeCode(score.dimensionCode),
        ].join("::"),
        normalizeNumber(score.value),
      ]),
    );

const dimensions = Array.isArray(
  existingPayload.dimensions,
)
  ? existingPayload.dimensions.filter(
      isRecord,
    )
  : [];

const existingScoreByPath = new Map(
  existingScores
    .filter(isRecord)
    .map((score) => [
      [
        String(
          score.dimensionCategory ??
            "__NO_CATEGORY__",
        ),
        String(
          score.dimensionCode ??
            "UNKNOWN",
        )
          .trim()
          .toUpperCase(),
      ].join("::"),
      score,
    ]),
);

const updatedScores = dimensions.map(
  (dimension) => {
    const dimensionCategory =
      typeof dimension.dimensionCategory ===
      "string"
        ? dimension.dimensionCategory
        : "__NO_CATEGORY__";

    const dimensionCode =
      typeof dimension.dimensionCode ===
      "string"
        ? dimension.dimensionCode
            .trim()
            .toUpperCase()
        : "UNKNOWN";

    const patchKey = [
      dimensionCategory,
      dimensionCode,
    ].join("::");

    const existingScore =
      existingScoreByPath.get(patchKey);

    const value =
      scorePatchByPath.has(patchKey)
        ? scorePatchByPath.get(patchKey) ??
          null
        : existingScore
          ? metricValue(existingScore)
          : null;

    return {
      ...(existingScore ?? {}),

      id:
        existingScore?.id ??
        `preview:${String(
          dimension.dimensionId ??
            patchKey,
        )}`,

      questionnaireId:
        existingScore?.questionnaireId ??
        existingPayload.questionnaires?.[0]
          ?.questionnaireId ??
        null,

      questionnaireVersionId:
        existingScore
          ?.questionnaireVersionId ??
        existingPayload.questionnaires?.[0]
          ?.questionnaireVersionId ??
        null,

      dimensionId:
        dimension.dimensionId ?? null,

      dimensionCode,

      dimensionName:
        dimension.dimensionName ??
        dimensionCode,

      dimensionCategory,

      dimensionCategoryLabel:
        dimension.dimensionCategoryLabel ??
        dimensionCategory,

      dimensionCategoryOrderIndex:
        dimension
          .dimensionCategoryOrderIndex ?? 0,

      dimensionOrderIndex:
        dimension.dimensionOrderIndex ?? 0,

      rawScore: value,
      weightedScore: value,
      meanScore: value,
      weightedMeanScore: value,
      normalizedScore: value,

      answeredItemsCount:
        value === null ? 0 : 1,

      expectedItemsCount: 1,

      completeness:
        value === null ? 0 : 1,
    };
  },
);

    const updatedCrossScores = isRecord(
      existingPayload.crossScores,
    )
      ? structuredClone(
          existingPayload.crossScores,
        )
      : {};

for (const patch of input.crossScores) {
  const primaryCategory =
    normalizeCategory(
      patch.primaryCategory,
    );

  const primaryCode = normalizeCode(
    patch.primaryCode,
  );

  const filterCategory =
    normalizeCategory(
      patch.filterCategory,
    );

  const filterCode = normalizeCode(
    patch.filterCode,
  );

  const value = normalizeNumber(
    patch.value,
  );

  /**
   * Kierunek wpisany w panelu:
   *
   * AREA.BELIEFS
   *   .by.vMEME.TRADITION
   */
  setCrossScore({
    crossScores: updatedCrossScores,
    primaryCategory,
    primaryCode,
    filterCategory,
    filterCode,
    value,
  });

  /**
   * Kierunek lustrzany:
   *
   * vMEME.TRADITION
   *   .by.AREA.BELIEFS
   *
   * Jest konieczny, ponieważ bindingi raportów
   * mogą używać dowolnego z tych kierunków.
   */
  setCrossScore({
    crossScores: updatedCrossScores,
    primaryCategory: filterCategory,
    primaryCode: filterCode,
    filterCategory: primaryCategory,
    filterCode: primaryCode,
    value,
  });
}

    const now = new Date();

    const updatedPayload = {
      ...existingPayload,

      frozenAt: now.toISOString(),

      preview: {
        ...(isRecord(existingPayload.preview)
          ? existingPayload.preview
          : {}),

        synthetic: true,
        source: "report-builder",
        updatedAt: now.toISOString(),
        updatedBy: user.id,
      },

      scores: updatedScores,
      crossScores: updatedCrossScores,
    };

    await controlDb
      .update(reportPreviewSnapshots)
      .set({
        payload: updatedPayload,
        updatedAt: now,
        updatedBy: user.id,
      })
      .where(
        and(
          eq(
            reportPreviewSnapshots.id,
            input.previewSnapshotId,
          ),
          eq(
            reportPreviewSnapshots.createdBy,
            user.id,
          ),
          isNull(
            reportPreviewSnapshots.deletedAt,
          ),
        ),
      );

    const reportTemplateVersion =
      await getReportTemplateVersionForRender({
        reportTemplateVersionId:
          input.reportTemplateVersionId,
      });

    if (!reportTemplateVersion) {
      return {
        success: false,
        message:
          "Nie znaleziono wersji szablonu raportu.",
      };
    }

    const rendered = renderReportDocument({
      reportTemplateVersion,
      payload: updatedPayload,
    });

    return {
      success: true,
      html: rendered.html,
      savedAt: now.toISOString(),
      visiblePagesCount:
        rendered.visiblePages.length,
    };
  } catch (error) {
    console.error(
      "[updateSyntheticReportPreviewAction]",
      {
        userId: user.id,
        previewSnapshotId:
          input.previewSnapshotId,
        reportTemplateVersionId:
          input.reportTemplateVersionId,
        error,
      },
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zaktualizować podglądu.",
    };
  }
}