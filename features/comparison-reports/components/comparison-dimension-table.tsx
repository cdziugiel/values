// features/comparison-reports/components/comparison-dimension-table.tsx
// features/comparison-reports/components/comparison-dimension-table.tsx

import { Badge } from "@/components/ui/badge";
import type {
  ComparisonDeltaRow,
  ComparisonReportData,
} from "../types/comparison-report.types";

type ComparisonDimensionTableProps = {
  data: ComparisonReportData;
};

type ScoreScale = {
  min: number;
  max: number;
  label: string;
};

function formatScore(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

function formatDelta(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function getMeaningLabel(meaning: string) {
  switch (meaning) {
    case "same":
      return "bardzo podobnie";
    case "small":
      return "mała różnica";
    case "medium":
      return "wyraźna różnica";
    case "large":
      return "duża różnica";
    default:
      return "brak danych";
  }
}

function getCategoryLabel(category: string | null) {
  if (!category) return "Pozostałe wymiary";

  const labels: Record<string, string> = {
    vMEME: "Systemy wartości",
    AREA: "Obszary funkcjonowania",
    IDENTITY: "Tożsamość",
    STYLE: "Styl działania",
    CULTURE: "Kultura organizacyjna",
    STRUCTURE: "Kształt organizacji",
  };

  return labels[category] ?? category;
}

function inferScoreScale(data: ComparisonReportData): ScoreScale {
  if (data.metadata.scoreScale) {
    return {
      min: data.metadata.scoreScale.min,
      max: data.metadata.scoreScale.max,
      label:
        data.metadata.scoreScale.label ??
        `Skala ${data.metadata.scoreScale.min} do ${data.metadata.scoreScale.max}`,
    };
  }

  const scores = data.rows
    .flatMap((row) => [row.leftScore, row.rightScore])
    .filter((value): value is number => value != null && Number.isFinite(value));

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

function normalizeScore(value: number | null, scale: ScoreScale) {
  if (value == null || Number.isNaN(value)) return 0;

  const range = scale.max - scale.min;

  if (range <= 0) return 0;

  const normalized = ((value - scale.min) / range) * 100;

  return Math.max(0, Math.min(100, normalized));
}

function normalizeAbsDelta(absDelta: number | null, scale: ScoreScale) {
  if (absDelta == null || Number.isNaN(absDelta)) return 0;

  const range = Math.max(scale.max - scale.min, 1);
  const normalized = (absDelta / range) * 100;

  return Math.max(0, Math.min(100, normalized));
}

function groupRowsByCategory(rows: ComparisonDeltaRow[]) {
  const groups = new Map<string, ComparisonDeltaRow[]>();

  for (const row of rows) {
    const key = getCategoryLabel(row.category);
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .map(([categoryLabel, categoryRows]) => ({
      categoryLabel,
      rows: categoryRows.sort(
        (a, b) => (b.absDelta ?? -1) - (a.absDelta ?? -1),
      ),
    }))
    .sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel, "pl"));
}

function getCategoryStats(rows: ComparisonDeltaRow[]) {
  const comparable = rows.filter(
    (row) => row.leftScore != null && row.rightScore != null,
  );

  if (!comparable.length) {
    return {
      count: rows.length,
      avgAbsDelta: null,
    };
  }

  const avgAbsDelta =
    comparable.reduce((sum, row) => sum + (row.absDelta ?? 0), 0) /
    comparable.length;

  return {
    count: rows.length,
    avgAbsDelta,
  };
}

export function ComparisonDimensionTable({
  data,
}: ComparisonDimensionTableProps) {
  const scale = inferScoreScale(data);
  const groups = groupRowsByCategory(data.rows);

  if (!data.rows.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
        <p className="text-sm font-medium">Brak wspólnych wymiarów</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Wybrane wyniki nie mają wspólnych wymiarów do porównania.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="border-b bg-muted/30 px-5 py-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Różnice w wymiarach</h2>
            <p className="text-sm text-muted-foreground">
              Wyniki pogrupowane według kategorii wymiarów.
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            {scale.label} · różnica = {data.left.label} minus {data.right.label}
          </div>
        </div>
      </div>

      <div className="divide-y">
        {groups.map((group) => {
          const stats = getCategoryStats(group.rows);

          return (
            <section key={group.categoryLabel}>
              <div className="flex flex-col gap-2 bg-muted/20 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">
                    {group.categoryLabel}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stats.count} wymiarów
                    {stats.avgAbsDelta != null
                      ? ` · średnia różnica ${stats.avgAbsDelta.toFixed(2)}`
                      : ""}
                  </p>
                </div>

                <Badge variant="outline">
                  {stats.avgAbsDelta != null
                    ? `Δ ${stats.avgAbsDelta.toFixed(2)}`
                    : "brak danych"}
                </Badge>
              </div>

              <div className="divide-y">
                {group.rows.map((row) => {
                  const leftWidth = normalizeScore(row.leftScore, scale);
                  const rightWidth = normalizeScore(row.rightScore, scale);
                  const deltaWidth = normalizeAbsDelta(row.absDelta, scale);

                  return (
                    <div
                      key={row.dimensionId}
                      className="grid gap-4 px-5 py-4 transition-colors hover:bg-muted/20 lg:grid-cols-[minmax(220px,1.1fr)_minmax(320px,1.4fr)_120px_140px]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{row.name}</p>
                          <Badge variant="outline" className="text-[11px]">
                            {row.code}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate text-muted-foreground">
                              {data.left.label}
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatScore(row.leftScore)}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${leftWidth}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate text-muted-foreground">
                              {data.right.label}
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatScore(row.rightScore)}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-muted-foreground/60 transition-all"
                              style={{ width: `${rightWidth}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-muted-foreground">
                              Siła różnicy
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatScore(row.absDelta)}
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-foreground/70 transition-all"
                              style={{ width: `${deltaWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center lg:justify-end">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Różnica
                          </p>
                          <p className="text-lg font-semibold tabular-nums">
                            {formatDelta(row.delta)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center lg:justify-end">
                        <Badge variant="outline">
                          {getMeaningLabel(row.meaning)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}