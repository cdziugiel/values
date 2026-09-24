// HUMANET installer: report-builder-full-transfer-v1
import { getReportTemplateVersionEditor } from "./report-builder.queries";

import {
  REPORT_BUILDER_TRANSFER_FORMAT,
  REPORT_BUILDER_TRANSFER_VERSION,
  reportBuilderTransferPackageSchema,
  type ReportBuilderTransferPackage,
} from "../forms/report-builder-transfer.schema";
import {
  asReportBuilderRecord,
  splitReportPageConfig,
} from "../lib/report-builder-transfer";

export async function buildReportBuilderTransferPackage({
  reportTemplateVersionId,
}: {
  reportTemplateVersionId: string;
}): Promise<ReportBuilderTransferPackage | null> {
  const source = await getReportTemplateVersionEditor({
    reportTemplateVersionId,
  });

  if (!source) {
    return null;
  }

  const payload = {
    format: REPORT_BUILDER_TRANSFER_FORMAT,
    formatVersion: REPORT_BUILDER_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    source: {
      reportTemplate: {
        code: source.reportTemplateCode,
        name: source.reportTemplateName,
        kind: source.reportTemplateKind,
      },
      reportTemplateVersion: {
        version: source.version,
        name: source.name,
        status: source.status,
      },
      questionnaire:
        source.questionnaireCode ||
        source.questionnaireName ||
        source.questionnaireVersionLabel
          ? {
              code: source.questionnaireCode ?? null,
              name: source.questionnaireName ?? null,
              version: source.questionnaireVersionLabel ?? null,
            }
          : null,
    },
    layout: {
      pageSize: source.pageSize ?? "A4",
      orientation:
        source.orientation === "landscape" ? "landscape" : "portrait",
    },
    global: {
      css: source.globalCss ?? "",
      js: source.globalJs ?? "",
      config: asReportBuilderRecord(source.config),
      dataBindings: asReportBuilderRecord(source.dataBindings),
    },
    pages: source.pages.map((page) => {
      const pageConfig = splitReportPageConfig(page.config);

      return {
        code: page.code,
        title: page.title,
        description: page.description ?? null,
        technicalDescription: pageConfig.technicalDescription,
        orderIndex: page.orderIndex,
        html: page.html ?? "",
        css: page.css ?? "",
        js: page.js ?? "",
        visibilityCondition: page.visibilityCondition ?? null,
        componentBindings: Array.isArray(page.componentBindings)
          ? page.componentBindings
          : [],
        config: pageConfig.config,
      };
    }),
  };

  return reportBuilderTransferPackageSchema.parse(payload);
}
