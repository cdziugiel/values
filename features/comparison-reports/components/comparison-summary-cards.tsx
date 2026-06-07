// features/comparison-reports/components/comparison-summary-cards.tsx

// features/comparison-reports/components/comparison-summary-cards.tsx

import { ArrowRightLeft, Layers3, Scale, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ComparisonReportData } from "../types/comparison-report.types";

type ComparisonSummaryCardsProps = {
  data: ComparisonReportData;
};

function getFiniteScores(data: ComparisonReportData) {
  return data.rows
    .flatMap((row) => [row.leftScore, row.rightScore])
    .filter((value): value is number => value != null && Number.isFinite(value));
}

function inferScoreScale(data: ComparisonReportData) {
  if (data.metadata.scoreScale) {
    return data.metadata.scoreScale;
  }

  const scores = getFiniteScores(data);

  if (!scores.length) {
    return {
      min: 0,
      max: 1,
      label: "Brak danych skali",
    };
  }

  const minObserved = Math.min(...scores);
  const maxObserved = Math.max(...scores);

  if (minObserved < 0) {
    return {
      min: -3,
      max: 3,
      label: "Skala -3 do 3",
    };
  }

  if (maxObserved <= 7) {
    return {
      min: 1,
      max: 7,
      label: "Skala 1 do 7",
    };
  }

  return {
    min: minObserved,
    max: maxObserved,
    label: "Skala niestandardowa",
  };
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

function getAverageAbsDelta(data: ComparisonReportData) {
  const values = data.rows
    .map((row) => row.absDelta)
    .filter((value): value is number => value != null && Number.isFinite(value));

  if (!values.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getSimilarityLabel(avgAbsDelta: number | null, scaleRange: number) {
  if (avgAbsDelta == null) return "Brak danych";

  const normalized = scaleRange > 0 ? avgAbsDelta / scaleRange : avgAbsDelta;

  if (normalized < 0.08) return "Bardzo podobne profile";
  if (normalized < 0.18) return "Raczej zbliżone profile";
  if (normalized < 0.32) return "Wyraźnie różne profile";
  return "Silnie odmienne profile";
}

function getCategoryLabel(category: string | null) {
  if (!category) return "Pozostałe";
  return category;
}

export function ComparisonSummaryCards({ data }: ComparisonSummaryCardsProps) {
  const scale = inferScoreScale(data);
  const scaleRange = Math.max(scale.max - scale.min, 1);

  const avgAbsDelta = getAverageAbsDelta(data);

  const strongestDifference =
    [...data.rows]
      .filter((row) => row.absDelta != null)
      .sort((a, b) => (b.absDelta ?? 0) - (a.absDelta ?? 0))[0] ?? null;

  const comparableRows = data.rows.filter(
    (row) => row.leftScore != null && row.rightScore != null,
  ).length;

  const categoriesCount = new Set(
    data.rows.map((row) => getCategoryLabel(row.category)),
  ).size;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-muted/80 bg-gradient-to-br from-background to-muted/30">
        <CardContent className="flex gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Scale className="h-5 w-5 text-primary" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ogólna zgodność
            </p>
            <p className="mt-1 text-base font-semibold">
              {getSimilarityLabel(avgAbsDelta, scaleRange)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Średnia różnica: {formatScore(avgAbsDelta)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/80 bg-gradient-to-br from-background to-muted/30">
        <CardContent className="flex gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Największa różnica
            </p>
            <p className="mt-1 text-base font-semibold">
              {strongestDifference?.name ?? "Brak danych"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Różnica: {formatScore(strongestDifference?.absDelta)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/80 bg-gradient-to-br from-background to-muted/30">
        <CardContent className="flex gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Layers3 className="h-5 w-5 text-primary" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Kategorie
            </p>
            <p className="mt-1 text-base font-semibold">{categoriesCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Grupy wymiarów w porównaniu.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/80 bg-gradient-to-br from-background to-muted/30">
        <CardContent className="flex gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Zakres wyniku
            </p>
            <p className="mt-1 text-base font-semibold">{scale.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {scale.min} do {scale.max}, {comparableRows} wymiarów.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}