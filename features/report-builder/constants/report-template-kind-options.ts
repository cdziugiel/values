// features/report-builder/constants/report-template-kind-options.ts

export const REPORT_TEMPLATE_KINDS = [
  "personal",
  "personal_composite",
  "project_aggregate",
  "organization_aggregate",
  "team_aggregate",
  "comparison",
] as const;

export type ReportTemplateKind = (typeof REPORT_TEMPLATE_KINDS)[number];

export const REPORT_TEMPLATE_FAMILY_OPTIONS = [
  {
    value: "personal",
    label: "Raport personalny",
    description: "Raport dla jednej osoby / jednej sesji.",
  },
  {
    value: "personal_composite",
    label: "Raport złożony",
    description: "Raport jednej osoby złożony z kilku kwestionariuszy.",
  },
  {
    value: "aggregate",
    label: "Raport zbiorczy",
    description: "Agregacja wyników dla projektu, organizacji albo zespołu.",
  },
  {
    value: "comparison",
    label: "Raport dopasowania",
    description: "Porównanie dwóch lub więcej grup.",
  },
] as const;

export type ReportTemplateFamily =
  (typeof REPORT_TEMPLATE_FAMILY_OPTIONS)[number]["value"];

export const AGGREGATE_SCOPE_OPTIONS = [
  {
    value: "project",
    label: "Projekt",
    description: "Agregacja wyników w ramach projektu badawczego.",
  },
  {
    value: "organization",
    label: "Organizacja",
    description: "Agregacja wyników dla organizacji klienta.",
  },
  {
    value: "team",
    label: "Zespół / jednostka",
    description: "Agregacja wyników dla zespołu lub jednostki organizacyjnej.",
  },
] as const;

export type AggregateReportScope =
  (typeof AGGREGATE_SCOPE_OPTIONS)[number]["value"];

export function isReportTemplateKind(
  value: unknown,
): value is ReportTemplateKind {
  return (
    typeof value === "string" &&
    REPORT_TEMPLATE_KINDS.includes(value as ReportTemplateKind)
  );
}

export function normalizeReportTemplateKind(
  value: unknown,
): ReportTemplateKind {
  return isReportTemplateKind(value) ? value : "personal";
}

export function getReportTemplateFamilyFromKind(
  kindInput: string | null | undefined,
): ReportTemplateFamily {
  const kind = normalizeReportTemplateKind(kindInput);

  if (
    kind === "project_aggregate" ||
    kind === "organization_aggregate" ||
    kind === "team_aggregate"
  ) {
    return "aggregate";
  }

  return kind;
}

export function getAggregateScopeFromKind(
  kindInput: string | null | undefined,
): AggregateReportScope {
  const kind = normalizeReportTemplateKind(kindInput);

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
}): ReportTemplateKind {
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

export function isPersonalReportTemplateKind(
  kind: string | null | undefined,
) {
  return normalizeReportTemplateKind(kind) === "personal";
}

export function isAggregateReportTemplateKind(
  kind: string | null | undefined,
) {
  const normalized = normalizeReportTemplateKind(kind);

  return (
    normalized === "project_aggregate" ||
    normalized === "organization_aggregate" ||
    normalized === "team_aggregate"
  );
}

export function getReportTemplateKindLabel(
  kindInput: string | null | undefined,
) {
  const kind = normalizeReportTemplateKind(kindInput);

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
      return "Raport dopasowania";

    default:
      return "Nieznany typ";
  }
}

export function getReportTemplateKindDescription(
  kindInput: string | null | undefined,
) {
  const kind = normalizeReportTemplateKind(kindInput);

  switch (kind) {
    case "personal":
      return "Raport dla jednej osoby lub jednej sesji.";

    case "personal_composite":
      return "Raport jednej osoby złożony z kilku kwestionariuszy.";

    case "project_aggregate":
      return "Raport zbiorczy agregujący wyniki projektu badawczego.";

    case "organization_aggregate":
      return "Raport zbiorczy agregujący wyniki organizacji klienta.";

    case "team_aggregate":
      return "Raport zbiorczy agregujący wyniki zespołu lub jednostki.";

    case "comparison":
      return "Raport porównujący dwa lub więcej zakresów danych.";

    default:
      return "Brak opisu typu raportu.";
  }
}


