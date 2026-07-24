import type { SnapshotPayload } from "./report-context";

/**
 * Próbka musi być renderowana na pełnych danych.
 *
 * Nie usuwamy:
 * - scores,
 * - responses,
 * - crossScores,
 * - analytics,
 *
 * ponieważ globalJs wykorzystuje je do wyboru właściwych
 * interpretacji i wygenerowania finalnej treści stron.
 */
export function buildRedactedReportPayload(
  payload: SnapshotPayload,
): SnapshotPayload {
  return {
    ...payload,

    analytics:
      payload.analytics &&
      typeof payload.analytics === "object" &&
      !Array.isArray(payload.analytics)
        ? {
            ...payload.analytics,
            isSample: true,
            isRedacted: true,
          }
        : {
            isSample: true,
            isRedacted: true,
          },
  };
}