// HUMANET installer: report-builder-full-transfer-v1
import { ReportBuilderTransferError } from "./report-builder-transfer";

type TransferOperation = "export" | "import";

type Bucket = {
  startedAt: number;
  count: number;
};

const WINDOW_MS = 60_000;
const MAX_OPERATIONS_PER_WINDOW = 20;

const globalRateLimit = globalThis as typeof globalThis & {
  __humanetReportBuilderTransferRateLimit?: Map<string, Bucket>;
};

const buckets =
  globalRateLimit.__humanetReportBuilderTransferRateLimit ??
  new Map<string, Bucket>();

globalRateLimit.__humanetReportBuilderTransferRateLimit = buckets;

export function assertReportBuilderTransferRateLimit({
  actorUserId,
  operation,
}: {
  actorUserId: string;
  operation: TransferOperation;
}) {
  const now = Date.now();
  const key = `${actorUserId}:${operation}`;
  const current = buckets.get(key);

  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(key, {
      startedAt: now,
      count: 1,
    });
    return;
  }

  if (current.count >= MAX_OPERATIONS_PER_WINDOW) {
    throw new ReportBuilderTransferError(
      "Wykonano zbyt wiele operacji eksportu/importu w krótkim czasie. Spróbuj ponownie za chwilę.",
    );
  }

  current.count += 1;
}
