export const RESPONDENT_REPORT_TEMPLATE_KINDS = [
  "personal",
  "personal_composite",
] as const;

export const PARTNER_REPORT_TEMPLATE_KINDS = [
  "project_aggregate",
  "organization_aggregate",
  "team_aggregate",
  "comparison",
] as const;

export function isRespondentReportTemplateKind(kind: string | null | undefined) {
  return (
    kind === "personal" ||
    kind === "personal_composite"
  );
}

export function isPartnerReportTemplateKind(kind: string | null | undefined) {
  return (
    kind === "project_aggregate" ||
    kind === "organization_aggregate" ||
    kind === "team_aggregate" ||
    kind === "comparison"
  );
}

export function getReportTemplateAudience(kind: string | null | undefined) {
  if (isRespondentReportTemplateKind(kind)) {
    return "respondent";
  }

  if (isPartnerReportTemplateKind(kind)) {
    return "partner";
  }

  return "unknown";
}