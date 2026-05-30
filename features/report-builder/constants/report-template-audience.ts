export const RESPONDENT_REPORT_TEMPLATE_KINDS = [
  "personal",
  "personal_composite",
] as const;

export const PARTNER_REPORT_TEMPLATE_KINDS = [
  "project_aggregate",
  "organization_aggregate",
  "team_aggregate",
  "comparison",
  "aggregate",
] as const;

export function isRespondentReportTemplateKind(kind: string | null | undefined) {
  return kind === "personal" || kind === "personal_composite";
}

export function isSessionReportTemplateKind(kind: string | null | undefined) {
  return kind === "personal";
}

export function isCompositeReportTemplateKind(kind: string | null | undefined) {
  return kind === "personal_composite";
}

export function isPartnerReportTemplateKind(kind: string | null | undefined) {
  return (
    kind === "project_aggregate" ||
    kind === "organization_aggregate" ||
    kind === "team_aggregate" ||
    kind === "comparison" ||
    kind === "aggregate"
  );
}

export function getPartnerReportScope(kind: string | null | undefined) {
  if (kind === "project_aggregate") return "project";
  if (kind === "organization_aggregate") return "organization";
  if (kind === "team_aggregate") return "team";
  if (kind === "comparison") return "comparison";

  return null;
}