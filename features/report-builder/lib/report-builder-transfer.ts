// HUMANET installer: report-builder-full-transfer-v1
export class ReportBuilderTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportBuilderTransferError";
  }
}

export function asReportBuilderRecord(
  value: unknown,
): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }

  return {};
}

/**
 * Obecny model DB nie ma osobnej kolumny technical_description.
 * Do czasu formalnej migracji tego pola przechowujemy je jawnie w page.config
 * pod stabilnym kluczem "technicalDescription". Format eksportu wystawia je
 * jako osobne pole, dzięki czemu przyszła migracja DB nie złamie formatu.
 */
export function splitReportPageConfig(configValue: unknown) {
  const config = asReportBuilderRecord(configValue);
  const rawTechnicalDescription = config.technicalDescription;

  if (typeof rawTechnicalDescription !== "string") {
    return {
      technicalDescription: null as string | null,
      config,
    };
  }

  const { technicalDescription: _technicalDescription, ...portableConfig } =
    config;

  return {
    technicalDescription: rawTechnicalDescription,
    config: portableConfig,
  };
}

export function mergeReportPageConfig({
  configValue,
  technicalDescription,
}: {
  configValue: unknown;
  technicalDescription: string | null;
}) {
  const config = asReportBuilderRecord(configValue);

  if (technicalDescription === null) {
    delete config.technicalDescription;
    return config;
  }

  return {
    ...config,
    technicalDescription,
  };
}

export function normalizeReportTransferPageCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

export function sanitizeReportTransferFilenameSegment(value: string) {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "report";
}
