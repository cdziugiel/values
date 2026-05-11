export type PostLoginRedirectKind =
  | "global_admin"
  | "tenant_dashboard"
  | "report_viewer"
  | "default_assessment"
  | "login";

export type PostLoginRedirectResult = {
  kind: PostLoginRedirectKind;
  href: string;
  reason: string;
};