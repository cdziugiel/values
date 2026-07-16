import { and, eq, gt, isNull } from "drizzle-orm";

import { reportPreviewSnapshots } from "@/drizzle/schema";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";

export async function getSyntheticReportPreview(input: {
  reportTemplateVersionId: string;
  previewSnapshotId: string;
}) {
  const user = await requireSuperAdmin();

  return controlDb.query.reportPreviewSnapshots.findFirst({
    where: and(
      eq(
        reportPreviewSnapshots.id,
        input.previewSnapshotId,
      ),
      eq(
        reportPreviewSnapshots.reportTemplateVersionId,
        input.reportTemplateVersionId,
      ),
      eq(reportPreviewSnapshots.createdBy, user.id),
      gt(reportPreviewSnapshots.expiresAt, new Date()),
      isNull(reportPreviewSnapshots.deletedAt),
    ),
    columns: {
      id: true,
      reportTemplateVersionId: true,
      questionnaireVersionId: true,
      payload: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}
