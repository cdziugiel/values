// features/comparison-reports/api/comparison-report.queries.ts

import { getMyAssessmentRuntime } from "@/features/my-assessment/api/my-assessment-runtime";
import { requireSession } from "@/server/auth/require-session";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";

import { peerComparisonReportInputSchema } from "../forms/comparison-report.schema";
import { buildPeerComparisonReportData } from "../lib/build-comparison-report-data";

export async function getPeerComparisonReportData(input: unknown) {
  const session = await requireSession();

  if (!session.user?.id || !session.user?.email) {
    throw new Error("Musisz być zalogowany, aby porównać wyniki.");
  }

  const parsed = peerComparisonReportInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Nieprawidłowe dane porównania.");
  }

  const runtime = await getMyAssessmentRuntime({
    userId: session.user.id,
  });

  if (!runtime) {
    throw new Error("Nie udało się odnaleźć środowiska badania.");
  }

const { db, controlDb, ctx } = runtime;

const data = await buildPeerComparisonReportData({
  db,
  controlDb,
  ctx,
  userEmail: session.user.email,
  ownSessionId: parsed.data.ownSessionId,
  ownQuestionnaireVersionId: parsed.data.ownQuestionnaireVersionId,
  otherToken: parsed.data.otherToken,
});

  await writeTenantAuditLog({
    db,
    ctx,
    action: "peer_comparison_report_viewed",
    entityType: "assessment_session",
    entityId: parsed.data.ownSessionId,
  });

  return data;
}