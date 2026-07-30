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
    code: "MEDIATIONS",
    label: "MEDIACJE",
    shortLabel: "Mediacje",
    aliases: ["MEDIATION", "COMMUNITY"],
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

/**
 * MEDIATIONS jest kanonicznym kodem wymiaru w aktualnej definicji.
 *
 * MEDIATION może jednak występować w historycznych snapshotach,
 * wynikach scoringu oraz strukturach crossScores.
 *
 * Odczyt musi obsługiwać oba warianty bez modyfikowania snapshotów.
 */
const DIMENSION_CODE_ALIASES: Record<string, string[]> = {
  MEDIATIONS: ["MEDIATION"],
  MEDIATION: ["MEDIATIONS"],
};

function normalizeCode(code: unknown) {
  return String(code ?? "")
    .trim()
    .toUpperCase();
}

function getCompatibleCodes(code: string) {
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode) {
    return [];
  }

  return Array.from(
    new Set([
      normalizedCode,
      ...(DIMENSION_CODE_ALIASES[normalizedCode] ?? []),
    ]),
  );
}

function getDefinitionCodes(definition: ValueSystemDefinition) {
  return Array.from(
    new Set(
      [definition.code, ...(definition.aliases ?? [])].flatMap(
        getCompatibleCodes,
      ),
    ),
  );
}

function resolveRecordByCodes<T>(
  records: Record<string, T> | undefined,
  codes: string[],
): T | undefined {
  if (!records) {
    return undefined;
  }

  for (const code of codes) {
    const compatibleCodes = getCompatibleCodes(code);

    for (const compatibleCode of compatibleCodes) {
      const value = records[compatibleCode];

      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
}

function resolveRecordByCode<T>(
  records: Record<string, T> | undefined,
  code: string,
): T | undefined {
  return resolveRecordByCodes(records, [code]);
}

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

  return resolveRecordByCodes(
    targetGroup,
    getDefinitionCodes(definition),
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

    const filterGroup = node?.by?.[filterCategory];

    const metricRecord = resolveRecordByCode(
      filterGroup,
      filterCode,
    );

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
    const definitionCodes = getDefinitionCodes(definition);

    const score = scoresByCode.find((item) => {
      const itemCode = normalizeCode(item.dimensionCode);

      return definitionCodes.includes(itemCode);
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

function codeMatchesDefinition(
  code: string | null | undefined,
  definition: ValueSystemDefinition,
) {
  if (!code) {
    return false;
  }

  const normalizedCode = normalizeCode(code);
  const definitionCodes = getDefinitionCodes(definition);

  return definitionCodes.includes(normalizedCode);
}