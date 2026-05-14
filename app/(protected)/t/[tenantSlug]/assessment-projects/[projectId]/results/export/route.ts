import ExcelJS from "exceljs";

import { getAssessmentProjectResults } from "@/features/assessment-results/api/assessment-project-results.queries";

export const runtime = "nodejs";

type RouteProps = {
    params: Promise<{
        tenantSlug: string;
        projectId: string;
    }>;
};

function autoSizeWorksheetColumns(sheet: ExcelJS.Worksheet) {
    const columnCount = sheet.columnCount;

    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
        const column = sheet.getColumn(columnIndex);

        let maxLength = 12;

        column.eachCell({ includeEmpty: false }, (cell) => {
            const value = cell.value;

            let text = "";

            if (value === null || value === undefined) {
                text = "";
            } else if (typeof value === "object" && "text" in value) {
                text = String(value.text ?? "");
            } else if (typeof value === "object" && "richText" in value) {
                text = "";
            } else {
                text = String(value);
            }

            maxLength = Math.max(maxLength, text.length + 2);
        });

        column.hidden = false;
        column.outlineLevel = 0;
        column.width = Math.min(42, Math.max(12, maxLength));
    }
}

function safeAsciiFileName(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ł/g, "l")
        .replace(/Ł/g, "L")
        .replace(/[^\w.-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80)
        || "humanet_values_export";
}

function encodeRFC5987ValueChars(value: string) {
    return encodeURIComponent(value)
        .replace(/['()]/g, escape)
        .replace(/\*/g, "%2A");
}

function csvEscape(value: unknown) {
    if (value === null || value === undefined) {
        return "";
    }

    const text = String(value);

    if (/[",\n\r;]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}

function toCsv(rows: unknown[][]) {
    return rows.map((row) => row.map(csvEscape).join(";")).join("\n");
}

function makeCsvResponse({
    csv,
    fileName,
    encodedFileName,
}: {
    csv: string;
    fileName: string;
    encodedFileName: string;
}) {
    return new Response(`\uFEFF${csv}`, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
        },
    });
}

function makeSheetName(input: string, usedNames: Set<string>) {
    const base = input
        .replace(/[\\/*?:[\]]/g, " ")
        .trim()
        .slice(0, 28) || "Arkusz";

    let name = base;
    let index = 2;

    while (usedNames.has(name)) {
        const suffix = ` ${index}`;
        name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
        index += 1;
    }

    usedNames.add(name);
    return name;
}

function formatStatus(status: string) {
    if (status === "completed") return "ukończona";
    if (status === "in_progress") return "w trakcie";
    if (status === "not_started") return "nierozpoczęta";
    if (status === "expired") return "wygasła";
    if (status === "abandoned") return "przerwana";

    return status;
}

function buildDimensionAggregateRows(data: Awaited<ReturnType<typeof getAssessmentProjectResults>>) {
    if (!data) return [];

    return [
        [
            "Kwestionariusz",
            "Wersja",
            "Kod wymiaru",
            "Wymiar",
            "Liczba sesji",
            "Średnia surowa",
            "Średnia ważona",
            "Średnia itemów",
            "Średnia ważona itemów",
            "Kompletność",
        ],
        ...data.dimensionAggregates.map((aggregate) => [
            aggregate.questionnaireName,
            aggregate.questionnaireVersionName,
            aggregate.dimensionCode,
            aggregate.dimensionName,
            aggregate.sessionsCount,
            aggregate.averageRawScore,
            aggregate.averageWeightedScore,
            aggregate.averageMeanScore,
            aggregate.averageWeightedMeanScore,
            aggregate.averageCompleteness,
        ]),
    ];
}

function buildCategoricalRows(data: Awaited<ReturnType<typeof getAssessmentProjectResults>>) {
    if (!data) return [];

    const rows: unknown[][] = [
        [
            "Kwestionariusz",
            "Wersja",
            "Strona",
            "Kod itemu",
            "Typ itemu",
            "Treść itemu",
            "Odpowiedź",
            "Wartość techniczna",
            "Liczba",
            "Udział",
            "Liczba odpowiedzi łącznie",
        ],
    ];

    for (const item of data.categoricalAggregates) {
        for (const option of item.options) {
            rows.push([
                item.questionnaireName,
                item.questionnaireVersionName,
                item.pageTitle ?? "Bez strony",
                item.itemCode,
                item.itemType,
                item.itemText,
                option.label,
                option.value,
                option.count,
                option.percentage,
                item.totalAnswersCount,
            ]);
        }
    }

    return rows;
}

function buildRespondentMatrixRows(data: Awaited<ReturnType<typeof getAssessmentProjectResults>>) {
    if (!data) return [];

    const rows: unknown[][] = [];

    const questionnaireGroups = new Map<
        string,
        {
            questionnaireName: string;
            questionnaireVersionName: string;
            dimensions: {
                dimensionId: string;
                dimensionCode: string;
                dimensionName: string;
            }[];
        }
    >();

    for (const aggregate of data.dimensionAggregates) {
        const existing = questionnaireGroups.get(aggregate.questionnaireVersionId) ?? {
            questionnaireName: aggregate.questionnaireName,
            questionnaireVersionName: aggregate.questionnaireVersionName,
            dimensions: [],
        };

        if (
            !existing.dimensions.some(
                (dimension) => dimension.dimensionId === aggregate.dimensionId,
            )
        ) {
            existing.dimensions.push({
                dimensionId: aggregate.dimensionId,
                dimensionCode: aggregate.dimensionCode,
                dimensionName: aggregate.dimensionName,
            });
        }

        questionnaireGroups.set(aggregate.questionnaireVersionId, existing);
    }

    rows.push([
        "Respondent",
        "Email",
        "Kod zewnętrzny",
        "Status sesji",
        "Kwestionariusz",
        "Wersja",
        "Kompletność średnia",
        "Kod wymiaru",
        "Wymiar",
        "Wynik surowy",
        "Wynik ważony",
        "Średnia",
        "Średnia ważona",
        "Kompletność wymiaru",
    ]);

    for (const [questionnaireVersionId, group] of questionnaireGroups.entries()) {
        for (const respondent of data.respondentResults) {
            const scores = respondent.scores.filter(
                (score) => score.questionnaireVersionId === questionnaireVersionId,
            );

            const scoreByDimensionId = new Map(
                scores.map((score) => [score.dimensionId, score]),
            );

            const completenessValues = scores.map((score) => score.completeness);
            const averageCompleteness =
                completenessValues.length > 0
                    ? completenessValues.reduce((acc, value) => acc + value, 0) /
                    completenessValues.length
                    : null;

            for (const dimension of group.dimensions) {
                const score = scoreByDimensionId.get(dimension.dimensionId);

                rows.push([
                    respondent.respondentName,
                    respondent.respondentEmail,
                    respondent.respondentExternalCode,
                    formatStatus(respondent.sessionStatus),
                    group.questionnaireName,
                    group.questionnaireVersionName,
                    averageCompleteness,
                    dimension.dimensionCode,
                    dimension.dimensionName,
                    score?.rawScore ?? null,
                    score?.weightedScore ?? null,
                    score?.meanScore ?? null,
                    score?.weightedMeanScore ?? null,
                    score?.completeness ?? null,
                ]);
            }
        }
    }

    return rows;
}

async function buildXlsx(data: NonNullable<Awaited<ReturnType<typeof getAssessmentProjectResults>>>) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HUMANET VALUES";
    workbook.created = new Date();

    const usedSheetNames = new Set<string>();

    const summarySheet = workbook.addWorksheet(
        makeSheetName("Podsumowanie", usedSheetNames),
    );

    summarySheet.addRows([
        ["Projekt", data.project.name],
        ["Status", data.project.status],
        ["Tenant", data.tenant.slug],
        ["Wszystkie sesje", data.summary.sessionsCount],
        ["Ukończone sesje", data.summary.completedSessionsCount],
        ["Sesje w trakcie", data.summary.inProgressSessionsCount],
        ["Nierozpoczęte sesje", data.summary.notStartedSessionsCount],
    ]);

    const dimensionsSheet = workbook.addWorksheet(
        makeSheetName("Agregacja wymiarów", usedSheetNames),
    );
    dimensionsSheet.addRows(buildDimensionAggregateRows(data));

    const respondentMatrixSheet = workbook.addWorksheet(
        makeSheetName("Macierz respondentów", usedSheetNames),
    );
    respondentMatrixSheet.addRows(buildRespondentMatrixRows(data));

    const categoricalSheet = workbook.addWorksheet(
        makeSheetName("Kategorie bez scoringu", usedSheetNames),
    );
    categoricalSheet.addRows(buildCategoricalRows(data));

    for (const sheet of workbook.worksheets) {
        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: "frozen", ySplit: 1 }];

        sheet.properties.outlineLevelCol = 0;
        sheet.properties.outlineLevelRow = 0;

        autoSizeWorksheetColumns(sheet);
    }

    return workbook.xlsx.writeBuffer();
}

export async function GET(request: Request, { params }: RouteProps) {
    const { tenantSlug, projectId } = await params;

    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "xlsx";
    const dataset = url.searchParams.get("dataset") ?? "dimensions";

    const data = await getAssessmentProjectResults({
        tenantSlug,
        assessmentProjectId: projectId,
    });

    if (!data) {
        return new Response("Nie znaleziono projektu.", {
            status: 404,
        });
    }

    const rawBaseFileName = `humanet_values_${data.project.name}_${new Date()
        .toISOString()
        .slice(0, 10)}`;

    const baseFileName = safeAsciiFileName(rawBaseFileName);
    const encodedBaseFileName = encodeRFC5987ValueChars(rawBaseFileName);

    if (format === "xlsx") {
        const buffer = await buildXlsx(data);

        return new Response(buffer, {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${baseFileName}.xlsx"; filename*=UTF-8''${encodedBaseFileName}.xlsx`,
            },
        });
    }

    if (format === "csv") {
        if (dataset === "respondents") {
            return makeCsvResponse({
                csv: toCsv(buildRespondentMatrixRows(data)),
                fileName: `${baseFileName}_respondenci.csv`,
                encodedFileName: `${encodedBaseFileName}_respondenci.csv`,
            });
        }

        if (dataset === "categorical") {
            return makeCsvResponse({
                csv: toCsv(buildCategoricalRows(data)),
                fileName: `${baseFileName}_kategorie.csv`,
                encodedFileName: `${encodedBaseFileName}_kategorie.csv`,
            });
        }

        return makeCsvResponse({
            csv: toCsv(buildDimensionAggregateRows(data)),
            fileName: `${baseFileName}_wymiary.csv`,
            encodedFileName: `${encodedBaseFileName}_wymiary.csv`,
        });
    }

    return new Response("Nieobsługiwany format eksportu.", {
        status: 400,
    });
}