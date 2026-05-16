// features/questionnaire-admin/api/questionnaire-xlsx.export.ts

import ExcelJS from "exceljs";
import { getQuestionnaireVersionEditorData } from "./questionnaire-admin.queries";

const SHEET_NAMES = {
    metadata: "metadata",
    dimensions: "dimensions",
    pages: "pages",
    items: "items",
    itemDimensions: "item_dimensions",
    pageDimensions: "page_dimensions",
} as const;

function addHeader(worksheet: ExcelJS.Worksheet, headers: string[]) {
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    headers.forEach((_header, index) => {
        worksheet.getColumn(index + 1).width = 28;
    });
}

function toJsonCell(value: unknown) {
    if (value === null || value === undefined) {
        return "";
    }

    return JSON.stringify(value);
}

export async function buildQuestionnaireVersionXlsx(versionId: string) {
        const data = await getQuestionnaireVersionEditorData(versionId);

    if (!data) {
        throw new Error("Nie znaleziono wersji kwestionariusza.");
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HUMANET VALUES";
    workbook.created = new Date();

    const metadataSheet = workbook.addWorksheet(SHEET_NAMES.metadata);
    addHeader(metadataSheet, ["key", "value"]);
    metadataSheet.addRows([
        ["schema_version", "1"],
        ["export_type", "questionnaire_version"],
        ["version_id", versionId],
        ["exported_at", new Date().toISOString()],
    ]);

    const dimensionsSheet = workbook.addWorksheet(SHEET_NAMES.dimensions);
    addHeader(dimensionsSheet, [
        "code",
        "name",
        "description",
        "category",
        "order_index",
    ]);

for (const dimension of data.dimensions) {
    dimensionsSheet.addRow([
        dimension.code,
        dimension.name,
        dimension.description ?? "",
        dimension.category ?? "",
        dimension.orderIndex ?? "",
    ]);
}

    const pagesSheet = workbook.addWorksheet(SHEET_NAMES.pages);
    addHeader(pagesSheet, ["code", "title", "description", "order_index"]);

    for (const page of data.pages) {
        pagesSheet.addRow([
            page.code ?? `PAGE_${page.orderIndex ?? 0}`,
            page.title,
            page.description ?? "",
            page.orderIndex ?? "",
        ]);
    }

    const pageCodeById = new Map(
        data.pages.map((page) => [
            page.id,
            page.code ?? `PAGE_${page.orderIndex ?? 0}`,
        ]),
    );

    const itemsSheet = workbook.addWorksheet(SHEET_NAMES.items);
    addHeader(itemsSheet, [
        "code",
        "page_code",
        "order_index",
        "type",
        "text",
        "help_text",
        "required",
        "scale_min",
        "scale_max",
        "scale_min_label",
        "scale_max_label",
        "response_config_json",
        "options_json",
    ]);

    for (const item of data.items) {
        itemsSheet.addRow([
            item.code,
            item.questionnairePageId
                ? pageCodeById.get(item.questionnairePageId) ?? ""
                : "",
            item.orderIndex ?? "",
            item.type,
            item.text,
            item.helpText ?? "",
            item.required ? "true" : "false",
            item.scaleMin ?? "",
            item.scaleMax ?? "",
            item.scaleMinLabel ?? "",
            item.scaleMaxLabel ?? "",
            toJsonCell(item.responseConfig),
            toJsonCell(item.options),
        ]);
    }

    const itemDimensionsSheet = workbook.addWorksheet(SHEET_NAMES.itemDimensions);
    addHeader(itemDimensionsSheet, [
        "item_code",
        "dimension_code",
        "weight",
        "reverse_scored",
    ]);

    for (const item of data.items) {
        for (const score of item.dimensionScores) {
            itemDimensionsSheet.addRow([
                item.code,
                score.dimensionCode,
                score.weight,
                score.reverseScored ? "true" : "false",
            ]);
        }
    }

    const pageDimensionsSheet = workbook.addWorksheet(SHEET_NAMES.pageDimensions);
    addHeader(pageDimensionsSheet, [
        "page_code",
        "dimension_code",
        "weight",
        "reverse_scored",
    ]);

    for (const page of data.pages) {
        const pageCode = page.code ?? `PAGE_${page.orderIndex ?? 0}`;

        for (const score of page.dimensionScores) {
            pageDimensionsSheet.addRow([
                pageCode,
                score.dimensionCode,
                score.weight,
                score.reverseScored ? "true" : "false",
            ]);
        }
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(arrayBuffer);
}