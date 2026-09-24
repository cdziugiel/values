// HUMANET installer: report-builder-full-transfer-v1
import { and, eq, isNull } from "drizzle-orm";

import {
  reportTemplatePages,
  reportTemplateVersions,
  systemAuditLog,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import {
  reportBuilderTransferPackageSchema,
  type ReportBuilderTransferPackage,
} from "../forms/report-builder-transfer.schema";
import {
  ReportBuilderTransferError,
  mergeReportPageConfig,
  normalizeReportTransferPageCode,
} from "../lib/report-builder-transfer";

export async function importReportBuilderTransferPackageAsSuperAdmin({
  actorUserId,
  reportTemplateVersionId,
  payload,
  payloadSha256,
}: {
  actorUserId: string;
  reportTemplateVersionId: string;
  payload: ReportBuilderTransferPackage;
  payloadSha256: string;
}) {
  const parsed = reportBuilderTransferPackageSchema.parse(payload);
  const now = new Date();

  return controlDb.transaction(async (tx) => {
    const versionRows = await tx
      .select({
        id: reportTemplateVersions.id,
        status: reportTemplateVersions.status,
      })
      .from(reportTemplateVersions)
      .where(
        and(
          eq(reportTemplateVersions.id, reportTemplateVersionId),
          isNull(reportTemplateVersions.deletedAt),
        ),
      )
      .limit(1);

    const version = versionRows[0];

    if (!version) {
      throw new ReportBuilderTransferError(
        "Nie znaleziono docelowej wersji raportu.",
      );
    }

    if (version.status !== "draft") {
      throw new ReportBuilderTransferError(
        "Pełny import jest dozwolony wyłącznie do roboczej wersji raportu.",
      );
    }

    const existingPages = await tx
      .select({
        id: reportTemplatePages.id,
      })
      .from(reportTemplatePages)
      .where(
        and(
          eq(
            reportTemplatePages.reportTemplateVersionId,
            reportTemplateVersionId,
          ),
          isNull(reportTemplatePages.deletedAt),
        ),
      );

    await tx
      .update(reportTemplateVersions)
      .set({
        globalCss: parsed.global.css,
        globalJs: parsed.global.js,
        pageSize: parsed.layout.pageSize,
        orientation: parsed.layout.orientation,
        config: parsed.global.config,
        dataBindings: parsed.global.dataBindings,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplateVersions.id, reportTemplateVersionId));

    if (existingPages.length > 0) {
      await tx
        .update(reportTemplatePages)
        .set({
          deletedAt: now,
          updatedBy: actorUserId,
          updatedAt: now,
        })
        .where(
          and(
            eq(
              reportTemplatePages.reportTemplateVersionId,
              reportTemplateVersionId,
            ),
            isNull(reportTemplatePages.deletedAt),
          ),
        );
    }

    const sortedPages = [...parsed.pages].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    );

    if (sortedPages.length > 0) {
      await tx.insert(reportTemplatePages).values(
        sortedPages.map((page) => ({
          reportTemplateVersionId,
          code: normalizeReportTransferPageCode(page.code),
          title: page.title,
          description: page.description,
          orderIndex: page.orderIndex,
          html: page.html,
          css: page.css,
          js: page.js,
          visibilityCondition: page.visibilityCondition,
          componentBindings: page.componentBindings,
          config: mergeReportPageConfig({
            configValue: page.config,
            technicalDescription: page.technicalDescription,
          }),
          createdBy: actorUserId,
          updatedBy: actorUserId,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    await tx.insert(systemAuditLog).values({
      actorUserId,
      actorRole: "SUPER_ADMIN",
      action: "report_builder_imported",
      entityType: "report_template_version",
      entityId: reportTemplateVersionId,
      before: {
        activePageCount: existingPages.length,
      },
      after: {
        importedPageCount: sortedPages.length,
        format: parsed.format,
        formatVersion: parsed.formatVersion,
        sourceTemplateCode: parsed.source.reportTemplate.code,
        sourceTemplateVersion: parsed.source.reportTemplateVersion.version,
        payloadSha256,
      },
    });

    return {
      importedPageCount: sortedPages.length,
      replacedPageCount: existingPages.length,
    };
  });
}
