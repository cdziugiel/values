// features/comparison-reports/lib/comparison-deltas.ts

import type {
  ComparisonDeltaRow,
  ComparisonDimensionScore,
} from "../types/comparison-report.types";

function resolveMeaning(absDelta: number | null): ComparisonDeltaRow["meaning"] {
  if (absDelta == null) return "missing";
  if (absDelta < 0.25) return "same";
  if (absDelta < 0.75) return "small";
  if (absDelta < 1.25) return "medium";
  return "large";
}

export function buildComparisonDeltaRows(params: {
  leftScores: ComparisonDimensionScore[];
  rightScores: ComparisonDimensionScore[];
}): ComparisonDeltaRow[] {
  const rightByCode = new Map(
    params.rightScores.map((score) => [score.code, score]),
  );

  return params.leftScores.map((left) => {
    const right = rightByCode.get(left.code) ?? null;

    const leftScore = left.score;
    const rightScore = right?.score ?? null;

    const delta =
      leftScore == null || rightScore == null ? null : leftScore - rightScore;

    const absDelta = delta == null ? null : Math.abs(delta);

    return {
      dimensionId: left.dimensionId,
      code: left.code,
      name: left.name,
      category: left.category,
      leftScore,
      rightScore,
      delta,
      absDelta,
      meaning: resolveMeaning(absDelta),
    };
  });
}