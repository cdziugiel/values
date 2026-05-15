// features/report-builder/api/report-render.queries.ts

import { and, eq, isNull } from "drizzle-orm";

import { reportTemplatePages, reportTemplateVersions } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export async function getReportTemplateVersionForRender({
  reportTemplateVersionId,
}: {
  reportTemplateVersionId: string;
}) {
  const version = await controlDb.query.reportTemplateVersions.findFirst({
    where: and(
      eq(reportTemplateVersions.id, reportTemplateVersionId),
      isNull(reportTemplateVersions.deletedAt),
    ),
  });

  if (!version) {
    return null;
  }

  const pages = await controlDb
    .select()
    .from(reportTemplatePages)
    .where(
      and(
        eq(reportTemplatePages.reportTemplateVersionId, reportTemplateVersionId),
        isNull(reportTemplatePages.deletedAt),
      ),
    );

  return {
    ...version,
    pages,
  };
}