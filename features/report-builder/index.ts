// features/report-builder/index.ts

export type {
  ReportDataApi,
  ReportDimension,
  ReportDimensionCategory,
  ReportDimensionSelector,
  ReportIntersectionScore,
  ReportPrimitive,
  ReportQuestionnaire,
  ReportResponse,
  ReportResponseDimension,
  ReportScore,
  ReportScoreSortMode,
  ReportSnapshotPayload,
} from "./types/report-builder.types";

export {
  buildReportDataApi,
  createReportSandboxData,
} from "./lib/report-snapshot-helpers";

export type {
  ReportCondition,
  ReportConditionOperator,
} from "./lib/report-condition-evaluator";

export {
  evaluateReportCondition,
} from "./lib/report-condition-evaluator";

export type {
  ReportTemplateStatus,
  ReportPageSize,
  ReportOrientation,
  ReportComponentBinding,
  ReportTemplateListItem,
  ReportTemplateVersionItem,
  ReportTemplatePageItem,
  ReportTemplateVersionWithPages,
} from "./types/report-template.types";

export {
  updateReportTemplateVersionBuilderSettingsSchema,
  createReportTemplatePageSchema,
  updateReportTemplatePageSchema,
  reorderReportTemplatePageSchema,
  archiveReportTemplatePageSchema,
} from "./forms/report-template.schema";

export type {
  UpdateReportTemplateVersionBuilderSettingsInput,
  CreateReportTemplatePageInput,
  UpdateReportTemplatePageInput,
  ReorderReportTemplatePageInput,
  ArchiveReportTemplatePageInput,
} from "./forms/report-template.schema";

export {
  createReportTemplateSchema,
  updateReportTemplateSchema,
  archiveReportTemplateSchema,
  createReportTemplateVersionSchema,
  updateReportTemplateVersionSchema,
  publishReportTemplateVersionSchema,
  archiveReportTemplateVersionSchema,
} from "./forms/report-template-admin.schema";

export type {
  CreateReportTemplateInput,
  UpdateReportTemplateInput,
  ArchiveReportTemplateInput,
  CreateReportTemplateVersionInput,
  UpdateReportTemplateVersionInput,
  PublishReportTemplateVersionInput,
  ArchiveReportTemplateVersionInput,
} from "./forms/report-template-admin.schema";

export { ReportTemplateVersionEditor } from "./components/report-template-version-editor";
export { ReportA4PreviewFrame } from "./components/report-a4-preview-frame";
export { ReportDocumentPreviewFrame } from "./components/report-document-preview-frame";
export { ReportConditionHelpDialog } from "./components/report-condition-help-dialog";

export { getReportTemplateVersionEditor } from "./api/report-builder.queries";
export { getReportTemplateVersionForRender } from "./api/report-render.queries";

export { buildReportContext } from "./lib/report-context";
export { evaluateReportPathCondition } from "./lib/report-condition";
export { renderReportDocument } from "./lib/report-template-renderer";