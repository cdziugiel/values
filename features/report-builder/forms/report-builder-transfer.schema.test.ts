// HUMANET installer: report-builder-full-transfer-v1
import { describe, expect, it } from "vitest";

import {
  REPORT_BUILDER_TRANSFER_FORMAT,
  REPORT_BUILDER_TRANSFER_VERSION,
  reportBuilderTransferPackageSchema,
} from "./report-builder-transfer.schema";
import {
  mergeReportPageConfig,
  splitReportPageConfig,
} from "../lib/report-builder-transfer";

function buildPayload() {
  return {
    format: REPORT_BUILDER_TRANSFER_FORMAT,
    formatVersion: REPORT_BUILDER_TRANSFER_VERSION,
    exportedAt: "2026-09-11T10:00:00.000Z",
    source: {
      reportTemplate: {
        code: "VALUES_PERSONAL",
        name: "Raport",
        kind: "personal",
      },
      reportTemplateVersion: {
        version: "1.0",
        name: "Raport 1.0",
        status: "draft",
      },
      questionnaire: null,
    },
    layout: {
      pageSize: "A4",
      orientation: "portrait" as const,
    },
    global: {
      css: "body {}",
      js: "",
      config: {},
      dataBindings: {},
    },
    pages: [
      {
        code: "PAGE_001",
        title: "Strona 1",
        description: "Opis",
        technicalDescription: "Opis techniczny",
        orderIndex: 1,
        html: "<div />",
        css: "",
        js: "",
        visibilityCondition: null,
        componentBindings: [],
        config: {},
      },
    ],
  };
}

describe("reportBuilderTransferPackageSchema", () => {
  it("akceptuje prawidłowy pełny eksport", () => {
    const parsed = reportBuilderTransferPackageSchema.safeParse(buildPayload());

    expect(parsed.success).toBe(true);
  });

  it("odrzuca powtórzone kody stron po normalizacji", () => {
    const payload = buildPayload();
    payload.pages.push({
      ...payload.pages[0],
      code: "page_001",
      title: "Duplikat",
      orderIndex: 2,
    });

    const parsed = reportBuilderTransferPackageSchema.safeParse(payload);

    expect(parsed.success).toBe(false);
  });

  it("odrzuca powtórzoną kolejność stron", () => {
    const payload = buildPayload();
    payload.pages.push({
      ...payload.pages[0],
      code: "PAGE_002",
      title: "Druga",
    });

    const parsed = reportBuilderTransferPackageSchema.safeParse(payload);

    expect(parsed.success).toBe(false);
  });
});

describe("technicalDescription round-trip", () => {
  it("wydziela opis techniczny z config i scala go z powrotem bez utraty pozostałych pól", () => {
    const split = splitReportPageConfig({
      technicalDescription: "Notatka dla administratora",
      keepTogether: true,
      margins: {
        top: 10,
      },
    });

    expect(split.technicalDescription).toBe("Notatka dla administratora");
    expect(split.config).toEqual({
      keepTogether: true,
      margins: {
        top: 10,
      },
    });

    expect(
      mergeReportPageConfig({
        configValue: split.config,
        technicalDescription: split.technicalDescription,
      }),
    ).toEqual({
      technicalDescription: "Notatka dla administratora",
      keepTogether: true,
      margins: {
        top: 10,
      },
    });
  });
});
