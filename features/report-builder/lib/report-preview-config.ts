export type ReportPersonalTeaserConfig = {
  enabled: boolean;
  pageCodes: string[];
  allowPdfDownload: boolean;
  watermark: string | null;
};

export type ReportRedactedSampleConfig = {
  enabled: boolean;
  pageCodes: string[];
  allowPdfDownload: boolean;
  watermark: string | null;
};

export type ReportPreviewConfig = {
  personalTeaser: ReportPersonalTeaserConfig;
  sampleRedacted: ReportRedactedSampleConfig;
};

const DEFAULT_PERSONAL_TEASER: ReportPersonalTeaserConfig = {
  enabled: true,
  pageCodes: [],
  allowPdfDownload: true,
  watermark: "BEZPŁATNY SKRÓT WYNIKU",
};

const DEFAULT_REDACTED_SAMPLE: ReportRedactedSampleConfig = {
  enabled: true,
  pageCodes: [],
  allowPdfDownload: true,
  watermark: "PRZYKŁADOWA WERSJA RAPORTU",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeString(value: unknown, fallback: string | null) {
  if (value === null) {
    return null;
  }

  const normalized = String(value ?? "").trim();

  return normalized || fallback;
}

function normalizePageCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function resolveReportPreviewConfig(
  config: unknown,
): ReportPreviewConfig {
  const root = asRecord(config);
  const preview = asRecord(root.preview);

  const personalTeaser = asRecord(preview.personalTeaser);
  const sampleRedacted = asRecord(preview.sampleRedacted);

  return {
    personalTeaser: {
      enabled: normalizeBoolean(
        personalTeaser.enabled,
        DEFAULT_PERSONAL_TEASER.enabled,
      ),
      pageCodes: normalizePageCodes(personalTeaser.pageCodes),
      allowPdfDownload: normalizeBoolean(
        personalTeaser.allowPdfDownload,
        DEFAULT_PERSONAL_TEASER.allowPdfDownload,
      ),
      watermark: normalizeString(
        personalTeaser.watermark,
        DEFAULT_PERSONAL_TEASER.watermark,
      ),
    },

    sampleRedacted: {
      enabled: normalizeBoolean(
        sampleRedacted.enabled,
        DEFAULT_REDACTED_SAMPLE.enabled,
      ),
      pageCodes: normalizePageCodes(sampleRedacted.pageCodes),
      allowPdfDownload: normalizeBoolean(
        sampleRedacted.allowPdfDownload,
        DEFAULT_REDACTED_SAMPLE.allowPdfDownload,
      ),
      watermark: normalizeString(
        sampleRedacted.watermark,
        DEFAULT_REDACTED_SAMPLE.watermark,
      ),
    },
  };
}