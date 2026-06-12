export function isUserUnlockableStandardReportKind(
  kind: string | null | undefined,
) {
  return kind === "personal";
}