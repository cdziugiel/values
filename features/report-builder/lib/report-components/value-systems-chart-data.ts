// features/report-builder/lib/report-components/value-systems-chart-data.ts
import type { ReportContext } from "../report-context";
import type { ValueSystemChartItem } from "./value-systems-bar-chart";

type ChartMetric =
  | "rawScore"
  | "weightedScore"
  | "meanScore"
  | "weightedMeanScore"
  | "normalizedScore";

type ValueSystemsChartSource = "scores" | "crossScores";

type ValueSystemDefinition = {
  code: string;
  label: string;
  shortLabel: string;
  aliases?: string[];
};

const VALUE_SYSTEM_DEFINITIONS: ValueSystemDefinition[] = [
  {
    code: "HOLISM",
    label: "HOLIZM",
    shortLabel: "Holizm",
    aliases: ["HOLISTIC"],
  },
  {
    code: "MINDFULNESS",
    label: "UWAŻNOŚĆ",
    shortLabel: "Uważność",
    aliases: ["SYSTEMIC"],
  },
  {
    code: "MEDIATION",
    label: "MEDIACJE",
    shortLabel: "Mediacje",
    aliases: ["COMMUNITY"],
  },
  {
    code: "ASPIRATIONS",
    label: "ASPIRACJE",
    shortLabel: "Aspiracje",
  },
  {
    code: "NORMS",
    label: "NORMY",
    shortLabel: "Normy",
    aliases: ["STABILITY"],
  },
  {
    code: "EXPANSION",
    label: "EKSPANSJA",
    shortLabel: "Ekspansja",
  },
  {
    code: "TRADITION",
    label: "TRADYCJA",
    shortLabel: "Tradycja",
  },
];

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readMetric(
  value: Record<string, unknown> | undefined,
  metric: ChartMetric,
) {
  return numberOrZero(value?.[metric]);
}

function resolveCrossScoreNode({
  context,
  targetCategory,
  definition,
}: {
  context: ReportContext;
  targetCategory: string;
  definition: ValueSystemDefinition;
}) {
  const targetGroup = context.crossScores[targetCategory];

  if (!targetGroup) {
    return undefined;
  }

  return (
    targetGroup[definition.code] ??
    (definition.aliases ?? [])
      .map((alias) => targetGroup[alias])
      .find(Boolean)
  );
}

function mapCrossScoresSource({
  context,
  targetCategory,
  filterCategory,
  filterCode,
  metric,
}: {
  context: ReportContext;
  targetCategory: string;
  filterCategory: string;
  filterCode: string;
  metric: ChartMetric;
}): ValueSystemChartItem[] {
  return VALUE_SYSTEM_DEFINITIONS.map((definition) => {
    const node = resolveCrossScoreNode({
      context,
      targetCategory,
      definition,
    });

    const metricRecord = node?.by?.[filterCategory]?.[filterCode];

    return {
      code: definition.code,
      label: definition.label,
      shortLabel: definition.shortLabel,
      value: readMetric(metricRecord, metric),
    };
  });
}

function mapScoresSource({
  context,
  targetCategory,
  metric,
}: {
  context: ReportContext;
  targetCategory: string;
  metric: ChartMetric;
}): ValueSystemChartItem[] {
  const scoresByCode = context.scores.byCategory[targetCategory] ?? [];

  return VALUE_SYSTEM_DEFINITIONS.map((definition) => {
    const score = scoresByCode.find((item) => {
      return (
        item.dimensionCode === definition.code ||
        (definition.aliases ?? []).includes(item.dimensionCode)
      );
    });

    return {
      code: definition.code,
      label: definition.label,
      shortLabel: definition.shortLabel,
      value: numberOrZero(score?.[metric]),
    };
  });
}

export function mapReportContextToValueSystemsBarChartItems({
  context,
  source = "scores",
  targetCategory = "vMEME",
  filterCategory,
  filterCode,
  metric = "weightedMeanScore",
}: {
  context: ReportContext;
  source?: ValueSystemsChartSource;
  targetCategory?: string;
  filterCategory?: string;
  filterCode?: string;
  metric?: ChartMetric;
}): ValueSystemChartItem[] {
  if (source === "crossScores") {
    if (!filterCategory || !filterCode) {
      return VALUE_SYSTEM_DEFINITIONS.map((definition) => ({
        code: definition.code,
        label: definition.label,
        shortLabel: definition.shortLabel,
        value: 0,
      }));
    }

    return mapCrossScoresSource({
      context,
      targetCategory,
      filterCategory,
      filterCode,
      metric,
    });
  }

  return mapScoresSource({
    context,
    targetCategory,
    metric,
  });
}

function getMetricValue(value: unknown, metric: ChartMetric) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }

  const record = value as Record<string, unknown>;

  return numberOrZero(record[metric]);
}

function codeMatchesDefinition(code: string | null | undefined, definition: ValueSystemDefinition) {
  if (!code) {
    return false;
  }

  return code === definition.code || (definition.aliases ?? []).includes(code);
}
