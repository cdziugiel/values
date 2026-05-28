// features/report-builder/lib/report-template-kind-defaults.ts

export const REPORT_TEMPLATE_KINDS = [
  "personal",
  "personal_composite",
  "project_aggregate",
  "organization_aggregate",
  "team_aggregate",
  "comparison",
] as const;

export type ReportTemplateKind = (typeof REPORT_TEMPLATE_KINDS)[number];

export function isReportTemplateKind(value: unknown): value is ReportTemplateKind {
  return (
    typeof value === "string" &&
    REPORT_TEMPLATE_KINDS.includes(value as ReportTemplateKind)
  );
}

export function normalizeReportTemplateKind(value: unknown): ReportTemplateKind {
  return isReportTemplateKind(value) ? value : "personal";
}

export function isQuestionnaireBoundReportKind(kind: unknown) {
  return normalizeReportTemplateKind(kind) === "personal";
}

export function getReportTemplateKindLabel(kind: string | null | undefined) {
  switch (kind) {
    case "personal":
      return "Raport personalny";

    case "personal_composite":
      return "Raport złożony";

    case "project_aggregate":
      return "Raport zbiorczy · Projekt";

    case "organization_aggregate":
      return "Raport zbiorczy · Organizacja";

    case "team_aggregate":
      return "Raport zbiorczy · Zespół";

    case "comparison":
      return "Raport porównawczy";

    default:
      return "Nieznany typ";
  }
}

export function buildDefaultReportTemplateConfig(kindInput: unknown) {
  const kind = normalizeReportTemplateKind(kindInput);

  if (kind === "personal") {
    return {
      version: 1,
      reportKind: "personal",
      subjectType: "assessment_session",
      sourceMode: "assessment_result_snapshot",
      privacy: {
        minimumN: null,
        suppression: "not_applicable",
      },
    };
  }

  if (kind === "personal_composite") {
    return {
      version: 1,
      reportKind: "personal_composite",
      subjectType: "respondent",
      sourceMode: "multiple_personal_sources",
      composition: {
        policy: "all",
        requiredSources: [],
        optionalSources: [],
      },
      privacy: {
        minimumN: null,
        suppression: "not_applicable",
      },
    };
  }

  if (kind === "project_aggregate") {
    return {
      version: 1,
      reportKind: "project_aggregate",
      subjectType: "assessment_project",
      sourceMode: "aggregate_dimension_scores",
      aggregation: {
        minimumN: 5,
        completedOnly: true,
        includeOnlyCompleteScores: true,
        groupBy: [],
        metrics: [
          "count",
          "mean",
          "median",
          "stdDev",
          "min",
          "max",
        ],
      },
      privacy: {
        minimumN: 5,
        suppressSmallGroups: true,
        suppressionMode: "hide_section",
      },
    };
  }

  if (kind === "organization_aggregate") {
    return {
      version: 1,
      reportKind: "organization_aggregate",
      subjectType: "client_organization",
      sourceMode: "aggregate_dimension_scores",
      aggregation: {
        minimumN: 5,
        completedOnly: true,
        includeOnlyCompleteScores: true,
        groupBy: ["client_unit"],
        metrics: [
          "count",
          "mean",
          "median",
          "stdDev",
          "min",
          "max",
        ],
      },
      privacy: {
        minimumN: 5,
        suppressSmallGroups: true,
        suppressionMode: "hide_section",
      },
    };
  }

  if (kind === "team_aggregate") {
    return {
      version: 1,
      reportKind: "team_aggregate",
      subjectType: "client_unit",
      sourceMode: "aggregate_dimension_scores",
      aggregation: {
        minimumN: 5,
        completedOnly: true,
        includeOnlyCompleteScores: true,
        groupBy: [],
        metrics: [
          "count",
          "mean",
          "median",
          "stdDev",
          "min",
          "max",
        ],
      },
      privacy: {
        minimumN: 5,
        suppressSmallGroups: true,
        suppressionMode: "hide_section",
      },
    };
  }

  return {
    version: 1,
    reportKind: "comparison",
    subjectType: "custom_cohort",
    sourceMode: "compare_aggregate_dimension_scores",
    comparison: {
      minimumNPerGroup: 5,
      completedOnly: true,
      groups: [],
      metrics: [
        "count",
        "mean",
        "median",
        "stdDev",
        "difference",
      ],
    },
    privacy: {
      minimumN: 5,
      minimumNPerGroup: 5,
      suppressSmallGroups: true,
      suppressionMode: "hide_group",
    },
  };
}

export function buildDefaultReportTemplateDataBindings(kindInput: unknown) {
  const kind = normalizeReportTemplateKind(kindInput);

  if (kind === "personal") {
    return {
      version: 1,
      payloadKind: "personal",
      requiredContext: {
        assessmentSessionId: true,
        assessmentResultSnapshotId: true,
        questionnaireVersionId: true,
      },
      sources: {
        primary: {
          type: "assessment_result_snapshot",
          role: "primary",
        },
      },
    };
  }

  if (kind === "personal_composite") {
    return {
      version: 1,
      payloadKind: "personal_composite",
      requiredContext: {
        respondentId: true,
      },
      sources: {
        personalReports: [],
      },
      slots: {
        primary: null,
        secondary: [],
      },
    };
  }

  if (kind === "project_aggregate") {
    return {
      version: 1,
      payloadKind: "project_aggregate",
      requiredContext: {
        assessmentProjectId: true,
      },
      sources: {
        scores: {
          type: "assessment_dimension_scores",
          filters: {
            completedSessionsOnly: true,
          },
        },
      },
      aggregatePaths: {
        dimensions: "aggregate.dimensionScores.byDimensionCode",
        categories: "aggregate.dimensionScores.byCategory",
      },
    };
  }

  if (kind === "organization_aggregate") {
    return {
      version: 1,
      payloadKind: "organization_aggregate",
      requiredContext: {
        clientOrganizationId: true,
      },
      sources: {
        scores: {
          type: "assessment_dimension_scores",
          filters: {
            completedSessionsOnly: true,
          },
        },
      },
      aggregatePaths: {
        dimensions: "aggregate.dimensionScores.byDimensionCode",
        units: "aggregate.units",
      },
    };
  }

  if (kind === "team_aggregate") {
    return {
      version: 1,
      payloadKind: "team_aggregate",
      requiredContext: {
        clientUnitId: true,
      },
      sources: {
        scores: {
          type: "assessment_dimension_scores",
          filters: {
            completedSessionsOnly: true,
          },
        },
      },
      aggregatePaths: {
        dimensions: "aggregate.dimensionScores.byDimensionCode",
      },
    };
  }

  return {
    version: 1,
    payloadKind: "comparison",
    requiredContext: {
      groups: true,
    },
    sources: {
      groups: [],
    },
    comparisonPaths: {
      groups: "comparison.groups",
      differences: "comparison.differences",
    },
  };
}


export type ReportTemplateFamily =
  | "personal"
  | "personal_composite"
  | "aggregate"
  | "comparison";

export type AggregateReportScope =
  | "project"
  | "organization"
  | "team";

export function getReportTemplateFamilyFromKind(kind: string): ReportTemplateFamily {
  if (
    kind === "project_aggregate" ||
    kind === "organization_aggregate" ||
    kind === "team_aggregate"
  ) {
    return "aggregate";
  }

  if (kind === "personal_composite") {
    return "personal_composite";
  }

  if (kind === "comparison") {
    return "comparison";
  }

  return "personal";
}

export function getAggregateScopeFromKind(
  kind: string,
): AggregateReportScope {
  if (kind === "organization_aggregate") {
    return "organization";
  }

  if (kind === "team_aggregate") {
    return "team";
  }

  return "project";
}

export function resolveReportTemplateKindFromUi(input: {
  family: ReportTemplateFamily;
  aggregateScope: AggregateReportScope;
}) {
  if (input.family === "aggregate") {
    if (input.aggregateScope === "organization") {
      return "organization_aggregate";
    }

    if (input.aggregateScope === "team") {
      return "team_aggregate";
    }

    return "project_aggregate";
  }

  return input.family;
}

export function isQuestionnaireRequiredForKind(kind: string) {
  return kind === "personal";
}