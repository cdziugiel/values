export function formatReportDateTime(value: string | Date | null | undefined) {
  if (!value) return "bez daty ukończenia";

  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "bez daty ukończenia";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(date);
}