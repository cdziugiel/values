// features/questionnaire-admin/api/questionnaire-xlsx.import.ts

import ExcelJS from "exceljs";
import { replaceQuestionnaireVersionStructureFromImport } from "./questionnaire-admin.mutations";
import type {
    QuestionnaireItemType,
} from "../types/questionnaire-admin.types";

const QUESTIONNAIRE_ITEM_TYPES: QuestionnaireItemType[] = [
    "likert",
    "true_false",
    "single_choice",
    "multiple_choice",
    "current_desired",
    "text",
    "number",
];

function parseQuestionnaireItemType(value: string): QuestionnaireItemType {
    const normalized = value.trim();

    if (QUESTIONNAIRE_ITEM_TYPES.includes(normalized as QuestionnaireItemType)) {
        return normalized as QuestionnaireItemType;
    }

    throw new Error(`Nieobsługiwany typ itemu w imporcie XLSX: "${value}".`);
}

type ImportQuestionnaireVersionXlsxInput = {
    actorUserId: string;
    versionId: string;
    fileBuffer: ArrayBuffer;
};

type XlsxRow = Record<string, string>;

const REQUIRED_SHEETS = [
    "dimensions",
    "pages",
    "items",
    "item_dimensions",
    "page_dimensions",
] as const;

function cellToString(value: ExcelJS.CellValue) {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "object" && "text" in value) {
        return String(value.text ?? "").trim();
    }

    return String(value).trim();
}

function readSheetRows(workbook: ExcelJS.Workbook, sheetName: string): XlsxRow[] {
    const worksheet = workbook.getWorksheet(sheetName);

    if (!worksheet) {
        throw new Error(`Missing sheet: ${sheetName}`);
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values;

    if (!Array.isArray(headers)) {
        throw new Error(`Invalid header row in sheet: ${sheetName}`);
    }

    const normalizedHeaders = headers
        .slice(1)
        .map((value) => cellToString(value as ExcelJS.CellValue));

    const rows: XlsxRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            return;
        }

        const result: XlsxRow = {};
        let hasAnyValue = false;

        normalizedHeaders.forEach((header, index) => {
            const value = cellToString(row.getCell(index + 1).value);

            if (value) {
                hasAnyValue = true;
            }

            result[header] = value;
        });

        if (hasAnyValue) {
            rows.push(result);
        }
    });

    return rows;
}

function parseBoolean(value: string) {
    return value === "true" || value === "1" || value.toLowerCase() === "tak";
}

function parseNumberOrNull(value: string) {
    if (!value) {
        return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid number: ${value}`);
    }

    return parsed;
}

function parseJsonCell(value: string) {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        throw new Error("Invalid JSON cell");
    }
}

export async function importQuestionnaireVersionXlsx({
    actorUserId,
    versionId,
    fileBuffer,
}: ImportQuestionnaireVersionXlsxInput) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    for (const sheetName of REQUIRED_SHEETS) {
        if (!workbook.getWorksheet(sheetName)) {
            throw new Error(`Missing required sheet: ${sheetName}`);
        }
    }

    const dimensionsRows = readSheetRows(workbook, "dimensions");
    const pagesRows = readSheetRows(workbook, "pages");
    const itemsRows = readSheetRows(workbook, "items");
    const itemDimensionRows = readSheetRows(workbook, "item_dimensions");
    const pageDimensionRows = readSheetRows(workbook, "page_dimensions");

    const dimensions = dimensionsRows.map((row) => ({
        code: row.code,
        name: row.name,
        description: row.description || null,
        category: row.category || null,
        orderIndex: parseNumberOrNull(row.order_index) ?? 0,
    }));

    const pages = pagesRows.map((row) => ({
        code: row.code,
        title: row.title,
        description: row.description || null,
        orderIndex: parseNumberOrNull(row.order_index) ?? 0,
    }));

    const items = itemsRows.map((row, index) => ({
        code: row.code,
        pageCode: row.page_code || null,
        orderIndex: parseNumberOrNull(row.order_index) ?? (index + 1) * 10,
        type: parseQuestionnaireItemType(row.type),
        text: row.text,
        helpText: row.help_text || null,
        required: parseBoolean(row.required),
        scaleMin: parseNumberOrNull(row.scale_min),
        scaleMax: parseNumberOrNull(row.scale_max),
        scaleMinLabel: row.scale_min_label || null,
        scaleMaxLabel: row.scale_max_label || null,
        responseConfig: parseJsonCell(row.response_config_json),
        options: parseJsonCell(row.options_json),
    }));

    const itemDimensions = itemDimensionRows.map((row) => ({
        itemCode: row.item_code,
        dimensionCode: row.dimension_code,
        weight: row.weight || "1",
        reverseScored: parseBoolean(row.reverse_scored),
    }));

    const pageDimensions = pageDimensionRows.map((row) => ({
        pageCode: row.page_code,
        dimensionCode: row.dimension_code,
        weight: row.weight || "1",
        reverseScored: parseBoolean(row.reverse_scored),
    }));


    const result = await replaceQuestionnaireVersionStructureFromImport({
        actorUserId,
        input: {
            versionId,
            dimensions,
            pages,
            items,
            itemDimensions,
            pageDimensions,
        },
    });

    return result;
}