// features/report-builder/types/report-template.types.ts

import type { ReportCondition } from "../lib/report-condition-evaluator";

export type ReportTemplateStatus = "draft" | "active" | "archived";

export type ReportPageSize = "A4";
export type ReportOrientation = "portrait" | "landscape";

export type ReportComponentBinding = {
  slot: string;
  component: string;
  props?: Record<string, unknown>;
};

export type ReportTemplateListItem = {
  id: string;
  questionnaireId: string;
  code: string;
  name: string;
  description: string | null;
  status: ReportTemplateStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ReportTemplateVersionItem = {
  id: string;
  reportTemplateId: string;
  questionnaireVersionId: string;

  version: string;
  name: string;
  description: string | null;

  status: ReportTemplateStatus;
  isDefault: boolean;

  globalCss: string | null;
  globalJs: string | null;

  pageSize: ReportPageSize;
  orientation: ReportOrientation;

  config: Record<string, unknown>;
  dataBindings: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
};

export type ReportTemplatePageItem = {
  id: string;
  reportTemplateVersionId: string;

  code: string;
  title: string;
  description: string | null;

  orderIndex: number;

  html: string;
  css: string;
  js: string;

  visibilityCondition: ReportCondition | null;
  componentBindings: ReportComponentBinding[];

  config: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
};

export type ReportTemplateVersionWithPages = ReportTemplateVersionItem & {
  pages: ReportTemplatePageItem[];
};